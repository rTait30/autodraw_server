from estimation import estimate_price_from_schema, evaluate_schema_structure
from models import SKU

def estimate_project_total(project):
    """
    Estimates the total price of the project based on its schema and products.
    Updates:
      - project.estimate_total
      - project.estimate_schema_evaluated (New structured data for frontend)
      - product.estimate_total (for each product)
    """
    if not project.estimate_schema:
        return 0.0

    grand_total = 0.0
    products = project.products
    evaluated_items = []
    
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
        found_skus = SKU.query.filter(SKU.sku.in_(sku_codes)).all()
        for s in found_skus:
            loaded_skus[s.sku] = s
    
    for i, pp in enumerate(products):
        # Merge attributes and calculated values for the evaluation context
        eval_context = (pp.attributes or {}).copy()
        eval_context.update(pp.calculated or {})
        eval_context["attributes"] = pp.attributes or {}
        eval_context["calculated"] = pp.calculated or {}

        # 1. EVALUATE STRUCTURE (for storage & frontend)
        evaluated_struct = evaluate_schema_structure(
            project.estimate_schema,
            eval_context,
            skus=loaded_skus
        )
        
        # Extract constants for this item
        consts = evaluated_struct.get("_constants", {})
        contingency_pct = consts.get("contingencyPercent", 3)
        margin_pct = consts.get("marginPercent", 45)
        
        # Calculate item total from the evaluated structure to maintain consistency
        item_base_cost = 0.0
        for section_rows in evaluated_struct.get("sections", {}).values():
            for row in section_rows:
                if row.get("type") in ("row", "sku"):
                     q = float(row.get("quantity", 0))
                     c = float(row.get("unitCost", 0))
                     item_base_cost += (q * c)

        contingency_amt = item_base_cost * (contingency_pct / 100.0)
        # Margin formula: Cost / (1 - Margin%)
        if abs(1.0 - margin_pct/100.0) > 0.001:
            item_sell_price = (item_base_cost + contingency_amt) / (1.0 - margin_pct / 100.0)
        else:
            item_sell_price = item_base_cost + contingency_amt

        # Update product total
        pp.estimate_total = float(item_sell_price)
        grand_total += float(item_sell_price)

        # Add to list for project-level JSON
        evaluated_items.append({
            "id": pp.id or f"new_{i}",
            "name": pp.label or f"Item {i+1}",
            "contingencyPercent": contingency_pct,
            "marginPercent": margin_pct,
            "sections": evaluated_struct.get("sections", {})
        })
    
    # Save the structured evaluation
    project.estimate_schema_evaluated = { "items": evaluated_items }
    project.estimate_total = grand_total
    
    return grand_total


def estimate_payload(product_id, payload_data, schema=None):
    """
    Perform estimation on a raw dictionary payload (e.g. from calculation preview).
    Returns the evaluated structure (JSON dict).
    """
    
    # 1. Resolve Schema
    if not schema:
        # Try to find a default schema for the product
        # Avoid circular imports if possible, or perform query here
        from models import Product, EstimatingSchema, db
        product = db.session.get(Product, product_id)
        if product and product.default_schema:
            schema = product.default_schema.data
        else:
            return None # No schema, no estimate
            
    # 2. Extract Data
    project_attrs = payload_data.get("project_attributes") or {}
    products_list = payload_data.get("products") or []
    
    # 3. Pre-fetch SKUs (similar to estimate_project_total)
    sku_codes = set()
    if isinstance(schema, dict):
         for rows in schema.values():
             if isinstance(rows, list):
                 for row in rows:
                     if isinstance(row, dict) and row.get("type") == "sku" and row.get("sku"):
                         sku_codes.add(row.get("sku"))
    
    loaded_skus = {}
    if sku_codes:
        from models import SKU
        found_skus = SKU.query.filter(SKU.sku.in_(sku_codes)).all()
        for s in found_skus:
            loaded_skus[s.sku] = s

    # 4. Evaluate Items
    evaluated_items = []
    grand_total = 0.0

    from estimation import evaluate_schema_structure
    
    for i, pp in enumerate(products_list):
        # Allow dict access
        attrs = pp.get("attributes") or {}
        calc = pp.get("calculated") or {}
        
        eval_context = attrs.copy()
        eval_context.update(calc)
        eval_context["attributes"] = attrs
        eval_context["calculated"] = calc
        
        evaluated_struct = evaluate_schema_structure(
            schema,
            eval_context,
            skus=loaded_skus
        )
        
        # Calculate totals for this item
        consts = evaluated_struct.get("_constants", {})
        contingency_pct = consts.get("contingencyPercent", 3)
        margin_pct = consts.get("marginPercent", 45)
        
        item_base_cost = 0.0
        for section_rows in evaluated_struct.get("sections", {}).values():
            for row in section_rows:
                if row.get("type") in ("row", "sku"):
                     q = float(row.get("quantity", 0))
                     c = float(row.get("unitCost", 0))
                     item_base_cost += (q * c)

        contingency_amt = item_base_cost * (contingency_pct / 100.0)
        
        if abs(1.0 - margin_pct/100.0) > 0.001:
            item_sell_price = (item_base_cost + contingency_amt) / (1.0 - margin_pct / 100.0)
        else:
            item_sell_price = item_base_cost + contingency_amt

        grand_total += item_sell_price
        
        evaluated_items.append({
            "id": pp.get("id") or f"temp_{i}",
            "name": pp.get("label") or f"Item {i+1}",
            "contingencyPercent": contingency_pct,
            "marginPercent": margin_pct,
            "sections": evaluated_struct.get("sections", {})
        })
        
    return { "items": evaluated_items }
