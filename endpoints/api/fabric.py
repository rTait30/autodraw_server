from flask import Blueprint, jsonify
from models import FabricType, FabricColor, db

fabric_bp = Blueprint('fabric', __name__)

@fabric_bp.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'Fabric API working'})

@fabric_bp.route('/types', methods=['GET'])
def get_fabric_types():
    try:
        print("DEBUG: get_fabric_types called")
        types = FabricType.query.all()
        print(f"DEBUG: Found {len(types)} fabric types")
        result = [{
            'id': t.id,
            'name': t.name,
            'category': t.category,
            'description': t.description,
            'tech_specs': t.tech_specs
        } for t in types]
        print(f"DEBUG: Returning {len(result)} types")
        return jsonify(result)
    except Exception as e:
        print(f"DEBUG: Error in get_fabric_types: {e}")
        return jsonify({'error': str(e)}), 500

@fabric_bp.route('/type/<int:type_id>/colors', methods=['GET'])
def get_fabric_colors(type_id):
    print(f"DEBUG: get_fabric_colors called for type_id {type_id}")
    colors = FabricColor.query.filter_by(fabric_type_id=type_id).all()
    print(f"DEBUG: Found {len(colors)} colors")
    return jsonify([{
        'id': c.id,
        'name': c.name,
        'hex_value': c.hex_value,
        'texture_path': c.texture_path
    } for c in colors])

