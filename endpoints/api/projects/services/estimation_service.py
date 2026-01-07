from estimation import estimate_price_from_schema
from models import SKU

def estimate_project_total(project):
    """
    Estimates the total price of the project based on its schema and products.
    Updates the project's estimate_total and each product's estimate_total.
    
    Now includes SKU lookup and correct Margin/Contingency application 
    to match the frontend EstimateTable.jsx logic.
    """
    if not project.estimate_schema:
        return 0.0

    grand_total = 0.0
    products = project.products
    
    # Pre-fetch all SKUs mentioned in schema
    # 1. Collect all SKU codes from schema
    sku_codes = set()
    schema = project.estimate_schema
    if isinstance(schema, dict):
         for rows in schema.values():
             if isinstance(rows, list):
                 for row in rows:
                     if isinstance(row, dict) and row.get("type") == "sku" and row.get("sku"):
                         sku_codes.add(row.get("sku"))
                         
    # 2. Fetch from DB
    loaded_skus = {}
    if sku_codes:
        # If we had a direct SKU query available here without imports cycle...
        # Project -> models -> db ... safe to import SKU from models here? Yes.
        found_skus = SKU.query.filter(SKU.sku.in_(sku_codes)).all()
        for s in found_skus:
            loaded_skus[s.sku] = s
    
    for pp in products:
        # Merge attributes and calculated values for the evaluation context
        # This matches frontend behavior where both are often available or merged
        # We provide flat access (e.g. "perimeter") and scoped access (e.g. "calculated.perimeter")
        eval_context = (pp.attributes or {}).copy()
        eval_context.update(pp.calculated or {})
        eval_context["attributes"] = pp.attributes or {}
        eval_context["calculated"] = pp.calculated or {}

        res = estimate_price_from_schema(
            project.estimate_schema, 
            eval_context,
            skus=loaded_skus
        ) or {}
        
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
