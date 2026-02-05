from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from endpoints.api.auth.utils import current_user, role_required
from endpoints.api.products import get_product_capabilities
from endpoints.api.projects.services import project_service


projects_api_bp = Blueprint("projects_api", __name__)


@projects_api_bp.route('/products', methods=['GET'])
def get_products():
    """Get all products."""
    products = project_service.list_all_products()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'description': p.description,
        'default_schema_id': p.default_schema_id,
        'capabilities': get_product_capabilities(p.name)
    } for p in products])



# -------------------------------
# Create / update project (auth required)
# -------------------------------
@projects_api_bp.route("/projects/create", methods=["POST", "OPTIONS"])
@jwt_required()
def save_project_config():
    print(f"[DEBUG] save_project_config hit. Identity: {get_jwt_identity()}")
    user = current_user(required=True)
    if not user:
        print(f"[AUTH ERROR] save_project_config: Valid JWT identity '{get_jwt_identity()}' but User not found in DB.")
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
    
    products_out = project_service.list_project_products_for_editor(project.id, order_by_item_index=False)

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
    print(f"[DEBUG] upsert_project_and_attributes hit for ID {project_id}. Identity: {get_jwt_identity()}")
    user = current_user(required=True)
    if not user:
        print(f"[AUTH ERROR] upsert_project_and_attributes: Valid JWT identity '{get_jwt_identity()}' but User not found in DB.")
        return jsonify({"error": "Unauthorized"}), 401
        
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

    products_out = project_service.list_project_products_for_editor(project.id, order_by_item_index=True)

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
# List deleted projects (auth required; client sees own only)
# -------------------------------
@projects_api_bp.route("/projects/list/deleted", methods=["GET"])
@jwt_required()
def list_deleted_project_configs():
    user = current_user(required=True)
    client_id = request.args.get("client_id")
    
    try:
        result = project_service.list_deleted_projects(user, client_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Error listing deleted projects: {e}")
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
    # Look up client_name from database
    client_name = None
    if project.client_id:
        from models import User
        client_user = User.query.get(project.client_id)
        if client_user:
            client_name = client_user.username

    general = {
        "id": project.id,
        "name": project.name,
        "client_id": project.client_id,
        "client_name": client_name,
        "due_date": project.due_date.isoformat() if project.due_date else None,
        "info": project.info,
        "status": project.status.name if hasattr(project.status, "name") else project.status,
    }

    # --- Product info ---
    # Staff (admin, estimator, designer) can see all documents; clients only see client_visible ones
    is_staff = user.role in ("admin", "estimator", "designer")
    product_info = {
        "id": project.product.id if project.product else None,
        "name": project.product.name if project.product else None,
        "capabilities": get_product_capabilities(project.product.name, include_staff_only=is_staff) if project.product else {},
    }

    # --- Items (covers, sails, etc.) ---
    items = []
    for p in project.products:
        if not p.deleted:  # Only include non-deleted products
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
        # Also send the evaluated schema (with resolved numbers)
        data["estimate_schema_evaluated"] = project.estimate_schema_evaluated or {}

    return jsonify(data), 200



# -------------------------------
# Price list (auth required — all roles)
# -------------------------------
@projects_api_bp.route("/pricelist", methods=["GET"])
@jwt_required()
def get_pricelist():
    return jsonify(project_service.list_pricelist_items()), 200

# -------------------------------
# Clients list (staff only)
# -------------------------------
@projects_api_bp.route("/clients", methods=["GET"])
@role_required("admin", "estimator", "designer")
def get_clients():
    clients = project_service.list_client_users()
    return jsonify([{"id": c.id, "name": c.username} for c in clients]), 200







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


# -------------------------------
# Delete project (soft delete - mark as deleted)
# -------------------------------
@projects_api_bp.route("/project/<int:project_id>", methods=["DELETE"])
@jwt_required()
def delete_project(project_id):
    user = current_user(required=True)
    
    try:
        project_service.delete_project(user, project_id)
    except ValueError as e:
        if str(e) == "Project not found":
            return jsonify({"error": str(e)}), 404
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        print(f"Error deleting project: {e}")
        return jsonify({"error": "Internal server error"}), 500

    return jsonify({"message": "Project deleted successfully"}), 200


# -------------------------------
# Delete project product (soft delete - mark as deleted)
# -------------------------------
@projects_api_bp.route("/project/product/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_project_product(product_id):
    user = current_user(required=True)
    
    try:
        project_service.delete_project_product(user, product_id)
    except ValueError as e:
        if str(e) in ["Project product not found", "Project not found"]:
            return jsonify({"error": str(e)}), 404
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        print(f"Error deleting project product: {e}")
        return jsonify({"error": "Internal server error"}), 500

    return jsonify({"message": "Project product deleted successfully"}), 200


# -------------------------------
# Recover project (undelete - mark as not deleted)
# -------------------------------
@projects_api_bp.route("/project/<int:project_id>/recover", methods=["POST"])
@jwt_required()
def recover_project(project_id):
    user = current_user(required=True)
    
    try:
        project_service.recover_project(user, project_id)
    except ValueError as e:
        if str(e) == "Project not found or not deleted":
            return jsonify({"error": str(e)}), 404
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        print(f"Error recovering project: {e}")
        return jsonify({"error": "Internal server error"}), 500

    return jsonify({"message": "Project recovered successfully"}), 200




