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

@database_api_bp.route('/copelands/api/database')
@role_required("admin")
def api_database():
    table_names = db.metadata.tables.keys()
    db_data = {}
    for table_name in table_names:
        table = db.metadata.tables[table_name]
        rows = db.session.execute(table.select()).fetchall()
        # Serialize each row
        db_data[table_name] = [
            {k: serialize_value(v) for k, v in row._mapping.items()}
            for row in rows
        ]
    return jsonify(db_data)

@database_api_bp.route('/copelands/api/database/sql', methods=['POST'])
@role_required("admin")
def run_sql():
    
    '''
    identity = get_jwt_identity()
    user = User.query.filter_by(username=identity).first()
    if not user or user.role.lower() != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    '''
        
    data = request.get_json()
    sql = data.get('sql', '')

    if not sql.strip():
        return jsonify({'error': 'No SQL provided'}), 400

    try:
        result = db.session.execute(text(sql))
        db.session.commit()
        try:
            rows = result.fetchall()
            output = [
                {k: serialize_value(v) for k, v in row._mapping.items()}
                for row in rows
            ]
            return jsonify({'result': output})
        except Exception:
            return jsonify({'status': 'success'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    
@database_api_bp.route('/copelands/api/database/get_by_sku', methods=['POST'])
@role_required("estimator")
def get_products_by_skus():
    data = request.get_json()
    skus = data.get("skus")

    if not skus or not isinstance(skus, list):
        return jsonify({"error": "Missing or invalid 'skus' (expected list)"}), 400

    products = Product.query.filter(Product.sku.in_(skus)).all()

    return jsonify([
        {
            "sku": p.sku,
            "name": p.name,
            "price": p.price
        } for p in products
    ])
