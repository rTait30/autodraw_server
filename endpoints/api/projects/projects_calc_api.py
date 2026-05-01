"""Projects calculation API blueprint."""

from flask import Blueprint, jsonify, request

from models import db, Product, Project
from endpoints.api.products import dispatch_calculation


projects_calc_api_bp = Blueprint("projects_calc_api", __name__)


@projects_calc_api_bp.route("/projects/calculate", methods=["POST"])
# @jwt_required()
def calculate():
    """Calculate a canonical project payload."""
    # user = current_user(required=True)
    # if not user:
    #     return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    product_payload = data.get("product") or {}
    try:
        product_id = int(product_payload.get("id")) if product_payload.get("id") is not None else None
    except (TypeError, ValueError):
        return jsonify({"error": "product.id must be an integer"}), 400
    if product_id is None:
        return jsonify({"error": "Missing 'product.id' in request body"}), 400

    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": f"Product id {product_id} not found"}), 404

    calc_input = dict(data)
    calc_input["product"] = {"id": product.id, "name": product.name}
    calc_input.setdefault("products", [])
    calc_input.setdefault("project_attributes", {})
    calc_input.setdefault("general", {})

    enriched = dispatch_calculation(product.name, calc_input)
    
    # --- Perform Estimation on the Result ---
    # We need a schema. 
    # 1. Try to get schema from request (if frontend sent it)
    # 2. Try to get schema from existing project (if id provided)
    # 3. Fallback to product default schema
    
    schema = data.get("estimate_schema")
    project_id = data.get("id") or data.get("project_id")
    
    if not schema and project_id:
        existing_proj = db.session.get(Project, project_id)
        if existing_proj:
            schema = existing_proj.estimate_schema
            
    # Fallback handled inside estimate_payload if schema is None (uses product default)
    
    from endpoints.api.projects.services.estimation_service import estimate_payload
    evaluated_schema = estimate_payload(product_id, enriched, schema=schema)

    return jsonify({
        "id": data.get("id"),
        "product": {"id": product.id, "name": product.name},
        "general": calc_input.get("general") or {},
        "products": enriched.get("products", calc_input.get("products") or []),
        "project_attributes": enriched.get("project_attributes", calc_input.get("project_attributes") or {}),
        "estimate_schema_evaluated": evaluated_schema,
    }), 200
