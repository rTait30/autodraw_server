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
    project = Project.query.filter_by(id=project_id, deleted=False).first_or_404()
    
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

        "product_attributes": [p.attributes or {} for p in project.products],
        
        # Static Rules (The Map)
        "autodraw_config": product.autodraw_config or {},
        
        # Dynamic Status (The Checklist) - NOW GUARANTEED TO EXIST
        "autodraw_record": project.autodraw_record,
        
        # Pointers (Where are we?)
        "autodraw_meta": project.autodraw_meta or {}
    }

    return jsonify(context)

@automation_bp.route('/automation/continue/<int:project_id>', methods=['POST'])
def continue_project_automation(project_id):
    """
    Trigger the next step in the automation sequence.
    Called by the AutoCAD Plugin (ADCONTINUE).
    """
    
    # Get optional payload
    data = request.get_json(silent=True) or {}
    selected_option = data.get("selected_option")
    
    # 1. Call the Service (The Brain)
    # We pass None for record/meta as requested, trusting the DB state.
    result = automation_service.automation_continue(project_id, selected_option=selected_option)

    if result and "error" in result:
        print(f"Error during automation continue: {result['error']}")
        return jsonify({
            "success": False, 
            "message": result.get("message", "An error occurred during automation.")
        }), 400

    # 2. Handle Errors
    # The service returns a String if something went wrong
    if isinstance(result, str):
        # Simple heuristic: 404 if missing, 400 for logic errors
        status_code = 404 if "not found" in result.lower() else 400
        return jsonify({
            "success": False, 
            "message": result
        }), status_code
    
    print (f"Automation continue successful for project {project_id}")
    print (f"Result: {result}")

    # 3. Handle Success
    # The service returns a Dictionary if successful
    return jsonify({
        "success": True,
        "data": result
    }), 200
