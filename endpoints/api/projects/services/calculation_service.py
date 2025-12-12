from endpoints.api.products import dispatch_calculation as dispatch

def calculate_project(product_name, data):
    """
    Dispatches calculation to the appropriate product module.
    
    Args:
        product_name: The name of the product (e.g., "COVER").
        data: The project data dictionary.
        
    Returns:
        The enriched data dictionary.
    """
    return dispatch(product_name, data) or {}
