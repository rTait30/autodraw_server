from estimation import estimate_price_from_schema

def estimate_project_total(project):
    """
    Estimates the total price of the project based on its schema and products.
    Updates the project's estimate_total and each product's estimate_total.
    """
    if not project.estimate_schema:
        return 0.0

    grand_total = 0.0
    # We iterate over the products relationship if available, or query if not loaded?
    # Assuming project.products is populated or we can query.
    # In project_service, it was using ProjectProduct.query.filter_by(project_id=project.id)
    # But if we pass the project object, we should use the relationship if possible.
    
    products = project.products
    
    for pp in products:
        res = estimate_price_from_schema(project.estimate_schema, pp.attributes or {}) or {}
        totals = res.get("totals") or {}
        item_total = (
            totals.get("grand_total")
            or totals.get("grandTotal")
            or totals.get("total")
            or 0.0
        )
        pp.estimate_total = float(item_total)
        grand_total += float(item_total)
    
    project.estimate_total = grand_total
    return grand_total
