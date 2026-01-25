"""Projects calculation API blueprint.

Single direct calculation endpoint: accepts raw form payload with product_id,
optional general, project_attributes, products arrays and returns enriched data.
Legacy multi-mode formats are no longer supported.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Product, Project, User
from endpoints.api.auth.utils import current_user
from endpoints.api.products import dispatch_calculation


projects_calc_api_bp = Blueprint("projects_calc_api", __name__)


@projects_calc_api_bp.route("/projects/calculate", methods=["POST"])
# @jwt_required()
def calculate():
    """Single-mode project calculation.

    Input (direct only):
      {
        product_id: int,            # required
        general: {...},              # optional raw general form values
        project_attributes: {...},   # optional raw project-level values
        products: [ { attributes: {...} }, ... ]  # optional product array
        ... any other passthrough fields are preserved
      }

    Behavior:
      - Loads product by product_id.
      - Adds product_type/type to payload.
      - Passes ENTIRE original payload (with added keys) to dispatch.
      - Returns enriched products & project_attributes (fallback to originals).

    Response:
      {
        product_id,
        product_type,
        products,
        project_attributes,
        source: "direct"
      }
    """
    # user = current_user(required=True)
    # if not user:
    #     return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    if product_id is None:
        return jsonify({"error": "Missing 'product_id' in request body"}), 400

    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": f"Product id {product_id} not found"}), 404

    # Compose calc input: clone original, ensure product_type/type present
    calc_input = dict(data)
    calc_input["product_type"] = product.name
    calc_input.setdefault("type", product.name)

    # Ensure keys exist even if empty so calculators can rely on them
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
        "product_id": product_id,
        "product_type": product.name,
        "products": enriched.get("products", calc_input.get("products") or []),
        "project_attributes": enriched.get("project_attributes", calc_input.get("project_attributes") or {}),
        "estimate_schema_evaluated": evaluated_schema,
        "source": "direct",
    }), 200


@projects_calc_api_bp.route("/projects/preview_document", methods=["POST"])
def preview_document():
    """
    Generates a document (e.g. DXF) for a transient project state (not saved in DB).
    Useful for live previews in the frontend.
    
    Input:
      {
        product_id: int,
        doc_id: str,
        general: {...},
        project_attributes: {...},
        products: [...]
      }
    """
    from endpoints.api.products import dispatch_document

    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    doc_id = data.get("doc_id")
    
    if not product_id or not doc_id:
        return jsonify({"error": "product_id and doc_id are required"}), 400

    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": f"Product id {product_id} not found"}), 404

    # Construct a project-like object from the payload
    # This mimics the structure expected by generators (usually a dict or object)
    # Most generators expect a dict with keys: id, name, products, project_attributes, etc.
    
    project_data = {
        "id": "preview",
        "name": data.get("general", {}).get("name", "Preview"),
        "product": {"id": product.id, "name": product.name},
        "general": data.get("general", {}),
        "project_attributes": data.get("project_attributes", {}),
        "products": data.get("products", []),
        # Flatten top-level attributes for legacy generators that expect them directly
        **data.get("project_attributes", {})
    }
    
    # Also merge general fields if needed
    project_data.update(data.get("general", {}))

    try:
        return dispatch_document(product.name, doc_id, project_data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Preview generation failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

