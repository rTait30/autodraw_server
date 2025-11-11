from datetime import datetime, timezone
from dateutil.parser import parse as parse_date

from flask import Blueprint, request, jsonify, send_file, g
from flask_jwt_extended import jwt_required


from sqlalchemy.orm.attributes import flag_modified

from io import StringIO, BytesIO
from flask import send_file
import ezdxf

import tempfile
import os
from flask import send_file, after_this_request

import math

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

from models import db, Project, ProjectProduct, User, Product, ProjectType, EstimatingSchema, ProjectStatus
from endpoints.api.auth.utils import current_user, role_required, _json, _user_by_credentials

from WG.workGuru import get_leads

from WG.workGuru import add_cover

projects_api_bp = Blueprint("projects_api", __name__)

# ---------- ADD THESE SMALL HELPERS (near your routes file top) ----------
def _as_int(v):
    try:
        return int(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None

def resolve_project_type_id(data):
    """
    Supports either:
      - data['type_id'] as an int/stringified int, OR
      - data['type'] as the ProjectType.name (e.g. 'cover', 'shadesail')
    Returns: (type_id:int|None, error:str|None)
    """
    # Prefer explicit id
    tid = _as_int(data.get("type_id"))
    if tid:
        pt = db.session.get(ProjectType, tid)
        if not pt:
            return None, f"ProjectType id {tid} not found"
        return pt.id, None

    # Fallback: lookup by name
    tname = (data.get("type") or "").strip()
    if tname:
        pt = ProjectType.query.filter_by(name=tname).first()
        if not pt:
            return None, f"ProjectType '{tname}' not found"
        return pt.id, None

    return None, "type_id or type (name) is required"
# ------------------------------------------------------------------------

# -------------------------------
# Create / update project (auth required)
# -------------------------------
@projects_api_bp.route("/projects/create", methods=["POST", "OPTIONS"])
@jwt_required()
def save_project_config():
    user = current_user(required=True)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json() or {}

    # Payload shape we expect:
    # {
    #   "general": {...},
    #   "project_attributes": {...},
    #   "project_calculated": {...},   # optional
    #   "products": [...],
    #   "type": "cover" | "shade_sail" | ...
    # }

    general = data.get("general") or {}
    if not isinstance(general, dict):
        return jsonify({"error": "general must be an object"}), 400

    project_attributes = data.get("project_attributes") or {}
    project_calculated = data.get("project_calculated") or {}
    products_payload = data.get("products") or []

    if not isinstance(project_attributes, dict):
        return jsonify({"error": "project_attributes must be an object"}), 400
    if not isinstance(project_calculated, dict):
        return jsonify({"error": "project_calculated must be an object"}), 400
    if not isinstance(products_payload, list):
        return jsonify({"error": "products must be an array"}), 400

    project_id = data.get("id")  # optional for update

    # Only allow these fields from "general" to map directly to Project
    allowed_fields = {"name", "status", "due_date", "info", "client_id"}
    project_data = {k: v for k, v in general.items() if k in allowed_fields}

    # ---- validate & normalize name ----
    name = (project_data.get("name") or "").strip()
    if not name or len(name) == 0 or len(name) > 200:
        return jsonify({"error": "name is required and must be between 1 and 200 characters"}), 400
    project_data["name"] = name

    # ---- normalize due_date (string -> date or None) ----
    due_date = project_data.get("due_date")
    if due_date:
        try:
            project_data["due_date"] = parse_date(due_date)
        except Exception:
            return jsonify({"error": f"Invalid due_date format: {due_date}"}), 400
    else:
        project_data["due_date"] = None

    # ---- coerce status into ProjectStatus enum if present ----
    if "status" in project_data and project_data["status"] is not None:
        st = project_data["status"]
        if not isinstance(st, ProjectStatus):
            try:
                project_data["status"] = ProjectStatus(st)
            except Exception:
                try:
                    project_data["status"] = ProjectStatus[st]
                except Exception:
                    return jsonify({"error": f"Invalid status: {st}"}), 400

    # ---- resolve type_id from 'type' in payload (e.g. "cover") ----
    type_id, type_err = resolve_project_type_id(data)
    if type_err and not project_id:
        # On CREATE, type is required
        return jsonify({"error": type_err}), 400

    # ---- determine client_id ----
    if user.role == "client":
        target_client_id = user.id
    else:
        target_client_id = _as_int(project_data.get("client_id"))
        if target_client_id is None and not project_id:
            return jsonify({"error": "client_id is required for staff creates"}), 400

    # ---------- CREATE or UPDATE ----------
    if project_id:
        # --- UPDATE ---
        project = Project.query.get(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Clients may only update their own projects and cannot change client_id
        if user.role == "client":
            if project.client_id != user.id:
                return jsonify({"error": "Unauthorized"}), 403
        else:
            # Staff can reassign client if provided
            if target_client_id is not None and target_client_id != project.client_id:
                project.client_id = target_client_id

        # Staff can change type if provided
        if user.role != "client" and type_id is not None and type_id != project.type_id:
            project.type_id = type_id

        # Apply scalar fields (name/status/due_date/info)
        for field, value in project_data.items():
            setattr(project, field, value)

        #project.updated_at = datetime.now(timezone.utc)

    else:
        # --- CREATE ---
        project = Project(
            name=project_data["name"],
            status=project_data.get("status") or ProjectStatus.quoting,
            due_date=project_data.get("due_date"),
            info=project_data.get("info"),
            client_id=target_client_id,
            type_id=type_id,
            project_attributes=project_attributes,
            project_calculated=project_calculated,
        )
        db.session.add(project)
        db.session.flush()  # get project.id for products

    # ---------- UPDATE project-level JSON on both create & update ----------
    # (On create we already initialised; on update we overwrite with new payload)
    project.project_attributes = project_attributes
    project.project_calculated = project_calculated

    # ---------- Replace products from payload ----------
    # Simple approach: delete existing and recreate from the sent list
    ProjectProduct.query.filter_by(project_id=project.id).delete(synchronize_session=False)

    for idx, p in enumerate(products_payload):
        if not isinstance(p, dict):
            return jsonify({"error": "each product must be an object"}, 400)

        attrs = p.get("attributes") or {}
        if not isinstance(attrs, dict):
            return jsonify({"error": "product.attributes must be an object"}, 400)

        item_index = p.get("productIndex", idx)
        label = p.get("name") or attrs.get("label") or f"Item {idx + 1}"
        calc = p.get("calculated") or {}

        pp = ProjectProduct(
            project_id=project.id,
            item_index=item_index,
            label=label,
            attributes=attrs,
            calculated=calc,
        )
        db.session.add(pp)

    db.session.commit()

    resp_type = {"id": project.type.id, "name": project.type.name} if project.type else None
    resp_status = project.status.name if hasattr(project.status, "name") else project.status

    # Optionally, serialize products back
    products_out = [
        {
            "id": pp.id,
            "itemIndex": pp.item_index,
            "label": pp.label,
            "attributes": pp.attributes,
            "calculated": pp.calculated,
        }
        for pp in ProjectProduct.query.filter_by(project_id=project.id)
        #.order_by(ProjectProduct.item_index).all()
    ]

    return jsonify({
        "id": project.id,
        "client_id": project.client_id,
        "type": resp_type,
        "status": resp_status,
        "project_attributes": project.project_attributes,
        "project_calculated": project.project_calculated,
        "products": products_out,
    }), 200


@projects_api_bp.route("/products/edit/<int:project_id>", methods=["PUT", "PATCH", "POST"])
def upsert_project_and_attributes(project_id):
    payload = request.get_json(silent=True) or {}

    general = payload.get("general") or {}
    project_attributes = payload.get("project_attributes")
    project_calculated = payload.get("project_calculated")
    products_payload = payload.get("products")

    if not isinstance(general, dict):
        return jsonify({"error": "general must be an object"}), 400
    if project_attributes is not None and not isinstance(project_attributes, dict):
        return jsonify({"error": "project_attributes must be an object if provided"}), 400
    if project_calculated is not None and not isinstance(project_calculated, dict):
        return jsonify({"error": "project_calculated must be an object if provided"}), 400
    if products_payload is not None and not isinstance(products_payload, list):
        return jsonify({"error": "products must be an array if provided"}), 400

    # Ensure project exists
    project = Project.query.get_or_404(project_id)

    # ---------- Update general (Project) fields ----------
    # Optional "enabled" flag as you had before
    if general.get("enabled", True):
        if "name" in general:
            project.name = (general["name"] or "").strip()

        if "client_id" in general:
            cid = general["client_id"]
            if cid in (None, "", "null"):
                project.client_id = None
            else:
                try:
                    project.client_id = int(cid)
                except (TypeError, ValueError):
                    return jsonify({"error": "client_id must be an integer or empty"}), 400

        if "due_date" in general:
            dd = general["due_date"]
            if dd in (None, "", "null"):
                project.due_date = None
            elif isinstance(dd, str):
                # Accept ISO or YYYY-MM-DD; convert to date
                try:
                    project.due_date = parse_date(dd)
                except Exception:
                    return jsonify({"error": f"Invalid due_date format: {dd}"}), 400
            else:
                project.due_date = dd

        if "info" in general:
            project.info = general["info"]

    # ---------- Update project-level JSON if provided ----------
    if project_attributes is not None:
        project.project_attributes = project_attributes

    if project_calculated is not None:
        project.project_calculated = project_calculated

    # ---------- Update products if provided ----------
    if products_payload is not None:
        # Simple semantics: replace all products with the new list
        ProjectProduct.query.filter_by(project_id=project.id).delete(synchronize_session=False)

        for idx, p in enumerate(products_payload):
            if not isinstance(p, dict):
                return jsonify({"error": "each product must be an object"}, 400)

            attrs = p.get("attributes") or {}
            if not isinstance(attrs, dict):
                return jsonify({"error": "product.attributes must be an object"}, 400)

            item_index = p.get("productIndex", idx)
            label = p.get("name") or attrs.get("label") or f"Item {idx + 1}"
            calc = p.get("calculated") or {}

            pp = ProjectProduct(
                project_id=project.id,
                item_index=item_index,
                label=label,
                attributes=attrs,
                calculated=calc,
            )
            db.session.add(pp)

    db.session.commit()

    # Serialize for response
    products_out = [
        {
            "id": pp.id,
            "itemIndex": pp.item_index,
            "label": pp.label,
            "attributes": pp.attributes,
            "calculated": pp.calculated,
        }
        for pp in ProjectProduct.query.filter_by(project_id=project.id).order_by(ProjectProduct.item_index).all()
    ]

    return jsonify({
        "ok": True,
        "project": {
            "id": project.id,
            "name": project.name,
            "client_id": project.client_id,
            "due_date": project.due_date.isoformat() if hasattr(project.due_date, "isoformat") else project.due_date,
            "info": project.info,
        },
        "project_attributes": project.project_attributes,
        "project_calculated": project.project_calculated,
        "products": products_out,
    }), 200


# -------------------------------
# List projects (auth required; client sees own only)
# -------------------------------
@projects_api_bp.route("/projects/list", methods=["GET"])
@jwt_required()
def list_project_configs():
    user = current_user(required=True)
    role = user.role

    query = Project.query
    if role == "client":
        query = query.filter_by(client_id=user.id)
    else:
        client_id = request.args.get("client_id")
        if client_id:
            try:
                query = query.filter_by(client_id=int(client_id))
            except ValueError:
                return jsonify({"error": "client_id must be an integer"}), 400

    projects = query.all()
    result = []
    for project in projects:
        client_user = User.query.get(project.client_id)
        result.append({
            "id": project.id,
            "name": project.name,
            "type": project.type.name if hasattr(project.type, "name") else project.type,
            "status": project.status.name if hasattr(project.status, "name") else project.status,
            "due_date": project.due_date.isoformat() if project.due_date else None,
            "info": project.info,
            #"created_at": project.created_at.isoformat() if project.created_at else None,
            #"updated_at": project.updated_at.isoformat() if project.updated_at else None,
            "client": client_user.username if client_user else None,
        })
    return jsonify(result), 200

# -------------------------------
# Get a single project (auth required; client can only access own)
# -------------------------------
@projects_api_bp.route("/project/<int:project_id>", methods=["GET"])
@jwt_required()
def get_project_config(project_id):
    user = current_user(required=True)
    project = Project.query.get_or_404(project_id)

    # --- Authorization ---
    if user.role == "client" and project.client_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    # --- Basic project info (general) ---
    general = {
        "id": project.id,
        "name": project.name,
        "client_id": project.client_id,
        "due_date": project.due_date.isoformat() if project.due_date else None,
        "info": project.info,
        "status": project.status.name if hasattr(project.status, "name") else project.status,
        #"created_at": project.created_at.isoformat() if project.created_at else None,
        #"updated_at": project.updated_at.isoformat() if project.updated_at else None,
    }

    # --- Project type info ---
    project_type = {
        "id": project.type.id if project.type else None,
        "name": project.type.name if project.type else None,
    }

    # --- Project-level attributes + calculated JSON ---
    project_attributes = project.project_attributes or {}
    project_calculated = project.project_calculated or {}

    # --- Products (one per sail/cover/panel) ---
    products = []
    for p in project.products:
        #.order_by(ProjectProduct.item_index).all()
        products.append({
            "id": p.id,
            "name": p.label,
            "productIndex": p.item_index,
            "attributes": p.attributes or {},
            "calculated": p.calculated or {},
        })

    # --- Response payload ---
    data = {
        "id": project.id,
        "type": project_type,
        "general": general,
        "project_attributes": project_attributes,
        "project_calculated": project_calculated,
        "products": products,
    }

    return jsonify(data), 200


# -------------------------------
# Price list (auth required — all roles)
# -------------------------------
@projects_api_bp.route("/pricelist", methods=["GET"])
@jwt_required()
def get_pricelist():
    products = Product.query
    #.order_by(Product.name).all()
    return jsonify([{
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "description": p.description,
        "price": p.price,
        "unit": p.unit,
        "active": p.active,
        #"created_at": p.created_at.isoformat() if p.created_at else None,
        #"updated_at": p.updated_at.isoformat() if p.updated_at else None,
    } for p in products]), 200

# -------------------------------
# Clients list (staff only)
# -------------------------------
@projects_api_bp.route("/clients", methods=["GET"])
@role_required("admin", "estimator", "designer")
def get_clients():
    clients = User.query.filter_by(role="client")
    #.order_by(User.username).all()
    return jsonify([{"id": c.id, "name": c.username} for c in clients]), 200





@projects_api_bp.route("/project/get_dxf", methods=["POST"])
@role_required("estimator", "designer")  # admin allowed by default via your decorator
def get_dxf():
    """
    Body: { "project_id": 123 }
    Uses calculated.nestData + calculated.rawPanels to generate the DXF.
    """
    payload = request.get_json(silent=True) or {}
    project_id = payload.get("project_id")
    if not project_id:
        return jsonify({"error": "project_id is required"}), 400

    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": f"Project {project_id} not found"}), 404

    attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
    if not attr or not attr.calculated:
        return jsonify({"error": f"No calculated data found for Project {project_id}"}), 400
    
    data = attr.data or {}

    print ("project:", project.id, project.name)

    print ("attr.data:", data)

    calc = attr.calculated
    nest = calc.get("nestData") or calc.get("nestdata")
    raw = calc.get("rawPanels") or calc.get("raw_panels")
    if not nest or not raw:
        return jsonify({"error": "calculated.nestData and calculated.rawPanels are required"}), 400

    fname = f"{(project.name or 'project').strip()}.dxf".replace(" ", "_")
    return _build_dxf_from_nest_and_raw(nest, raw, fname, data['length'], data['width'], data['height'])




@projects_api_bp.route("/project/get_pdf", methods=["POST"])
@role_required("client", "estimator", "designer")  # admin allowed via decorator default
def get_pdf():
    """
    Body:
      {
        "project_id": 123,
        "include_bom": true,          # staff only; ignored/forbidden for clients
        "bom_level": "summary"        # or "detailed" (optional)
      }
    """
    payload = request.get_json(silent=True) or {}
    project_id = payload.get("project_id")
    if not project_id:
        return jsonify({"error": "project_id is required"}), 400

    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": f"Project {project_id} not found"}), 404

    # Use user from the decorator (no extra DB/JWT lookups)
    user = getattr(g, "current_user", None)
    role = getattr(user, "role", None)
    is_staff = role in ("estimator", "designer", "admin")

    requested_include_bom = bool(payload.get("include_bom", False))
    bom_level = payload.get("bom_level") or "summary"
    if bom_level not in ("summary", "detailed"):
        bom_level = "summary"

    if requested_include_bom and not is_staff:
        # Hard fail if client tries to force BoM
        return jsonify({"error": "Including Bill of Materials is not permitted for clients."}), 403

    include_bom = requested_include_bom and is_staff

    # Attributes
    attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
    if not attr or not attr.data:
        return jsonify({"error": f"No attributes found for Project {project_id}"}), 400

    a = attr.data or {}
    width  = _safe_float(a.get("width"),  default=1000.0, min_val=1.0)
    length = _safe_float(a.get("length"), default=1000.0, min_val=1.0)
    height = _safe_float(a.get("height"), default=50.0,   min_val=0.0)

    quantity     = int(_safe_float(a.get("quantity"), default=1.0, min_val=1.0))
    fabric_width = _safe_float(a.get("fabricWidth"), default=None)
    hem          = _safe_float(a.get("hem"),         default=None)
    seam         = _safe_float(a.get("seam"),        default=None)

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp_path = tmp.name
    tmp.close()

    try:
        _build_pdf(
            tmp_path=tmp_path,
            project=project,
            width_mm=width,
            length_mm=length,
            height_mm=height,
            attrs={
                "quantity": quantity,
                "fabricWidth": fabric_width,
                "hem": hem,
                "seam": seam,
            },
            include_bom=include_bom,
            bom_level=bom_level,
        )
    except Exception as e:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        return jsonify({"error": f"PDF generation failed: {e}"}), 500

    base = f"{(project.name or 'project').strip()}_{project.id}".replace(" ", "_")
    suffix = "_with_BoM" if include_bom else ""
    fname = f"{base}{suffix}.pdf"

    @after_this_request
    def _cleanup(response):
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        return response

    resp = send_file(
        tmp_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=fname,
        max_age=0,
        etag=False,
        conditional=False,
        last_modified=None,
    )
    resp.headers["Cache-Control"] = "no-store, must-revalidate, private"
    return resp




# ------------------------------- DXF GENERATORS -------------------------------

# ------------------------------- COVERS -------------------------------

# ----- helpers -----
def _new_doc_mm():
    # R2000 is widely compatible and supports TEXT halign/valign
    doc = ezdxf.new(dxfversion="R2000", setup=True)
    # 4 = millimetres
    doc.units = 4
    doc.header["$INSUNITS"] = 4
    msp = doc.modelspace()
    for name, color in [("WHEEL", 3), ("PEN", 2), ("BORDER", 1)]:
        if name not in doc.layers:
            doc.layers.add(name, color=color)
    return doc, msp

def _basename(panel_key: str) -> str:
    # "1_Lside1" -> "Lside1"; "main1" -> "main1"
    return panel_key.split("_", 1)[1] if "_" in panel_key else panel_key

def _dims_map_from_raw(raw_panels: dict) -> dict:
    """
    rawPanels example:
      { "Lside1": {"width":1040,"height":1020, ...}, ... }
    Returns { name: (w, h) } in mm.
    """
    out = {}
    for name, rec in (raw_panels or {}).items():
        try:
            w = float(rec.get("width") or 0)
            h = float(rec.get("height") or 0)
            seams = rec.get("hasSeam") or "no"
        except (TypeError, ValueError):
            w = h = 0.0
        if w > 0 and h > 0:
            out[str(name)] = (w, h, seams)
    return out


def _add_unique_line(msp, a, b, layer, _seen):
    """Add a LINE only if this exact segment hasn't been drawn already (in either direction)."""
    # Round to avoid tiny FP jitter making duplicates
    ra = (round(a[0], 6), round(a[1], 6))
    rb = (round(b[0], 6), round(b[1], 6))
    key = (ra, rb) if ra <= rb else (rb, ra)
    if key in _seen:
        return
    _seen.add(key)
    msp.add_line(ra, rb, dxfattribs={"layer": layer})


_SNAP = 1e-3  # mm snap tolerance for de-duping (0.001 mm)

def _snap_pt(p):
    """Snap a point to a small grid so nearly-identical coordinates dedupe."""
    return (round(p[0] / _SNAP) * _SNAP, round(p[1] / _SNAP) * _SNAP)

def _seg_key(a, b):
    """Undirected segment key with snapping; order-independent."""
    a = _snap_pt(a); b = _snap_pt(b)
    return (a, b) if a <= b else (b, a)

def _is_on_border(pt, total_w, bin_h):
    """Check if a snapped point lies on the border rectangle (within tolerance)."""
    x, y = pt
    return (
        abs(x - 0.0) <= _SNAP or
        abs(x - total_w) <= _SNAP or
        abs(y - 0.0) <= _SNAP or
        abs(y - bin_h) <= _SNAP
    )

def _snap(v: float) -> float:
    return round(v / _SNAP) * _SNAP

def _build_dxf_from_nest_and_raw(nest: dict, raw_panels: dict, download_name: str, length, width, height):
    doc, msp = _new_doc_mm()
    dims = _dims_map_from_raw(raw_panels)
    panels = nest.get("panels") or {}
    bin_h = float(nest.get("bin_height") or 0)
    total_w = float(nest.get("total_width") or nest.get("required_width") or 0)

    # Compute total width if not provided
    if bin_h > 0 and total_w <= 0:
        for name, pos in panels.items():
            base = _basename(name)
            if base not in dims:
                continue
            w, h = dims[base]
            if pos.get("rotated"):
                w, h = h, w
            total_w = max(total_w, float(pos.get("x", 0)) + w)

    has_border = bin_h > 0 and total_w > 0

    # --- Collect intervals ---
    # horizontals[y] -> list of (x1, x2)
    # verticals[x]   -> list of (y1, y2)
    horizontals = {}
    verticals = {}

    def add_h(y, x1, x2):
        y = _snap(y)
        a, b = sorted((_snap(x1), _snap(x2)))
        if a == b:
            return
        horizontals.setdefault(y, []).append((a, b))

    def add_v(x, y1, y2):
        x = _snap(x)
        a, b = sorted((_snap(y1), _snap(y2)))
        if a == b:
            return
        verticals.setdefault(x, []).append((a, b))


    print (panels)

    # Panels + labels
    for name, pos in panels.items():

        base = _basename(name)
        if base not in dims:
            continue
        
        


        w, h, seams = dims[base]
        if pos.get("rotated"):
            w, h = h, w
        x = float(pos.get("x", 0))
        y = float(pos.get("y", 0))

        print (base, seams)

        # helpers to avoid duplication
        def _draw_top_marks(msp, x, y, height, width, length, *,
                            half_tick=20, layer="PEN"):
            # marks along the TOP edge (near y + width)
            msp.add_line((x + height - half_tick,         y + h - half_tick),
                        (x + height + half_tick,         y + h - half_tick),
                        dxfattribs={"layer": layer})  # horizontal
            msp.add_line((x + height,                     y + h - half_tick),
                        (x + height,                     y + h - half_tick * 2),
                        dxfattribs={"layer": layer})     # vertical

            msp.add_line((x + height + length - half_tick, y + h - half_tick),
                        (x + height + length + half_tick, y + h - half_tick),
                        dxfattribs={"layer": layer})
            msp.add_line((x + height + length,             y + h - half_tick),
                        (x + height + length,             y + h - half_tick * 2),
                        dxfattribs={"layer": layer})
            


            msp.add_line((x,                                y + h -50),
                        (x + height,               y + h -50),
                        dxfattribs={"layer": layer})

        def _draw_bottom_marks(msp, x, y, height, width, length, *,
                            half_tick=20, layer="PEN"):
            # marks along the BOTTOM edge (near y)
            msp.add_line((x + height - half_tick,         y + half_tick),
                        (x + height + half_tick,         y + half_tick),
                        dxfattribs={"layer": layer})
            msp.add_line((x + height,                     y + half_tick),
                        (x + height,                     y + 2 * half_tick),
                        dxfattribs={"layer": layer})

            msp.add_line((x + height + length - half_tick, y + half_tick),
                        (x + height + length + half_tick, y + half_tick),
                        dxfattribs={"layer": layer})
            msp.add_line((x + height + length,             y + half_tick),
                        (x + height + length,             y + 2 * half_tick),
                        dxfattribs={"layer": layer})


            msp.add_line((x,                                y + 50),
                        (x + height,               y + 50),
                        dxfattribs={"layer": layer})

        # fold/seam lines
        if "main" in base:
            # semantics requested:
            # seams == "top"    -> only BOTTOM marks
            # seams == "bottom" -> only TOP marks
            # seams == "no"     -> both TOP and BOTTOM marks
            if seams == "top":
                _draw_bottom_marks(msp, x, y, height, width, length)
            elif seams == "bottom":
                _draw_top_marks(msp, x, y, height, width, length)
            elif seams == "no":
                _draw_top_marks(msp, x, y, height, width, length)
                _draw_bottom_marks(msp, x, y, height, width, length)
        # Panel rectangle edges
        add_h(y, x, x + w)             # bottom
        add_h(y + h, x, x + w)         # top
        add_v(x, y, y + h)             # left
        add_v(x + w, y, y + h)         # right

        # Dimension label in top-right
        label = f"{int(round(length))} x {int(round(width))} x {int(round(height))}"
        margin = 5.0
        tx, ty = (x + w - margin, y + h - margin)
        t = msp.add_text(label, dxfattribs={"layer": "PEN", "height": 20})
        t.dxf.halign = 2  # Right
        t.dxf.valign = 3  # Top
        t.dxf.insert = (tx, ty)
        t.dxf.align_point = (tx, ty)

    # --- Merge intervals (1-D sweep) ---
    def merge_intervals(ranges):
        if not ranges:
            return []
        ranges = sorted(ranges, key=lambda ab: (ab[0], ab[1]))
        merged = []
        cs, ce = ranges[0]
        for s, e in ranges[1:]:
            # If overlapping or touching within tolerance, merge
            if s <= ce + _SNAP:
                ce = max(ce, e)
            else:
                merged.append((cs, ce))
                cs, ce = s, e
        merged.append((cs, ce))
        return merged

    # --- Draw merged segments once ---
    # Horizontal segments
    for y, spans in horizontals.items():
        for x1, x2 in merge_intervals(spans):
            
            msp.add_line((x1, y), (x2, y), dxfattribs={"layer": "WHEEL"})

    # Vertical segments
    for x, spans in verticals.items():
        for y1, y2 in merge_intervals(spans):
            
            msp.add_line((x, y1), (x, y2), dxfattribs={"layer": "WHEEL"})

    # --- Save to a temp file and return ---
    tmp = tempfile.NamedTemporaryFile(suffix=".dxf", delete=False)
    tmp_path = tmp.name
    tmp.close()
    doc.saveas(tmp_path)

    return send_file(
        tmp_path,
        mimetype="application/dxf",
        as_attachment=True,
        download_name=download_name,
        max_age=0,
        etag=False,
        conditional=False,
        last_modified=None,
    )



# ------------------------------- PDF GENERATORS -------------------------------



# ------------------------------- PDF BUILDER -------------------------------

def _build_pdf(
    tmp_path,
    project,
    width_mm,
    length_mm,
    height_mm,
    attrs,
    include_bom: bool = False,
    bom_level: str = "summary",
):
    """
    Page 1: Isometric drawing (left) + info panel (right)
    Page 2: (optional) Bill of Materials for staff
    """
    page_w, page_h = landscape(A4)
    c = canvas.Canvas(tmp_path, pagesize=(page_w, page_h))

    margin = 24
    inner_w = page_w - 2 * margin
    inner_h = page_h - 2 * margin

    left_ratio = 0.55
    left_w = inner_w * left_ratio
    right_w = inner_w - left_w

    left_x = margin
    left_y = margin
    right_x = margin + left_w
    right_y = margin

    # Divider
    c.setLineWidth(0.5)
    c.line(right_x, margin, right_x, page_h - margin)

    # Header
    c.setFont("Helvetica-Bold", 14)
    c.drawString(margin, page_h - margin + 6, "Cover — Isometric Sheet")
    c.setFont("Helvetica", 9)
    gen_ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    c.drawRightString(page_w - margin, page_h - margin + 6, f"Generated: {gen_ts}")

    # Page 1 content
    _draw_isometric_with_dimensions(
        c,
        viewport=(left_x + 8, left_y + 8, left_w - 16, inner_h - 16),
        width_mm=width_mm,
        length_mm=length_mm,
        height_mm=height_mm,
    )

    _draw_info_panel(
        c,
        x=right_x + 16,
        y=right_y + inner_h - 16,
        w=right_w - 32,
        project=project,
        dims={"width": width_mm, "length": length_mm, "height": height_mm},
        attrs=attrs,
    )

    # If no BoM requested, finish here
    if not include_bom:
        c.showPage()
        c.save()
        return

    # Page 2: Bill of Materials
    c.showPage()
    _draw_bom_page(
        c=c,
        project=project,
        dims={"width": width_mm, "length": length_mm, "height": height_mm},
        attrs=attrs,
        bom_level=bom_level,
    )

    c.showPage()
    c.save()


# ------------------------------- DRAWING HELPERS -------------------------------

def _draw_isometric_with_dimensions(c, viewport, width_mm, length_mm, height_mm):
    """
    Draws a proportional isometric rectangular box in the given viewport and adds
    three baseline dimensions (width, length, height).
    viewport = (vx, vy, vw, vh) in points
    """
    vx, vy, vw, vh = viewport

    # 1) Build box vertices in 3D (mm)
    # Axes: X=width, Y=length, Z=height
    # Box corners (origin at 0,0,0 for the "front-left-bottom"):
    pts3d = [
        (0,         0,          0),           # 0
        (width_mm,  0,          0),           # 1
        (width_mm,  length_mm,  0),           # 2
        (0,         length_mm,  0),           # 3
        (0,         0,          height_mm),   # 4
        (width_mm,  0,          height_mm),   # 5
        (width_mm,  length_mm,  height_mm),   # 6
        (0,         length_mm,  height_mm),   # 7
    ]

    # 2) Isometric projection (classic 30°/30°)
    cos30 = math.cos(math.radians(30))
    sin30 = math.sin(math.radians(30))

    def iso_project(p):
        X, Y, Z = p
        x2d = (X - Y) * cos30
        y2d = (X + Y) * sin30 - Z
        return (x2d, y2d)

    pts2d = list(map(iso_project, pts3d))

    # 3) Fit to viewport with uniform scale and center
    min_x = min(p[0] for p in pts2d)
    max_x = max(p[0] for p in pts2d)
    min_y = min(p[1] for p in pts2d)
    max_y = max(p[1] for p in pts2d)

    box_w = max_x - min_x
    box_h = max_y - min_y
    if box_w <= 0 or box_h <= 0:
        return

    # Small padding inside the viewport for dimension arrows/text
    pad = 28.0
    scale = min((vw - 2 * pad) / box_w, (vh - 2 * pad) / box_h)

    # Translate so the projected bbox is centered in viewport
    # First shift pts so min corner is at (0,0), then scale, then center
    def to_screen(p):
        x = (p[0] - min_x) * scale
        y = (p[1] - min_y) * scale
        # center inside viewport
        x += vx + (vw - box_w * scale) / 2.0
        y += vy + (vh - box_h * scale) / 2.0
        return (x, y)

    pts = list(map(to_screen, pts2d))

    # 4) Draw visible edges (simple set; avoids hidden lines to keep v1 clear)
    c.setLineWidth(1.25)
    edges = [
        (0, 1), (1, 2), (2, 3), (3, 0),       # bottom rectangle
        (4, 5), (5, 6), (6, 7), (7, 4),       # top rectangle
        (0, 4), (1, 5), (2, 6), (3, 7),       # verticals
    ]
    for a, b in edges:
        c.line(pts[a][0], pts[a][1], pts[b][0], pts[b][1])

    # Choose baseline edges for dimensions:
    # - Width along edge (0->1)
    # - Length along edge (1->2)
    # - Height along edge (0->4)
    # (These read clearly in this layout.)
    dim_offset = -16  # pt offset from object for extension line start
    txt_size = 9

    # Width dimension (0 -> 1)
    _dim_aligned(
        c,
        p1=pts[0], p2=pts[1],
        value_mm=width_mm,
        offset=dim_offset,
        text_size=txt_size,
    )

    # Length dimension (1 -> 2)
    _dim_aligned(
        c,
        p1=pts[0], p2=pts[3],
        value_mm=length_mm,
        offset=dim_offset,
        text_size=txt_size,
    )

    # Height dimension (0 -> 4) — mostly vertical in page coords for this projection
    _dim_aligned(
        c,
        p1=pts[0], p2=pts[4],
        value_mm=height_mm,
        offset=dim_offset,
        text_size=txt_size,
    )

    # Label: small “Isometric view” note
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(vx + 4, vy + 4, "Isometric view (dimensions in mm)")


def _dim_aligned(c, p1, p2, value_mm, offset=14, text_size=9):
    """
    Draw an aligned dimension between p1 and p2:
      - Extension lines from p1, p2 outward by 'offset'
      - Dimension line parallel to (p1->p2)
      - Arrowheads at both ends
      - Centered text label with value in mm (rounded nearest mm)
    All args in points except value_mm (mm).
    """
    x1, y1 = p1
    x2, y2 = p2
    dx, dy = (x2 - x1), (y2 - y1)
    L = math.hypot(dx, dy)
    if L < 1e-3:
        return

    # Unit vector along the measured line
    ux, uy = dx / L, dy / L
    # Unit normal (rotate +90°)
    nx, ny = -uy, ux

    # Extension line points (from endpoints, offset along normal)
    e1 = (x1 + nx * offset, y1 + ny * offset)
    e2 = (x2 + nx * offset, y2 + ny * offset)

    # Draw extension lines
    c.setLineWidth(0.75)
    c.line(x1, y1, e1[0], e1[1])
    c.line(x2, y2, e2[0], e2[1])

    # Dimension line (between e1 and e2)
    c.setLineWidth(0.9)
    c.line(e1[0], e1[1], e2[0], e2[1])

    # Arrowheads at e1<- and ->e2
    _arrowhead(c, tip=e1, direction=(-ux, -uy), size=6)
    _arrowhead(c, tip=e2, direction=(ux, uy), size=6)

    # Text label (centered)
    label = f"{int(round(value_mm))} mm"
    cx, cy = ((e1[0] + e2[0]) / 2.0, (e1[1] + e2[1]) / 2.0)

    # Slight offset away from the dim line to avoid overlap with arrowheads
    text_off = 8
    tx, ty = (cx + nx * text_off, cy + ny * text_off)

    # Rotate text to align with the dimension line
    angle_deg = math.degrees(math.atan2(dy, dx))
    c.saveState()
    c.translate(tx, ty)
    c.rotate(angle_deg)
    c.setFont("Helvetica", text_size)
    # center text: draw centered relative to its width
    w = c.stringWidth(label, "Helvetica", text_size)
    c.drawString(-w / 2.0, -text_size / 2.5, label)
    c.restoreState()


def _arrowhead(c, tip, direction, size=6):
    """
    Draw a filled triangular arrowhead at 'tip' pointing along 'direction'.
    Uses a ReportLab path (beginPath/moveTo/lineTo/drawPath).
    """
    tx, ty = tip
    ux, uy = direction
    L = math.hypot(ux, uy)
    if L < 1e-6:
        return
    ux, uy = ux / L, uy / L

    # Perpendicular vector
    px, py = -uy, ux

    back_x, back_y = (tx - ux * size, ty - uy * size)
    left_x, left_y = (back_x + px * (size * 0.6), back_y + py * (size * 0.6))
    right_x, right_y = (back_x - px * (size * 0.6), back_y - py * (size * 0.6))

    # Build triangle path
    p = c.beginPath()
    p.moveTo(tx, ty)
    p.lineTo(left_x, left_y)
    p.lineTo(right_x, right_y)
    p.close()

    # Draw it
    c.setLineWidth(0.5)
    # (Optional) set explicit color:
    # from reportlab.lib.colors import black
    # c.setFillColor(black); c.setStrokeColor(black)
    c.drawPath(p, fill=1, stroke=1)


def _draw_info_panel(c, x, y, w, project, dims, attrs):
    """
    Simple right-side info block: project info + attributes table.
    (x, y) is the TOP-LEFT corner; w is the available width. Height is flexible.
    """
    line_h = 14
    small = 9
    big = 12

    def line(text, bold=False, pad=0):
        nonlocal y
        y -= pad
        c.setFont("Helvetica-Bold" if bold else "Helvetica", big if bold else small)
        c.drawString(x, y, text)
        y -= line_h

    # Title
    line(f"Project: {project.name or 'Untitled'} (ID {project.id})", bold=True, pad=2)

    # Attributes
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "Attributes")
    y -= line_h

    c.setFont("Helvetica", 9)
    def kv(label, val):
        nonlocal y
        c.drawString(x + 12, y, f"{label}: {val}")
        y -= line_h

    kv("Width",  f"{int(round(dims['width']))} mm")
    kv("Length", f"{int(round(dims['length']))} mm")
    kv("Height", f"{int(round(dims['height']))} mm")

    if attrs.get("fabricWidth"):
        kv("Fabric width", f"{int(round(attrs['fabricWidth']))} mm")
    if attrs.get("hem") is not None:
        kv("Hem", f"{int(round(attrs['hem']))} mm")
    if attrs.get("seam") is not None:
        kv("Seam", f"{int(round(attrs['seam']))} mm")

    kv("Quantity", f"{int(attrs.get('quantity') or 1)}")

    y -= 4
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(x, y, "Notes: All dimensions in millimetres. Drawing proportional; labels show true sizes.")


def _estimate_bom_items(dims: dict, attrs: dict, level: str = "summary") -> list[dict]:
    """
    Very simple example BoM. Replace with your schema evaluator.
    Returns list of rows: {code, description, qty, unit, notes}
    """
    width = float(dims.get("width", 0.0))
    length = float(dims.get("length", 0.0))
    height = float(dims.get("height", 0.0))
    qty = int(attrs.get("quantity") or 1)

    fabric_w = attrs.get("fabricWidth") or 0.0  # mm
    hem = attrs.get("hem") or 0.0              # mm
    seam = attrs.get("seam") or 0.0            # mm

    rows = []

    # Fabric usage (very rough): total area / usable width => linear mm, then to meters
    if fabric_w and fabric_w > 0:
        usable_len_mm = (width * length) / fabric_w
        usable_len_m = usable_len_mm / 1000.0
        rows.append({
            "code": "FAB-ROLL",
            "description": "Fabric roll usage (est.)",
            "qty": round(usable_len_m * qty, 2),
            "unit": "m",
            "notes": f"{int(fabric_w)} mm roll; seams ~{int(seam or 0)} mm",
        })
    else:
        rows.append({
            "code": "FAB-ROLL",
            "description": "Fabric roll usage (est.)",
            "qty": round((width*length)/1_000_000 * qty, 2),
            "unit": "m²",
            "notes": "No fabric width set; showing area",
        })

    # Perimeter hem length (mm -> m)
    perimeter_mm = 2 * (width + length)
    perimeter_m = perimeter_mm / 1000.0
    if hem and hem > 0:
        rows.append({
            "code": "HEM-THREAD",
            "description": "Hem / stitching",
            "qty": round(perimeter_m * qty, 2),
            "unit": "m",
            "notes": f"hem ~{int(hem)} mm",
        })

    # Example accessories (edges)
    rows.append({
        "code": "EDGE-TAPE",
        "description": "Edge reinforcement tape",
        "qty": round(perimeter_m * qty, 2),
        "unit": "m",
        "notes": "",
    })

    if level == "detailed":
        rows.append({
            "code": "QA-LABEL",
            "description": "Labels & QA tags",
            "qty": qty,
            "unit": "ea",
            "notes": "Per cover",
        })

    return rows


def _draw_bom_page(c: canvas.Canvas, project, dims: dict, attrs: dict, bom_level: str = "summary"):
    page_w, page_h = c._pagesize  # current page size
    margin = 24
    inner_w = page_w - 2 * margin
    y = page_h - margin

    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y, "Bill of Materials")
    c.setFont("Helvetica", 9)
    y -= 14
    c.drawString(margin, y, f"Project: {getattr(project, 'name', '')} (#{getattr(project, 'id', '')})")
    y -= 20

    # Build rows
    rows = _estimate_bom_items(dims, attrs, level=bom_level)

    # Table header
    headers = ["Code", "Description", "Qty", "Unit", "Notes"]
    col_w = [80, inner_w - (80 + 70 + 50 + 180), 70, 50, 180]  # total == inner_w
    assert sum(col_w) == inner_w

    # Draw header background line
    c.setLineWidth(0.8)
    c.line(margin, y, margin + inner_w, y)
    y -= 18
    c.setFont("Helvetica-Bold", 10)

    x = margin
    for i, h in enumerate(headers):
        c.drawString(x + 2, y, h)
        x += col_w[i]
    y -= 6
    c.line(margin, y, margin + inner_w, y)

    # Rows
    c.setFont("Helvetica", 9)
    for r in rows:
        y -= 16
        if y < margin + 40:  # simple page-break guard (rare here)
            c.showPage()
            # re-draw mini header on continuation
            y = page_h - margin
            c.setFont("Helvetica-Bold", 12)
            c.drawString(margin, y, "Bill of Materials (cont.)")
            y -= 24
            c.setFont("Helvetica", 9)

        x = margin
        cells = [
            r.get("code", ""),
            r.get("description", ""),
            str(r.get("qty", "")),
            r.get("unit", ""),
            r.get("notes", ""),
        ]
        for i, val in enumerate(cells):
            c.drawString(x + 2, y, val)
            x += col_w[i]

        # row line
        c.setLineWidth(0.3)
        c.line(margin, y - 3, margin + inner_w, y - 3)

    # Footer
    y = margin + 8
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(margin, y, f"Level: {bom_level.capitalize()} — Generated UTC {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}")


# ------------------------------- UTIL -------------------------------

def _safe_float(v, default=None, min_val=None, max_val=None):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return default
    if min_val is not None and f < min_val:
        f = min_val
    if max_val is not None and f > max_val:
        f = max_val
    return f
