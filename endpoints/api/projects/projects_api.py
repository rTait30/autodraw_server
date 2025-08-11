from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request, decode_token

from models import db, Project, ProjectAttribute, User, Product
from datetime import datetime, timezone
from dateutil.parser import parse as parse_date

from sqlalchemy.orm.attributes import flag_modified

projects_api_bp = Blueprint('projects_api', __name__)

def verify_jwt_in_request_optional():
    if 'Authorization' in request.headers:
        verify_jwt_in_request()

@projects_api_bp.route('/copelands/api/projects/create', methods=['POST'])
# !! PROTECT THIS ENDPOINT IN PRODUCTION !!
# @jwt_required()
def save_project_config():
    data = request.get_json()

    project_id = data.get('id')  # Optional update
    allowed_fields = {'name', 'type', 'status', 'due_date', 'info', 'client_id'}
    project_data = {k: v for k, v in data.items() if k in allowed_fields}

    # Normalize due_date: allow empty string or JavaScript-style date
    due_date = project_data.get('due_date')
    if due_date:
        try:
            project_data['due_date'] = parse_date(due_date)
        except Exception:
            return jsonify({'error': f"Invalid due_date format: {due_date}"}), 400
    else:
        project_data['due_date'] = None

    attributes = data.get('attributes', {}) or {}
    calculated = data.get('calculated', {}) or {}

    if project_id:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        for field, value in project_data.items():
            setattr(project, field, value)
        project.updated_at = datetime.now(timezone.utc)
    else:
        project = Project(**project_data)
        db.session.add(project)
        db.session.flush()  # So we can use project.id below

    attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
    changes = {
        'attributes_updated': [],
        'attributes_added': [],
        'calculated_updated': [],
        'calculated_added': [],
    }

    if attr:
        if attr.data is None:
            attr.data = {}
        for k, v in attributes.items():
            if k not in attr.data:
                changes['attributes_added'].append(k)
            elif attr.data[k] != v:
                changes['attributes_updated'].append(k)
            attr.data[k] = v
        flag_modified(attr, 'data')

        if attr.calculated is None:
            attr.calculated = {}
        for k, v in calculated.items():
            if k not in attr.calculated:
                changes['calculated_added'].append(k)
            elif attr.calculated[k] != v:
                changes['calculated_updated'].append(k)
            attr.calculated[k] = v
        flag_modified(attr, 'calculated')
    else:
        attr = ProjectAttribute(
            project_id=project.id,
            data=attributes,
            calculated=calculated
        )
        db.session.add(attr)
        changes['attributes_added'].extend(list(attributes.keys()))
        changes['calculated_added'].extend(list(calculated.keys()))

    db.session.commit()

    return jsonify({
        'id': project.id,
        'status': project.status.name if hasattr(project.status, 'name') else project.status,
        'changes': changes
    })



