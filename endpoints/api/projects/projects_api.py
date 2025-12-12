from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, send_file, g
from flask_jwt_extended import jwt_required

from models import db, Project, ProjectProduct, User, Product, EstimatingSchema, ProjectStatus
from endpoints.api.auth.utils import current_user, role_required, _json, _user_by_credentials
from endpoints.api.products import get_product_capabilities

from WG.workGuru import wg_get, get_leads, add_cover
from endpoints.api.projects.services import project_service


projects_api_bp = Blueprint("projects_api", __name__)


@projects_api_bp.route('/products', methods=['GET'])
def get_products():
    """Get all products."""
    products = Product.query.all()
    return jsonify([{
        'id': p.name,  # Use name as ID for frontend compatibility (e.g. "COVER")
        'dbId': p.id,
        'name': p.name.replace('_', ' ').title(),  # "SHADE_SAIL" -> "Shade Sail"
        'description': p.description,
        'default_schema_id': p.default_schema_id,
        'capabilities': get_product_capabilities(p.name)
    } for p in products])


# ---------- ADD THESE SMALL HELPERS (near your routes file top) ----------
def _as_int(v):
    try:
        return int(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None



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

    try:
        if data.get("id"):
            project = project_service.update_project(user, data.get("id"), data)
        else:
            project = project_service.create_project(user, data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Error saving project: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

    resp_product = (
        {"id": project.product.id, "name": project.product.name}
        if project.product else None
    )
    resp_status = project.status.name if hasattr(project.status, "name") else project.status
    
    products_out = [
        {
            "id": pp.id,
            "itemIndex": pp.item_index,
            "label": pp.label,
            "attributes": pp.attributes,
            "calculated": pp.calculated,
        }
        for pp in ProjectProduct.query.filter_by(project_id=project.id)
    ]

    return jsonify({
        "id": project.id,
        "client_id": project.client_id,
        "product": resp_product,
        "status": resp_status,
        "project_attributes": project.project_attributes,
        "project_calculated": project.project_calculated,
        "products": products_out,
    }), 200


@projects_api_bp.route("/products/edit/<int:project_id>", methods=["PUT", "PATCH", "POST"])
@jwt_required()
def upsert_project_and_attributes(project_id):
    user = current_user(required=True)
    payload = request.get_json(silent=True) or {}

    try:
        project = project_service.update_project(user, project_id, payload)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Error updating project: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

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
    client_id = request.args.get("client_id")
    
    try:
        result = project_service.list_projects(user, client_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Error listing projects: {e}")
        return jsonify({"error": "Internal server error"}), 500

    return jsonify(result), 200

# -------------------------------
# Get a single project (auth required; client can only access own)
# -------------------------------
@projects_api_bp.route("/project/<int:project_id>", methods=["GET"])
@jwt_required()
def get_project_config(project_id):
    user = current_user(required=True)
    
    try:
        project = project_service.get_project(user, project_id)
    except ValueError as e:
        if str(e) == "Project not found":
            return jsonify({"error": str(e)}), 404
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        print(f"Error getting project: {e}")
        return jsonify({"error": "Internal server error"}), 500

    # --- Basic project info (general) ---
    general = {
        "id": project.id,
        "name": project.name,
        "client_id": project.client_id,
        "due_date": project.due_date.isoformat() if project.due_date else None,
        "info": project.info,
        "status": project.status.name if hasattr(project.status, "name") else project.status,
    }

    # --- Product info ---
    product_info = {
        "id": project.product.id if project.product else None,
        "name": project.product.name if project.product else None,
        "capabilities": get_product_capabilities(project.product.name) if project.product else {},
    }

    # --- Items (covers, sails, etc.) ---
    items = []
    for p in project.products:
        items.append({
            "id": p.id,
            "name": p.label,
            "productIndex": p.item_index,
            "attributes": p.attributes or {},
            "calculated": p.calculated or {},
        })

    # --- Response payload ---
    data = {
        "id": project.id,
        "product": product_info,
        "general": general,
        "project_attributes": project.project_attributes or {},
        "project_calculated": project.project_calculated or {},
        "products": items,
    }

    # --- Include schema for privileged roles ---
    if user.role in ("admin", "estimator"):
        data["estimate_schema"] = project.estimate_schema or {}

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
    Uses project_attributes.nest + nested_panels to generate the DXF.
    """
    payload = request.get_json(silent=True) or {}
    project_id = payload.get("project_id")
    if not project_id:
        return jsonify({"error": "project_id is required"}), 400

    try:
        return project_service.generate_dxf_for_project(project_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"DXF generation failed: {e}")
        return jsonify({"error": "Internal server error"}), 500




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

    user = current_user(required=True)
    include_bom = bool(payload.get("include_bom", False))
    bom_level = payload.get("bom_level") or "summary"

    try:
        return project_service.generate_pdf_for_project(user, project_id, include_bom, bom_level)
    except ValueError as e:
        if str(e) == "Unauthorized":
            return jsonify({"error": "Unauthorized"}), 403
        if "not permitted" in str(e):
            return jsonify({"error": str(e)}), 403
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"PDF generation failed: {e}")
        return jsonify({"error": "Internal server error"}), 500


@projects_api_bp.route("/project/generate_document", methods=["POST"])
@jwt_required()
def generate_document():
    """
    Body: { "project_id": 123, "doc_id": "initial_drawing", ... }
    """
    payload = request.get_json(silent=True) or {}
    project_id = payload.get("project_id")
    doc_id = payload.get("doc_id")
    
    if not project_id or not doc_id:
        return jsonify({"error": "project_id and doc_id are required"}), 400

    user = current_user(required=True)
    
    # Pass all other payload keys as kwargs
    kwargs = {k: v for k, v in payload.items() if k not in ("project_id", "doc_id")}

    try:
        return project_service.generate_document_for_project(user, project_id, doc_id, **kwargs)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Document generation failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500




