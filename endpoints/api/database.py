from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from models import db, Project, ProjectAttribute, User, Product
from datetime import datetime, timezone, date

from endpoints.api.auth.utils import current_user, role_required, _json, _user_by_credentials

database_api_bp = Blueprint('database_api', __name__)

def serialize_value(val):
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if hasattr(val, "name"):  # likely Enum
        return val.name
    if hasattr(val, "value"):
        return val.value
    return str(val) if not isinstance(val, (str, int, float, bool, type(None))) else val

@database_api_bp.route('/database', methods=['GET'])
@role_required("admin")
def api_database():
    table_names = db.metadata.tables.keys()
    db_data = {}
    for table_name in table_names:
        table = db.metadata.tables[table_name]
        rows = db.session.execute(table.select()).fetchall()
        db_data[table_name] = [
            {k: serialize_value(v) for k, v in row._mapping.items()}
            for row in rows
        ]
    return jsonify(db_data)

@database_api_bp.route("/database/sql", methods=["POST"])
@role_required("admin")
def run_sql():
    data = request.get_json(silent=True) or {}
    sql = (data.get("sql") or "").strip()
    if not sql:
        return jsonify({"error": "No SQL provided"}), 400

    try:
        result = db.session.execute(text(sql))
        db.session.commit()

        # Try to fetch result rows (e.g., for SELECT)
        try:
            rows = result.fetchall()
        except Exception:
            rows = None

        if rows is not None:
            output = [
                {k: serialize_value(v) for k, v in row._mapping.items()}
                for row in rows
            ]
            return jsonify({"result": output}), 200
        else:
            return jsonify({"status": "success"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@database_api_bp.route("/database/get_by_sku", methods=["POST"])
@role_required("estimator")
def get_products_by_skus():
    data = request.get_json(silent=True) or {}
    skus = data.get("skus")
    if not isinstance(skus, list) or not skus:
        return jsonify({"error": "Missing or invalid 'skus' (expected non-empty list)"}), 400

    # Normalize SKUs (trim, drop empties)
    norm_skus = [s.strip() for s in skus if isinstance(s, str) and s.strip()]
    if not norm_skus:
        return jsonify({"error": "No valid SKUs provided"}), 400

    products = Product.query.filter(Product.sku.in_(norm_skus)).all()
    return jsonify([
        {"sku": p.sku, "name": p.name, "price": p.price}
        for p in products
    ]), 200