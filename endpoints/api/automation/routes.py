from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy.orm.attributes import flag_modified
from models import db, Project, Product, ProjectProduct
from endpoints.api.projects.services import automation_service

automation_bp = Blueprint("automation_api", __name__)

@automation_bp.route('/automation/init/<int:project_id>', methods=['GET'])
def init_automation(project_id):
    # Call the service layer
    record, error = automation_service.initialize_automation(project_id)
    
    if error:
        return jsonify({"success": False, "error": error}), 400

    return jsonify({
        "success": True,
        "data": record
    }), 200

@automation_bp.route('/automation/start/<int:project_id>', methods=['GET'])
# @jwt_required()
def automation_start(project_id):
    """
    Returns the full context required for automation.
    Lazy-initializes the 'autodraw_record' if it doesn't exist yet.
    """
    project = Project.query.get_or_404(project_id)
    
    # 1. Product Validation
    product = project.product
    if not product:
        return jsonify({"error": "Project has no assigned product"}), 404

    # 2. Check Initialization (Lazy Loading)
    # If the record is missing or empty, we generate it now.
    if not project.autodraw_record:
        print(f"Project {project_id}: Initializing Automation Record...")
        
        # Call the helper logic you already defined/approved
        _, error = automation_service.initialize_automation(project_id)
        
        if error:
            return jsonify({"error": f"Initialization failed: {error}"}), 500
            
        # Refresh the project object to ensure we have the latest committed data
        # (Sometimes SQLAlchemy caches old state)
        db.session.refresh(project)

    # 3. Construct the combined context
    context = {
        "project_id": project.id,
        "project_name": project.name,
        
        # User inputs (The Backpack)
        "project_attributes": project.project_attributes or {},
        
        # Static Rules (The Map)
        "autodraw_config": product.autodraw_config or {},
        
        # Dynamic Status (The Checklist) - NOW GUARANTEED TO EXIST
        "autodraw_record": project.autodraw_record,
        
        # Pointers (Where are we?)
        "autodraw_meta": project.autodraw_meta or {}
    }

    return jsonify(context)

@automation_bp.route('/automation/continue/<int:project_id>', methods=['POST'])
# @jwt_required()
def automation_continue(project_id):
    """
    Advances the step of the automation.
    Optionally accepts updated autodraw_record and autodraw_meta.
    Checks for whether step is automated. Warns if more information is needed if not
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
