from datetime import datetime, timezone
from dateutil.parser import parse as parse_date
from sqlalchemy.orm.attributes import flag_modified
import math

from models import db, Project, ProjectProduct, User, Product, ProjectStatus
from endpoints.api.projects.services.calculation_service import calculate_project
from endpoints.api.projects.services.estimation_service import estimate_project_total
from endpoints.api.products import dispatch_document
from WG.workGuru import dr_make_lead

def _as_int(v):
    try:
        return int(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None

def create_project(user, data):
    general = data.get("general") or {}
    project_attributes = data.get("project_attributes") or {}
    project_calculated = data.get("project_calculated") or {}
    products_payload = data.get("products") or []

    # Only allow these fields from "general" to map directly to Project
    allowed_fields = {"name", "status", "due_date", "info", "client_id"}
    project_data = {k: v for k, v in general.items() if k in allowed_fields}

    # ---- validate & normalize name ----
    name = (project_data.get("name") or "").strip()
    if not name or len(name) == 0 or len(name) > 200:
        raise ValueError("name is required and must be between 1 and 200 characters")
    project_data["name"] = name

    # ---- normalize due_date (string -> date or None) ----
    due_date = project_data.get("due_date")
    if due_date:
        try:
            project_data["due_date"] = parse_date(due_date)
        except Exception:
            raise ValueError(f"Invalid due_date format: {due_date}")
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
                    raise ValueError(f"Invalid status: {st}")

    # ---- unified product id (required on create) ----
    product_id = _as_int(data.get("product_id"))
    if product_id is None:
        raise ValueError("product_id is required")
    if not db.session.get(Product, product_id):
        raise ValueError(f"Product id {product_id} not found")

    # ---- determine client_id ----
    if user.role == "client":
        target_client_id = user.id
    else:
        target_client_id = _as_int(project_data.get("client_id"))
        if target_client_id is None:
            # Fallback: if staff creates a project without specifying a client, assign it to themselves
            target_client_id = user.id

    # --- CREATE ---
    project = Project(
        name=project_data["name"],
        status=project_data.get("status") or ProjectStatus.awaiting_deposit,
        due_date=project_data.get("due_date"),
        info=project_data.get("info"),
        client_id=target_client_id,
        product_id=product_id,
        project_attributes=project_attributes,
        project_calculated=project_calculated,
    )
    db.session.add(project)
    db.session.flush()  # get project.id for products

    # After we know product_id, copy default schema into project.estimate_schema
    product = db.session.get(Product, product_id) if product_id is not None else None
    if product and product.default_schema:
        project.schema_id = product.default_schema.id       # optional "came from" pointer
        project.estimate_schema = product.default_schema.data

        # Optionally compute an initial estimate_total
        try:
            from estimation import estimate_price_from_schema
            results = estimate_price_from_schema(
                project.estimate_schema,
                project.project_attributes or {},
            ) or {}
            totals = results.get("totals") or {}
            project.estimate_total = (
                totals.get("grand_total")
                or totals.get("grandTotal")
                or totals.get("total")
            )
        except Exception as e:
            print("Initial estimate failed:", e)

    # ---------- Unified enrichment (single raw format) ----------
    if project.product:
        try:
            calc_input = {
                "product_id": project.product_id,
                "product_type": project.product.name,
                "type": project.product.name,
                "general": general,
                "project_attributes": project_attributes,
                "products": products_payload,
            }
            enriched = calculate_project(project.product.name, calc_input)
            if isinstance(enriched.get("project_attributes"), dict):
                project.project_attributes = enriched["project_attributes"]
            else:
                project.project_attributes = project_attributes
            if isinstance(enriched.get("products"), list):
                products_payload = enriched["products"]
            flag_modified(project, "project_attributes")
        except Exception as e:
            print(f"Enrichment failed for project {project.id}: {e}")
            project.project_attributes = project_attributes
    else:
        project.project_attributes = project_attributes
    
    # ---------- Check for discrepancy problems in shade_sail (product_id == 2) on create ----------
    if product_id == 2:  # Only on create for shade_sail
        discrepancy_sails = []
        for idx, p in enumerate(products_payload):
            if p.get("attributes", {}).get("discrepancyProblem") == True:
                label = p.get("name") or p.get("attributes", {}).get("label") or f"Item {idx + 1}"
                discrepancy_sails.append(label)
        if discrepancy_sails:
            raise ValueError(f"Discrepancy problems in sails: {', '.join(discrepancy_sails)}")
    
    # Deprecated: keep project_calculated for backward compat but consider empty
    project.project_calculated = project_calculated or {}

    # ---------- Replace products from payload ----------
    ProjectProduct.query.filter_by(project_id=project.id).delete(synchronize_session=False)

    for idx, p in enumerate(products_payload):
        if not isinstance(p, dict):
            raise ValueError("each product must be an object")

        attrs = p.get("attributes") or {}
        if not isinstance(attrs, dict):
            raise ValueError("product.attributes must be an object")

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

    # --- Compute per-item and project totals (row-only evaluator) ---
    try:
        db.session.flush() # Ensure products are visible
        estimate_project_total(project)
    except Exception as e:
        print(f"Item/project estimate failed: {e}")
        import traceback
        traceback.print_exc()
 
    db.session.commit()

    # WorkGuru submission
    if (data.get("product_id") == 1 and data.get("submitToWG") == True):
        print ("Submitting cover project to WorkGuru...")
        name = (data.get("general").get("name") or "").strip()
        description = ""
        for cover in data.get("products", []):
            attributes = cover.get("attributes", {})
            cover_quantity = attributes.get("quantity", 0)
            cover_length = attributes.get("length", 0)
            cover_width = attributes.get("width", 0)
            cover_height = attributes.get("height", 0)
            description += (f"{cover_quantity} x PVC Cover\n{cover_length}x{cover_width}x{cover_height}mm \n")

        estimated_price = project.estimate_total or 0.0
        
        dr_make_lead(
            name=name,
            description=description,
            budget=math.ceil(estimated_price) if estimated_price else 0,
            category="2a",
            go_percent=100
        )

    return project

def update_project(user, project_id, data):
    general = data.get("general") or {}
    project_attributes = data.get("project_attributes")
    project_calculated = data.get("project_calculated")
    products_payload = data.get("products")
    new_product_id = data.get("product_id")
    
    if new_product_id is not None:
        try:
            new_product_id = int(new_product_id)
        except (TypeError, ValueError):
            raise ValueError("product_id must be an integer")

    # Ensure project exists
    project = Project.query.get(project_id)
    if not project:
        raise ValueError("Project not found")

    # Clients may only update their own projects
    if user.role == "client":
        if project.client_id != user.id:
            raise ValueError("Unauthorized")

    # ---------- Update general (Project) fields ----------
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
                    raise ValueError("client_id must be an integer or empty")
        if "due_date" in general:
            dd = general["due_date"]
            if dd in (None, "", "null"):
                project.due_date = None
            elif isinstance(dd, str):
                try:
                    project.due_date = parse_date(dd)
                except Exception:
                    raise ValueError(f"Invalid due_date format: {dd}")
            else:
                project.due_date = dd
        if "info" in general:
            project.info = general["info"]
        if "status" in general:
            st = general["status"]
            if st is not None:
                if isinstance(st, ProjectStatus):
                    project.status = st
                elif isinstance(st, str):
                    try:
                        project.status = ProjectStatus[st]
                    except KeyError:
                        try:
                            project.status = ProjectStatus(st)
                        except ValueError:
                            raise ValueError(f"Invalid status: {st}")

    # ---------- Optional product change ----------
    if new_product_id is not None and new_product_id != project.product_id:
        if not db.session.get(Product, new_product_id):
            raise ValueError(f"Product id {new_product_id} not found")
        project.product_id = new_product_id

    # ---------- Update project-level JSON if provided ----------
    if project_attributes is not None and project.product:
        try:
            calc_input = {
                "product_id": project.product_id,
                "product_type": project.product.name,
                "type": project.product.name,
                "general": general,
                "project_attributes": project_attributes,
                "products": products_payload if products_payload is not None else [],
            }
            enriched = calculate_project(project.product.name, calc_input)
            if isinstance(enriched.get("project_attributes"), dict):
                project.project_attributes = enriched["project_attributes"]
            else:
                project.project_attributes = project_attributes
            if isinstance(enriched.get("products"), list) and products_payload is not None:
                products_payload = enriched["products"]
            flag_modified(project, "project_attributes")
        except Exception as e:
            print(f"Enrichment failed for project {project.id}: {e}")
            project.project_attributes = project_attributes
    elif project_attributes is not None:
        project.project_attributes = project_attributes

    # Deprecated: project_calculated kept for backward compat
    if project_calculated is not None:
        project.project_calculated = project_calculated

    # ---------- Update products if provided ----------
    if products_payload is not None:
        # Simple semantics: replace all products with the new list
        ProjectProduct.query.filter_by(project_id=project.id).delete(synchronize_session=False)

        for idx, p in enumerate(products_payload):
            if not isinstance(p, dict):
                raise ValueError("each product must be an object")

            attrs = p.get("attributes") or {}
            if not isinstance(attrs, dict):
                raise ValueError("product.attributes must be an object")

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
    return project

def list_projects(user, client_id=None):
    query = Project.query
    if user.role == "client":
        query = query.filter_by(client_id=user.id)
    else:
        if client_id:
            try:
                query = query.filter_by(client_id=int(client_id))
            except ValueError:
                raise ValueError("client_id must be an integer")

    projects = query.all()
    result = []

    for project in projects:
        client_user = User.query.get(project.client_id)

        result.append({
            "id": project.id,
            "name": project.name,
            "type": project.product.name if project.product else None,
            "status": project.status.name if hasattr(project.status, "name") else project.status,
            "due_date": project.due_date.isoformat() if project.due_date else None,
            "info": project.info,
            "client": client_user.username if client_user else None,
        })
    return result

def get_project(user, project_id):
    project = Project.query.get(project_id)
    if not project:
        raise ValueError("Project not found")

    # --- Authorization ---
    if user.role == "client" and project.client_id != user.id:
        raise ValueError("Unauthorized")

    return project

def _serialize_project_plain(prj):
    # Generic SQLAlchemy row -> plain dict (columns only)
    def _row_to_dict(row):
        out = {}
        for k, v in dict(row.__dict__).items():
            if k.startswith("_"):
                continue
            # Convert datetimes safely
            if hasattr(v, "isoformat"):
                try:
                    out[k] = v.isoformat()
                    continue
                except Exception:
                    pass
            out[k] = v
        return out

    proj_dict = _row_to_dict(prj)

    # Normalize product info to simple name/id for consumers
    product_info = {
        "id": prj.product.id if prj.product else None,
        "name": prj.product.name if prj.product else None,
    }

    # Serialize related products rows generically
    items = []
    for p in prj.products:
        item = _row_to_dict(p)
        # Keep only fields commonly used on the frontend
        item = {
            "id": item.get("id"),
            "name": item.get("label"),
            "productIndex": item.get("item_index"),
            "attributes": item.get("attributes") or {},
            "calculated": item.get("calculated") or {},
        }
        items.append(item)

    # Build final plain object; include project JSON blobs untouched
    return {
        "id": proj_dict.get("id"),
        "product": product_info,
        "general": {
            "id": proj_dict.get("id"),
            "name": proj_dict.get("name"),
            "client_id": proj_dict.get("client_id"),
            "due_date": proj_dict.get("due_date"),
            "info": proj_dict.get("info"),
            "status": prj.status.name if hasattr(prj.status, "name") else proj_dict.get("status"),
        },
        "project_attributes": prj.project_attributes or {},
        "project_calculated": prj.project_calculated or {},
        "products": items,
    }

def generate_dxf_for_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")

    if not project.product:
        raise ValueError("Project has no product type")
    
    product_type = project.product.name
    plain_project = _serialize_project_plain(project)
    fname = f"{(project.name or 'project').strip()}.dxf".replace(" ", "_")

    return dispatch_dxf(product_type, plain_project, download_name=fname)

def generate_pdf_for_project(user, project_id, include_bom=False, bom_level="summary"):
    project = Project.query.get(project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")

    # Authorization check for BOM
    is_staff = user.role in ("estimator", "designer", "admin")
    if include_bom and not is_staff:
        raise ValueError("Including Bill of Materials is not permitted for clients.")

    if not project.product:
        raise ValueError("Project has no product type")

    product_type = project.product.name
    plain_project = _serialize_project_plain(project)
    
    base = f"{(project.name or 'project').strip()}_{project.id}".replace(" ", "_")
    suffix = "_with_BoM" if (include_bom and is_staff) else ""
    fname = f"{base}{suffix}.pdf"

    return dispatch_pdf(product_type, plain_project, download_name=fname, include_bom=(include_bom and is_staff), bom_level=bom_level)

def generate_document_for_project(user, project_id, doc_id, **kwargs):
    project = Project.query.get(project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")

    if not project.product:
        raise ValueError("Project has no product type")

    # Basic authorization check (can be refined per document type if needed)
    # For now, assume if you can see the project, you can generate docs, 
    # unless specific docs have restrictions (handled in generator or here).
    
    product_type = project.product.name
    plain_project = _serialize_project_plain(project)
    
    return dispatch_document(product_type, doc_id, plain_project, **kwargs)
