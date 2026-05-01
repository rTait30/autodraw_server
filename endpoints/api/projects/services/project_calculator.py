from endpoints.api.products import dispatch_calculation
from endpoints.api.projects.services.estimation_service import estimate_project_total

def calculate_project_metrics(project_name, calc_input):
    return dispatch_calculation(project_name, calc_input) or {}

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
