# api/estimating_schemas_api.py
from flask import Blueprint, request, jsonify
from models import db, EstimatingSchema, Product
from endpoints.api.auth.utils import role_required, current_user

est_schemas_bp = Blueprint(
    "est_schemas",
    __name__,
)


def _product_id_from_payload(payload):
    product = payload.get("product")
    try:
        product_id = int(product.get("id")) if isinstance(product, dict) and product.get("id") is not None else None
    except (TypeError, ValueError):
        return None
    return product_id

@est_schemas_bp.route("/est_schemas/create", methods=["POST"])
@role_required("estimator", "admin")
def create_schema():
    """
    Create a new estimating schema for a product.
    """
    try:
        user = current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        product_id = _product_id_from_payload(payload)
        data = payload.get("data")
        name = (payload.get("name") or "Untitled Schema").strip()

        if not product_id:
            return jsonify({"error": "product.id is required"}), 400
        if data is None:
            return jsonify({"error": "data (schema JSON) is required"}), 400

        prod = Product.query.get(product_id)
        if not prod:
            return jsonify({"error": f"Product {product_id} not found"}), 404

        schema = EstimatingSchema(
            product_id=product_id,
            name=name,
            data=data,
            is_default=payload.get("is_default", False),
            version=int(payload.get("version", 1)),
        )
        db.session.add(schema)
        db.session.commit()

        return jsonify({"id": schema.id}), 201
    except Exception as e:
        print(f"DEBUG: Error in create_schema: {e}")
        return jsonify({'error': str(e)}), 500


@est_schemas_bp.route("/est_schemas/get_by_product", methods=["POST"])
@role_required("estimator", "admin", "designer")
def get_schemas_by_product():
    """
    Get all estimating schemas for a specific product.
    """
    try:
        payload = request.get_json(silent=True) or {}
        product_id = _product_id_from_payload(payload)

        if not product_id:
            return jsonify({"error": "product.id is required"}), 400

        schemas = EstimatingSchema.query.filter_by(product_id=product_id).all()
        # Sort by default first, then name
        schemas.sort(key=lambda x: (not x.is_default, x.name))
        
        return jsonify([{
            "id": s.id, 
            "name": s.name, 
            "version": s.version, 
            "is_default": s.is_default,
            "data": s.data
        } for s in schemas]), 200
    except Exception as e:
        print(f"DEBUG: Error in get_schemas_by_product: {e}")
        return jsonify({'error': str(e)}), 500

@est_schemas_bp.route("/est_schemas/<int:schema_id>", methods=["GET"])
@role_required("estimator", "admin", "designer")
def get_schema(schema_id):
    try:
        schema = EstimatingSchema.query.get(schema_id)
        if not schema:
            return jsonify({"error": "Schema not found"}), 404
        return jsonify({
            "id": schema.id, 
            "name": schema.name, 
            "version": schema.version, 
            "is_default": schema.is_default, 
            "data": schema.data
        }), 200
    except Exception as e:
        print(f"DEBUG: Error in get_schema: {e}")
        return jsonify({'error': str(e)}), 500
