from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Project, ProjectAttribute, User
from datetime import datetime, timezone

projects_api_bp = Blueprint('projects_api', __name__)

# Create or update a project (save)
@projects_api_bp.route('/copelands/api/projects/create', methods=['POST'])
@jwt_required()
def save_project_config():
    data = request.get_json()
    project_id = data.get('id')
    attributes = data.get('attributes', {})

    if project_id:
        # Update existing project
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        for field in ['name', 'type', 'status', 'due_date', 'info', 'client_id']:
            if field in data:
                setattr(project, field, data[field])
        project.updated_at = datetime.now(timezone.utc)
    else:
        # Create new project
        project = Project(
            name=data.get('name'),
            type=data.get('type'),
            status=data.get('status', 'draft'),
            due_date=data.get('due_date'),
            info=data.get('info'),
            client_id=data.get('client_id')
        )
        db.session.add(project)
        db.session.flush()  # Get project.id for attributes

    # Save or update attributes
    if attributes:
        attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
        if not attr:
            attr = ProjectAttribute(project_id=project.id, data=attributes)
            db.session.add(attr)
        else:
            attr.data = attributes

    db.session.commit()
    return jsonify({'id': project.id, 'status': project.status.name if hasattr(project.status, 'name') else project.status})

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

# List all projects (optionally filter by client)
@projects_api_bp.route('/copelands/api/projects/list', methods=['GET'])
@jwt_required()
def list_project_configs():
    client_id = request.args.get('client_id')
    query = Project.query
    if client_id:
        query = query.filter_by(client_id=client_id)
    projects = query.all()
    result = []
    for project in projects:
        attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
        result.append({
            'id': project.id,
            'name': project.name,
            'type': project.type.name if hasattr(project.type, 'name') else project.type,
            'status': project.status.name if hasattr(project.status, 'name') else project.status,
            'due_date': project.due_date.isoformat() if project.due_date else None,
            'info': project.info,
            'created_at': project.created_at.isoformat() if project.created_at else None,
            'updated_at': project.updated_at.isoformat() if project.updated_at else None,
            'client_id': project.client_id,
            'attributes': attr.data if attr else {}
        })
    return jsonify(result)

# Get a single project by ID
@projects_api_bp.route('/copelands/api/projects/get/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project_config(project_id):
    project = Project.query.get_or_404(project_id)
    attr = ProjectAttribute.query.filter_by(project_id=project.id).first()
    return jsonify({
        'id': project.id,
        'name': project.name,
        'type': project.type.name if hasattr(project.type, 'name') else project.type,
        'status': project.status.name if hasattr(project.status, 'name') else project.status,
        'due_date': project.due_date.isoformat() if project.due_date else None,
        'info': project.info,
        'created_at': project.created_at.isoformat() if project.created_at else None,
        'updated_at': project.updated_at.isoformat() if project.updated_at else None,
        'client_id': project.client_id,
        'attributes': attr.data if attr else {}
    })