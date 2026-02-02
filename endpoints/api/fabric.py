from flask import Blueprint, jsonify, request
from models import FabricType, FabricColor, db

fabric_bp = Blueprint('fabric', __name__)

def add_fabric_type_service(data):
    """
    Service function to add a fabric type.
    """
    name = data.get('name')
    category = data.get('category')
    description = data.get('description', '')
    tech_specs = data.get('tech_specs', {})

    if not name or not category:
        raise ValueError("Name and Category are required")

    existing = FabricType.query.filter_by(name=name).first()
    if existing:
        raise ValueError(f"Fabric type '{name}' already exists")

    fabric = FabricType(
        name=name,
        category=category,
        description=description,
        tech_specs=tech_specs
    )
    db.session.add(fabric)
    db.session.commit()
    return fabric

def update_fabric_type_service(fabric_id, data):
    """
    Service function to update a fabric type.
    """
    fabric = FabricType.query.get(fabric_id)
    if not fabric:
        raise ValueError(f"Fabric type with ID {fabric_id} not found")

    if 'name' in data:
         # Check for name collision if name is changing
        if data['name'] != fabric.name:
             existing = FabricType.query.filter_by(name=data['name']).first()
             if existing:
                 raise ValueError(f"Fabric type '{data['name']}' already exists")
        fabric.name = data['name']
    
    if 'category' in data:
        fabric.category = data['category']
    if 'description' in data:
        fabric.description = data['description']
    if 'tech_specs' in data:
        # Merge or replace? Let's assume replace for now, or shallow merge
        # If the user passes a dict, we update keys. 
        if isinstance(data['tech_specs'], dict):
            # Create a copy of the existing specs to modify
            new_specs = fabric.tech_specs.copy() if fabric.tech_specs else {}
            new_specs.update(data['tech_specs'])
            fabric.tech_specs = new_specs
    
    db.session.commit()
    return fabric

def add_fabric_color_service(fabric_id, data):
    """
    Service function to add a color to a fabric type.
    """
    fabric = FabricType.query.get(fabric_id)
    if not fabric:
        raise ValueError(f"Fabric type with ID {fabric_id} not found")

    name = data.get('name')
    hex_value = data.get('hex_value')
    texture_path = data.get('texture_path')

    if not name:
        raise ValueError("Color name is required")

    # Check for existing color with same name for this fabric
    existing = FabricColor.query.filter_by(fabric_type_id=fabric_id, name=name).first()
    if existing:
         raise ValueError(f"Color '{name}' already exists for this fabric")

    # Auto-generate texture path if not provided
    if not texture_path:
        # Convention: /static/textures/{fabric_name_clean}/{color_name_clean}.jpg
        # Allows auto-discovery of images placed manually in the correct folder
        clean_fabric = fabric.name.lower().replace(" ", "")
        clean_color = name.lower().replace(" ", "")
        texture_path = f"/static/textures/{clean_fabric}/{clean_color}.jpg"

    color = FabricColor(
        fabric_type_id=fabric_id,
        name=name,
        hex_value=hex_value,
        texture_path=texture_path
    )
    db.session.add(color)
    db.session.commit()
    return color

@fabric_bp.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'Fabric API working'})

@fabric_bp.route('/add_fabric', methods=['POST'])
def add_fabric_type():
    try:
        data = request.get_json()
        fabric = add_fabric_type_service(data)
        return jsonify({
            'message': 'Fabric type added successfully',
            'fabric': {
                'id': fabric.id,
                'name': fabric.name,
                'category': fabric.category
            }
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@fabric_bp.route('/type/<int:type_id>', methods=['PUT'])
def update_fabric_type(type_id):
    try:
        data = request.get_json()
        fabric = update_fabric_type_service(type_id, data)
        return jsonify({
            'message': 'Fabric type updated successfully',
            'fabric': {
                'id': fabric.id,
                'name': fabric.name,
                'category': fabric.category,
                'description': fabric.description,
                'tech_specs': fabric.tech_specs
            }
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@fabric_bp.route('/type/<int:type_id>/colors', methods=['POST'])
def add_fabric_color(type_id):
    try:
        data = request.get_json()
        color = add_fabric_color_service(type_id, data)
        return jsonify({
            'message': 'Color added successfully',
            'color': {
                'id': color.id,
                'name': color.name,
                'hex_value': color.hex_value
            }
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@fabric_bp.route('/types', methods=['GET'])
def get_fabric_types():
    try:
        # print("DEBUG: get_fabric_types called")
        types = FabricType.query.all()
        # print(f"DEBUG: Found {len(types)} fabric types")
        result = [{
            'id': t.id,
            'name': t.name,
            'category': t.category,
            'description': t.description,
            'tech_specs': t.tech_specs
        } for t in types]
        # print(f"DEBUG: Returning {len(result)} types")
        return jsonify(result)
    except Exception as e:
        print(f"DEBUG: Error in get_fabric_types: {e}")
        return jsonify({'error': str(e)}), 500

@fabric_bp.route('/type/<int:type_id>/colors', methods=['GET'])
def get_fabric_colors(type_id):
    # print(f"DEBUG: get_fabric_colors called for type_id {type_id}")
    colors = FabricColor.query.filter_by(fabric_type_id=type_id).all()
    # print(f"DEBUG: Found {len(colors)} colors")
    return jsonify([{
        'id': c.id,
        'name': c.name,
        'hex_value': c.hex_value,
        'texture_path': c.texture_path
    } for c in colors])

