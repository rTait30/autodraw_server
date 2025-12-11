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

    return jsonify({
        "product_id": product_id,
        "product_type": product.name,
        "products": enriched.get("products", calc_input.get("products") or []),
        "project_attributes": enriched.get("project_attributes", calc_input.get("project_attributes") or {}),
        "source": "direct",
    }), 200

