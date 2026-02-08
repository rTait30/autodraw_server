from flask import json
from datetime import datetime, timezone
from pydantic_core import ValidationError

from endpoints.api.projects.services.calculation_service import calculate_project as value_calculator
from endpoints.api.projects.services.estimation_service import estimate_project_total
from autodraw_objects import ProductRecord

def calculate_project_metrics(project_name, calc_input):
    """
    Wrapper for calculation_service.calculate_project.
    """
    return value_calculator(project_name, calc_input)

def estimate_totals(project):
    """
    Wrapper for estimation_service.estimate_project_total.
    """
    try:
        estimate_project_total(project)
    except Exception as e:
        print(f"Item/project estimate failed: {e}")
        import traceback
        traceback.print_exc()

def generate_record_template(product_id: str, product_type: str, config: dict) -> dict:
    """
    Generates a blank 'autodraw_record' from the config.
    Returns a CLEAN DICTIONARY (JSON Compatible) with dates as strings.
    """
    
    # --- A. Build the Raw Data Structure ---
    steps_dict = {}
    if not config or "steps" not in config:
        # Fallback or error?
        # If config is None, we can't generate steps.
        return {
            "product_id": product_id,
            "product_type": product_type,
            "created_at": datetime.now(timezone.utc),
            "steps": {}
        }
    
    for i, step_conf in enumerate(config["steps"]):
        step_key = step_conf["key"]
        
        # LOGIC: First step is "waiting_for_input", others "locked"
        step_status = "waiting_for_input" if i == 0 else "locked"
        
        substeps_dict = {}
        for j, sub_conf in enumerate(step_conf["substeps"]):
            sub_key = sub_conf["key"]
            
            # LOGIC: First substep of active step is "pending", others "locked"
            if step_status == "waiting_for_input" and j == 0:
                sub_status = "pending"
            else:
                sub_status = "locked"
            
            substeps_dict[sub_key] = {
                "status": sub_status,
                "label": sub_conf["label"],
                "geometry_data": [],
                "metadata": {}
            }
            
        steps_dict[step_key] = {
            "status": step_status,
            "label": step_conf["label"],
            "substeps": substeps_dict
        }

    raw_record = {
        "product_id": product_id,
        "product_type": product_type,
        "created_at": datetime.now(timezone.utc),
        "steps": steps_dict
    }

    # --- B. Validation & Serialization ---
    try:
        # 1. Validate structure using Pydantic
        model = ProductRecord(**raw_record)
        
        # 2. Convert to JSON String (Handles DateTime -> String conversion automatically)
        json_str = model.json()
        
        # 3. Convert back to Python Dict (Now it's pure JSON data)
        clean_dict = json.loads(json_str)
        
        return clean_dict

    except ValidationError as e:
        print(f"CRITICAL: Template generation failed validation.\n{e}")
        raise e