@projects_api_bp.route('/copelands/api/projects/edit/<int:project_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def edit_project(project_id):
    data = request.get_json()
    project = Project.query.get_or_404(project_id)

    # Get current user and role
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    user_role = user.role if user else None

    print(f"User role: {user_role}")

    # Define which roles can edit which fields
    editable_fields = {
        'estimator': {'status', 'due_date', 'info', 'attributes'},
        'client': {'info', 'attributes'},
        'admin': {'name', 'type', 'status', 'due_date', 'info', 'client_id', 'attributes'}
    }
    allowed = editable_fields.get(user_role, set())

    # List of Project model columns (excluding id and relationships)
    project_fields = {'name', 'type', 'status', 'due_date', 'info', 'client_id', 'created_at', 'updated_at'}
    project_data = {k: v for k, v in data.items() if k in project_fields and k in allowed}
    attribute_data = {k: v for k, v in data.items() if k not in project_fields and 'attributes' in allowed}

    # If user tries to edit forbidden fields, return 403
    forbidden = [k for k in data if (k in project_fields and k not in allowed)]
    if forbidden:
        return jsonify({'error': f'You are not allowed to edit fields: {forbidden}'}), 403

    # Update project fields
    for field, value in project_data.items():
        setattr(project, field, value)
    project.updated_at = datetime.now(timezone.utc)

    # Update or create ProjectAttribute
    if attribute_data:
        attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
        if not attr:
            attr = ProjectAttribute(project_id=project.id, data=attribute_data)
            db.session.add(attr)
        else:
            if attr.data is None:
                attr.data = {}
            attr.data.update(attribute_data)

    db.session.commit()
    return jsonify({'id': project.id, 'status': project.status.name if hasattr(project.status, 'name') else project.status})


@projects_api_bp.route('/copelands/api/projects/list', methods=['GET'])
def list_project_configs():
    # Try to get JWT token from Authorization header, but don't require it
    token = None
    username = None
    user = None
    user_role = None

    auth_header = request.headers.get('Authorization', None)
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            decoded = decode_token(token)
            username = decoded.get('sub') or decoded.get('identity')
        except Exception:
            username = None

    if username:
        user = User.query.filter_by(username=username).first()
        user_role = user.role if user else None

    query = Project.query

    # If the user is a client, only show their own projects
    if user_role == 'client':
        query = query.filter_by(client_id=user.id)
    else:
        # For non-clients, allow filtering by client_id if provided
        client_id = request.args.get('client_id')
        if client_id:
            query = query.filter_by(client_id=client_id)

    projects = query.all()
    result = []
    for project in projects:
        attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
        client_user = User.query.get(project.client_id)

        result.append({
            'id': project.id,
            'name': project.name,
            'type': project.type.name if hasattr(project.type, 'name') else project.type,
            'status': project.status.name if hasattr(project.status, 'name') else project.status,
            'due_date': project.due_date.isoformat() if project.due_date else None,
            'info': project.info,
            'created_at': project.created_at.isoformat() if project.created_at else None,
            'updated_at': project.updated_at.isoformat() if project.updated_at else None,
            'client': client_user.username if client_user else None,
        })
    return jsonify(result)

# Get a single project by ID
@projects_api_bp.route('/copelands/api/project/<int:project_id>', methods=['GET'])
# !! PROTECT THIS ENDPOINT IN PRODUCTION !!
# @jwt_required()
def get_project_config(project_id):
    project = Project.query.get_or_404(project_id)
    attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
    data = {
        'id': project.id,
        'name': project.name,
        'type': project.type.name if hasattr(project.type, 'name') else project.type,
        'status': project.status.name if hasattr(project.status, 'name') else project.status,
        'due_date': project.due_date.isoformat() if project.due_date else None,
        'info': project.info,
        'created_at': project.created_at.isoformat() if project.created_at else None,
        'updated_at': project.updated_at.isoformat() if project.updated_at else None,
        'client_id': project.client_id,
    }

    if attr:
        if attr.data:
            data['attributes'] = attr.data
        if attr.calculated:
            data['calculated'] = attr.calculated

    return jsonify(data)

@projects_api_bp.route('/copelands/api/pricelist', methods=['GET'])
def get_pricelist():
    products = Product.query.order_by(Product.name).all()
    result = []
    for product in products:
        result.append({
            'id': product.id,
            'sku': product.sku,
            'name': product.name,
            'description': product.description,
            'price': product.price,
            'unit': product.unit,
            'active': product.active,
            'created_at': product.created_at.isoformat() if product.created_at else None,
            'updated_at': product.updated_at.isoformat() if product.updated_at else None,
        })
    return jsonify(result)

@projects_api_bp.route('/copelands/api/clients', methods=['GET'])
def get_clients():
    from models import User  # Ensure User is imported
    # Optionally filter by role if you only want client users
    clients = User.query.filter_by(role='client').order_by(User.username).all()
    result = [
        {'id': client.id, 'name': client.username}
        for client in clients
    ]
    return jsonify(result)
