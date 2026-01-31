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
    project = Project.query.filter_by(id=project_id, deleted=False).first()
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




def automation_continue(project_id: int, updated_record: dict = None, updated_meta: dict = None, selected_option: str = None):
    """
    Main Service Function: Advances the automation step/substep.
    """
    print(f"\n--- automation_continue(project_id={project_id}) START ---")
    
    project = Project.query.filter_by(id=project_id, deleted=False).first()
    if not project:
        print(f"Error: Project {project_id} not found")
        return "Project not found"

    # 1. Update record/meta if provided
    if updated_record:
        print("Updating autodraw_record from request...")
        project.autodraw_record = updated_record
        flag_modified(project, "autodraw_record")

    if updated_meta:
        print("Updating autodraw_meta from request...")
        project.autodraw_meta = updated_meta
        flag_modified(project, "autodraw_meta")

    # 2. Get current step/substep from meta
    meta = project.autodraw_meta or {}
    current_step = meta.get("current_step", 0)
    current_substep = meta.get("current_substep", 0)
    print(f"Current Automation State: Step {current_step}, Substep {current_substep}")

    # 3. Check if current step/substep is automated
    product = project.product
    if not product or not product.autodraw_config:
        print("Error: No Autodraw Configuration found.")
        return "No Autodraw Configuration found for this Product"

    steps_config = product.autodraw_config.get("steps", [])
    if current_step >= len(steps_config):
        print("Error: Invalid current step index.")
        return "Invalid current step"

    step_conf = steps_config[current_step]
    substeps_config = step_conf.get("substeps", [])
    if current_substep >= len(substeps_config):
        print("Error: Invalid current substep index.")
        return "Invalid current substep"

    substep_conf = substeps_config[current_substep]
    step_key = step_conf["key"]

    # --- OPTION SELECTION LOGIC ---
    record_substep_key = substep_conf["key"]
    execution_substep_key = record_substep_key # Default to substep key
    target_conf = substep_conf

    # Check if we have options
    if "options" in substep_conf and substep_conf["options"]:
        options = substep_conf["options"]
        chosen_option = None
        
        # A. Try to find the requested option
        if selected_option:
            chosen_option = next((opt for opt in options if opt["key"] == selected_option), None)
            if not chosen_option:
                print(f"Warning: Selected option '{selected_option}' not found in configuration.")
        
        # B. Fallback to default
        if not chosen_option:
            chosen_option = next((opt for opt in options if opt.get("is_default")), None)
            
        # C. Fallback to first
        if not chosen_option and options:
             chosen_option = options[0]
        
        if chosen_option:
            target_conf = chosen_option
            execution_substep_key = chosen_option["key"]
    
    print(f"Target Step config: {step_key} -> {record_substep_key} (Execution Key: {execution_substep_key})")

    if not target_conf.get("automated", False):
        print(f"Current substep/option ({execution_substep_key}) is NOT automated. Exiting automation loop.")
        return "Current substep is not automated"

    # 4. Perform the automated action (Placeholder logic)
    print("Executing automated logic...")
    geometry = project.autodraw_record.get("geometry", [])
    project_attributes = project.project_attributes or {}
    product_attributes = [pp.attributes for pp in project.products]
    
    # Calculate next_geometry_id efficiently
    next_geometry_id = 1
    if geometry:
         # Simple heuristic: Max existing integer ID + 1
         # We do this here once, so we don't have to scan in every substep
         max_id = 0
         for g in geometry:
             try:
                 gid = int(g.get("id", 0))
                 if gid > max_id:
                     max_id = gid
             except:
                 pass
         next_geometry_id = max_id + 1

    new_substep_data = perform_substep(step_key, execution_substep_key, product.name, project_attributes, product_attributes, geometry, next_geometry_id)

    if new_substep_data and "error" in new_substep_data:
        print(f"Error during substep execution: {new_substep_data['error']}")
        return new_substep_data
    # Merge new geometry
    if new_substep_data and "new geometry" in new_substep_data:
        added_geom = new_substep_data["new geometry"]
        count_geom = len(added_geom)
        print(f"Received {count_geom} new geometry entities. Extending record.")
        geometry.extend(added_geom)
        # Ensure modifying the list inside the dict marks the field as modified
        flag_modified(project, "autodraw_record")

    # 5. Update status to 'complete' and advance pointers
    record = project.autodraw_record or {}
    steps = record.get("steps", {})
    
    # Use record_substep_key for status updates
    if step_key in steps and record_substep_key in steps[step_key]["substeps"]:
        print(f"Marking {step_key}.{record_substep_key} as 'complete'.")
        substep_record = steps[step_key]["substeps"][record_substep_key]
        substep_record["status"] = "complete"
        
        # Store metadata about which option was used
        if "metadata" not in substep_record:
            substep_record["metadata"] = {}
        substep_record["metadata"]["executed_option"] = execution_substep_key
        
        # Explicitly flag modification since we mutated a nested dict
        flag_modified(project, "autodraw_record") 

        # Advance to next substep or step
        if current_substep + 1 < len(substeps_config):
            # Move to next substep
            print(f"Advancing to next substep index: {current_substep + 1}")
            meta["current_substep"] = current_substep + 1
        elif current_step + 1 < len(steps_config):
            # Move to next step
            print(f"Advancing to next Step index: {current_step + 1} (Substep 0)")
            meta["current_step"] = current_step + 1
            meta["current_substep"] = 0
        else:
            print("All steps completed.")
            meta["is_complete"] = True

        project.autodraw_meta = meta
        flag_modified(project, "autodraw_meta")
        
        try:
            db.session.commit()
            print("DB Commit Successful.")
        except Exception as e:
            print(f"DB Commit Failed: {e}")
            db.session.rollback()
            return f"Database Error: {str(e)}"
    else:
        print(f"Warning: Could not find {step_key}.{execution_substep_key} in record structure to update status.")

    print("--- automation_continue END ---\n")
    
    return {
        "project_attributes": project.project_attributes or {},
        "product_attributes": [p.attributes or {} for p in project.products],
        "autodraw_meta": project.autodraw_meta or {},
        "autodraw_record": project.autodraw_record
    }






