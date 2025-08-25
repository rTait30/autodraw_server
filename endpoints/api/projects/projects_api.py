from datetime import datetime, timezone
from dateutil.parser import parse as parse_date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy.orm.attributes import flag_modified

from models import db, Project, ProjectAttribute, User, Product, ProjectType, EstimatingSchema, ProjectStatus
from endpoints.api.auth.utils import current_user, role_required, _json, _user_by_credentials

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
@projects_api_bp.route("/projects/create", methods=["POST"])
@jwt_required()
def save_project_config():
    user = current_user(required=True)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json() or {}
    project_id = data.get("id")  # Optional update/upsert

    # ---- CHANGED: do NOT whitelist "type" because it's a relationship now
    allowed_fields = {"name", "status", "due_date", "info"}  # <- 'type' removed
    project_data = {k: v for k, v in data.items() if k in allowed_fields}

    # Normalize due_date
    due_date = project_data.get("due_date")
    if due_date:
        try:
            project_data["due_date"] = parse_date(due_date)
        except Exception:
            return jsonify({"error": f"Invalid due_date format: {due_date}"}), 400
    else:
        project_data["due_date"] = None

    # Coerce status if you're using SqlEnum(ProjectStatus)
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

    attributes = data.get("attributes") or {}
    calculated = data.get("calculated") or {}
    if not isinstance(attributes, dict) or not isinstance(calculated, dict):
        return jsonify({"error": "attributes and calculated must be objects"}), 400

    # ---- NEW: resolve type_id from either type_id or type name
    type_id, type_err = resolve_project_type_id(data)
    if type_err and not project_id:
        # On CREATE, type is required
        return jsonify({"error": type_err}), 400

    # Determine target client_id
    target_client_id = None
    if user.role == "client":
        target_client_id = user.id
    else:
        target_client_id = _as_int(data.get("client_id"))
        if target_client_id is None and not project_id:
            return jsonify({"error": "client_id is required for staff creates"}), 400

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
                project.client_id = target_client_id  # ✅ set FK, not relationship

        # Staff can change type if provided
        if user.role != "client" and type_id is not None and type_id != project.type_id:
            project.type_id = type_id  # ✅ set FK, not relationship

        # Apply scalar fields only (name/status/due_date/info)
        for field, value in project_data.items():
            setattr(project, field, value)

        project.updated_at = datetime.now(timezone.utc)

    else:
        # --- CREATE ---
        project = Project(
            name=(project_data.get("name") or "").strip(),
            status=project_data.get("status") or ProjectStatus.quoting,
            due_date=project_data.get("due_date"),
            info=project_data.get("info"),
            client_id=target_client_id,  # ✅ FK
            type_id=type_id,             # ✅ FK (resolved above)
        )
        db.session.add(project)
        db.session.flush()  # get project.id

    # Upsert attributes/calculated
    attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
    changes = {
        "attributes_updated": [],
        "attributes_added": [],
        "calculated_updated": [],
        "calculated_added": [],
    }

    if attr:
        if attr.data is None:
            attr.data = {}
        for k, v in attributes.items():
            if k not in attr.data:
                changes["attributes_added"].append(k)
            elif attr.data[k] != v:
                changes["attributes_updated"].append(k)
            attr.data[k] = v
        flag_modified(attr, "data")

        if attr.calculated is None:
            attr.calculated = {}
        for k, v in calculated.items():
            if k not in attr.calculated:
                changes["calculated_added"].append(k)
            elif attr.calculated[k] != v:
                changes["calculated_updated"].append(k)
            attr.calculated[k] = v
        flag_modified(attr, "calculated")
    else:
        attr = ProjectAttribute(project_id=project.id, data=attributes, calculated=calculated)
        db.session.add(attr)
        if attributes:
            changes["attributes_added"].extend(list(attributes.keys()))
        if calculated:
            changes["calculated_added"].extend(list(calculated.keys()))

    db.session.commit()

    # Nice response: include type info now that it's a relationship
    resp_type = {"id": project.type.id, "name": project.type.name} if project.type else None
    resp_status = project.status.name if hasattr(project.status, "name") else project.status

    return jsonify({
        "id": project.id,
        "client_id": project.client_id,
        "type": resp_type,
        "status": resp_status,
        "changes": changes
    }), 200

# -------------------------------
# Edit existing project (auth + role aware)
# -------------------------------
@projects_api_bp.route("/projects/edit/<int:project_id>", methods=["PUT", "PATCH"])
@jwt_required()
def edit_project(project_id):
    data = request.get_json() or {}
    project = Project.query.get_or_404(project_id)

    user = current_user(required=True)
    role = user.role if user else None

    editable_fields = {
        "estimator": {"status", "due_date", "info", "attributes"},
        "client": {"info", "attributes"},
        "admin": {"name", "type", "status", "due_date", "info", "client_id", "attributes"},
        "designer": {"info", "attributes", "status"},  # optional: allow designer to touch status/info
    }
    allowed = editable_fields.get(role, set())

    project_fields = {"name", "type", "status", "due_date", "info", "client_id", "created_at", "updated_at"}
    project_data = {k: v for k, v in data.items() if k in project_fields and k in allowed}
    attribute_data = data.get("attributes") if "attributes" in allowed else None

    forbidden = [k for k in data if (k in project_fields and k not in allowed)]
    if forbidden:
        return jsonify({"error": f"You are not allowed to edit fields: {forbidden}"}), 403

    for field, value in project_data.items():
        setattr(project, field, value)
    project.updated_at = datetime.now(timezone.utc)

    if attribute_data is not None:
        attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
        if not attr:
            attr = ProjectAttribute(project_id=project.id, data=attribute_data or {})
            db.session.add(attr)
        else:
            if attr.data is None:
                attr.data = {}
            attr.data.update(attribute_data or {})
            flag_modified(attr, "data")

    db.session.commit()
    return jsonify({
        "id": project.id,
        "status": project.status.name if hasattr(project.status, "name") else project.status
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
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None,
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

    # Authorization: clients can only access their own projects
    if user.role == "client" and project.client_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
    data = {
        "id": project.id,
        "name": project.name,
        "type": project.type.name if hasattr(project.type, "name") else project.type,
        "status": project.status.name if hasattr(project.status, "name") else project.status,
        "due_date": project.due_date.isoformat() if project.due_date else None,
        "info": project.info,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        "client_id": project.client_id,
    }
    if attr:
        if attr.data:
            data["attributes"] = attr.data
        if attr.calculated:
            data["calculated"] = attr.calculated
    return jsonify(data), 200

# -------------------------------
# Price list (auth required — all roles)
# -------------------------------
@projects_api_bp.route("/pricelist", methods=["GET"])
@jwt_required()
def get_pricelist():
    products = Product.query.order_by(Product.name).all()
    return jsonify([{
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "description": p.description,
        "price": p.price,
        "unit": p.unit,
        "active": p.active,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    } for p in products]), 200

# -------------------------------
# Clients list (staff only)
# -------------------------------
@projects_api_bp.route("/clients", methods=["GET"])
@role_required("admin", "estimator", "designer")
def get_clients():
    clients = User.query.filter_by(role="client").order_by(User.username).all()
    return jsonify([{"id": c.id, "name": c.username} for c in clients]), 200
