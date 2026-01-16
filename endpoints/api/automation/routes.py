from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy.orm.attributes import flag_modified
from models import db, Project, Product, ProjectProduct

automation_bp = Blueprint("automation_api", __name__)

@automation_bp.route('/automation/project/<int:project_id>/context', methods=['GET'])
# @jwt_required() # Enable this for security
def get_automation_context(project_id):
    """
    Returns the full context required for automation:
    1. Project Attributes (The user's inputs)
    2. Autodraw Config (The product's automation rules)
    3. Autodraw Record (The current state/history of automation)
    """
    project = Project.query.get_or_404(project_id)
    
    # Ensure we have the associated product to get its config
    product = project.product
    if not product:
        return jsonify({"error": "Project has no assigned product"}), 404

    # Construct the combined context
    context = {
        "project_id": project.id,
        "project_name": project.name,
        "project_attributes": project.project_attributes or {},
        
        # Product configuration for AutoDraw
        "autodraw_config": product.autodraw_config or {},
        
        # Current state of the automation for this project
        "autodraw_record": project.autodraw_record or {},
        
        # Metadata tracking current step if used
        "autodraw_meta": project.autodraw_meta or {}
    }

    return jsonify(context)

@automation_bp.route('/automation/project/<int:project_id>/record', methods=['POST'])
# @jwt_required()
def update_automation_record(project_id):
    """
    Allows external automation to save its progress back to the server.
    Accepts partial updates or full writes.
    """
    project = Project.query.get_or_404(project_id)
    data = request.get_json() or {}

    if "autodraw_record" in data:
        project.autodraw_record = data["autodraw_record"]
        flag_modified(project, "autodraw_record")

    if "autodraw_meta" in data:
        project.autodraw_meta = data["autodraw_meta"]
        flag_modified(project, "autodraw_meta")
        
    # Optional: Allow automation to update attributes if it calculated new things
    if "project_attributes" in data:
        # Be careful here: merging strategies might be needed
        project.project_attributes = data["project_attributes"]
        flag_modified(project, "project_attributes")

    db.session.commit()

    return jsonify({
        "status": "success",
        "autodraw_record": project.autodraw_record
    })
