# services/automation_service.py

import json
from datetime import datetime, timezone
from pydantic import ValidationError
# Import your Pydantic models (adjust path as needed)
# from schemas.automation import ProductRecord 
from models import db, Project, Product
from sqlalchemy.orm.attributes import flag_modified

import importlib
import re

def generate_record_template(product_id: str, product_type: str, config: dict) -> dict:
    """
    Internal Helper: Generates the blank 'autodraw_record' dictionary.
    """
    # --- A. Build the Raw Data Structure ---
    steps_dict = {}
    
    # Safely get steps, defaulting to empty list if missing
    steps_config = config.get("steps", [])
    
    for i, step_conf in enumerate(steps_config):
        step_key = step_conf["key"]
        
        # LOGIC: First step is "waiting_for_input", others "locked"
        step_status = "waiting_for_input" if i == 0 else "locked"
        
        substeps_dict = {}
        substeps_config = step_conf.get("substeps", [])
        
        for j, sub_conf in enumerate(substeps_config):
            sub_key = sub_conf["key"]
            
            # LOGIC: First substep of active step is "pending", others "locked"
            if step_status == "waiting_for_input" and j == 0:
                sub_status = "pending"
            else:
                sub_status = "locked"
            
            substeps_dict[sub_key] = {
                "status": sub_status,
                "label": sub_conf.get("label", "Unnamed"),
                "metadata": {}
            }
            
        steps_dict[step_key] = {
            "status": step_status,
            "label": step_conf.get("label", "Unnamed"),
            "substeps": substeps_dict
        }

    raw_record = {
        "created_at": datetime.now(timezone.utc).isoformat(), # Store directly as string to avoid JSON issues later
        "steps": steps_dict,
        "geometry": [],
    }

    # Optional: If you want strict Pydantic validation, uncomment below
    # try:
    #     model = ProductRecord(**raw_record)
    #     return json.loads(model.json())
    # except ValidationError as e:
    #     print(f"CRITICAL: Template generation failed validation.\n{e}")
    #     raise e

    return raw_record

def initialize_automation(project_id: int):
    """
    Main Service Function: Called by the API to bootstrap the project.
    """
    project = Project.query.get(project_id)
    if not project:
        return None, "Project not found"
    
    # 1. Idempotency Check (Don't overwrite if it exists)
    if project.autodraw_record:
        return project.autodraw_record, None

    # 2. Get Product Config
    product = project.product
    if not product or not product.autodraw_config:
        return None, "No Autodraw Configuration found for this Product"

    # 3. Generate the Template
    try:
        new_record = generate_record_template(
            product_id=product.id,
            product_type=product.name, # Adjust attribute name as needed
            config=product.autodraw_config
        )
    except Exception as e:
        return None, f"Failed to generate record template: {str(e)}"

    # 4. Save to Database
    project.autodraw_record = new_record
    
    # Initialize Metadata pointer
    project.autodraw_meta = {
        "current_step": 0,
        "current_substep": 0, # Since you use substeps now
        "is_complete": False,
        "initialised": True,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

    flag_modified(project, "autodraw_record")
    flag_modified(project, "autodraw_meta")
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return None, f"Database Error: {str(e)}"

    return new_record, None




def automation_continue(project_id: int, updated_record: dict = None, updated_meta: dict = None):
    """
    Main Service Function: Advances the automation step/substep.
    """
    project = Project.query.get(project_id)
    if not project:
        return "Project not found"

    # 1. Update record/meta if provided
    if updated_record:
        project.autodraw_record = updated_record
        flag_modified(project, "autodraw_record")

    if updated_meta:
        project.autodraw_meta = updated_meta
        flag_modified(project, "autodraw_meta")

    # 2. Get current step/substep from meta
    meta = project.autodraw_meta or {}
    current_step = meta.get("current_step", 0)
    current_substep = meta.get("current_substep", 0)

    # 3. Check if current step/substep is automated
    product = project.product
    if not product or not product.autodraw_config:
        return "No Autodraw Configuration found for this Product"

    steps_config = product.autodraw_config.get("steps", [])
    if current_step >= len(steps_config):
        return "Invalid current step"

    step_conf = steps_config[current_step]
    substeps_config = step_conf.get("substeps", [])
    if current_substep >= len(substeps_config):
        return "Invalid current substep"

    substep_conf = substeps_config[current_substep]
    if not substep_conf.get("automated", False):
        return "Current substep is not automated"

    # 4. Perform the automated action (Placeholder logic)
    geometry = project.autodraw_record.get("geometry", [])
    project_attributes = project.project_attributes or {}
    product_attributes = product.autodraw_config or {}

    perform_substep(step_conf["key"], substep_conf["key"], product.name, project_attributes, product_attributes, geometry)

    # 5. Update status to 'complete' and advance pointers
    record = project.autodraw_record or {}
    steps = record.get("steps", {})
    
    step_key = step_conf["key"]
    substep_key = substep_conf["key"]

    if step_key in steps and substep_key in steps[step_key]["substeps"]:
        steps[step_key]["substeps"][substep_key]["status"] = "complete"

        # Advance to next substep or step
        if current_substep + 1 < len(substeps_config):
            # Move to next substep
            project.autodraw_meta






def perform_substep(step, substep, product_name, project_attributes, product_attributes, geometry):

    print (f"Performing step {step} substep {substep}...")

    module_path = f"endpoints.api.products.{product_name}.{step}.{substep}"
    
    print(f"Attempting to load logic from: {module_path}")

    substep_module = importlib.import_module(module_path)

    substep_data = substep_module.run(
        project_attributes=project_attributes,
        product_attributes=product_attributes,
        geometry=geometry
    )

    return substep_data
    #geometry.extend(substep_data.get("new geometry", []))