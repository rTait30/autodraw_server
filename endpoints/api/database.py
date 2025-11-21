from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from models import db, Project, ProjectProduct, User, Product, SKU
from datetime import datetime, timezone, date

from endpoints.api.auth.utils import current_user, role_required, _json, _user_by_credentials

from WG.workGuru import wg_get

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


def fetch_sku_from_crm(sku_code: str):
    

    sku_data = wg_get("DR", "Product/GetProductBySku", {"sku": sku_code})
    
    if sku_data and isinstance(sku_data, dict):
        return sku_data
    return None


@database_api_bp.route("/database/get_by_sku", methods=["POST"])
@role_required("estimator")
def get_skus_by_codes():
    data = request.get_json(silent=True) or {}
    skus = data.get("skus")
    if not isinstance(skus, list) or not skus:
        return jsonify({"error": "Missing or invalid 'skus' (expected non-empty list)"}), 400

    norm_skus = [s.strip() for s in skus if isinstance(s, str) and s.strip()]
    if not norm_skus:
        return jsonify({"error": "No valid SKUs provided"}), 400

    existing = SKU.query.filter(SKU.sku.in_(norm_skus)).all()
    existing_map = {s.sku: s for s in existing}
    missing = [code for code in norm_skus if code not in existing_map]

    newly_added = []
    for code in missing:
        print(f"SKU '{code}' not found locally; attempting CRM lazy fetch...")
        crm_data = fetch_sku_from_crm(code)
        if crm_data:
            sku_obj = SKU(
                sku=crm_data.get("sku") or code,
                name=crm_data.get("name"),
                costPrice=crm_data.get("costPrice"),
                sellPrice=crm_data.get("sellPrice"),
            )
            db.session.add(sku_obj)
            existing_map[sku_obj.sku] = sku_obj
            newly_added.append(sku_obj.sku)
        else:
            print(f"CRM did not return data for SKU '{code}'.")

    if newly_added:
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to persist new SKUs: {e}"}), 500

    response_payload = [existing_map[c].to_dict() for c in norm_skus if c in existing_map]
    return jsonify({
        "skus": response_payload,
        "missing": [m for m in missing if m not in newly_added],
        "newly_added": newly_added,
    }), 200