def perform_substep(step, substep, product_name, project_attributes, product_attributes, geometry, next_geometry_id=1):

    print (f"Performing step {step} substep {substep}...")

    print (f"perform_substep() Project Attributes: {project_attributes}")
    print (f"perform_substep() Product Attributes: {product_attributes}")
    print (f"perform_substep() Geometry (Len): {len(geometry)}")
    print (f"perform_substep() Next ID: {next_geometry_id}")

    module_path = f"endpoints.api.products.{product_name}.automated_steps.{step}.{substep}"
    
    print(f"Attempting to load logic from: {module_path}")

    try:
        substep_module = importlib.import_module(module_path)
        substep_data = substep_module.run(
            project_attributes=project_attributes,
            product_attributes=product_attributes,
            geometry=geometry,
            next_geometry_id=next_geometry_id
        )
        return substep_data
    except ModuleNotFoundError as e:
        # Check if the missing module is the one we are trying to import (Not Implemented)
        # or if an internal import in that module failed (Broken Dependency)
        if e.name == module_path:
            msg = f"Automation logic for '{step}.{substep}' is not implemented yet."
            print(f"Warning: {msg}")
            return {"message": msg, "error": "Not Implemented"}
        else:
            print(f"Error importing module {module_path}: {e}")
            return {"message": f"Module {module_path} has missing dependencies.", "error": str(e)}

    except ImportError as e:
        print(f"Error importing module {module_path}: {e}")
        message = f"Could not import module for step '{step}' substep '{substep}'."
        return {"message": message, "error": str(e)}
    except Exception as e:
        print(f"Runtime Exception in {module_path}: {e}")
        return {"message": f"Error running automation logic for {step}.{substep}", "error": str(e)}

    return substep_data
