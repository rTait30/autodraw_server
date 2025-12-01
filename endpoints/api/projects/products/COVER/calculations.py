"""COVER project calculations."""
from typing import Dict


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def calculate(data: Dict) -> Dict:
    """Per-project COVER calculations.

    Expects payload shape including optional `products: [ { attributes: {...} }, ... ]`.
    Iterates each product, mutating its attributes in-place with derived fields.
    Returns the FULL (mutated) data payload so callers can pick updated products.
    """

    print (data)

    products = data.get("products") or []
    
    # Aggregate all rectangles and metadata across ALL products for nesting
    all_rectangles = []
    all_meta_map = {}
    min_allowance = 200
    
    for i, product in enumerate(products):
        attrs = product.get("attributes") or {}
        if not isinstance(attrs, dict):
            continue

            #STEP 1: FLATTEN PANELS

        length = _num(attrs.get("length"))
        width = _num(attrs.get("width"))
        height = _num(attrs.get("height"))
        seam = _num(attrs.get("seam")) or 0
        hem = _num(attrs.get("hem"))
        fabric_width = _num(attrs.get("fabricWidth")) or 1500
        quantity = max(1, int(_num(attrs.get("quantity")) or 1))

        if length is not None and width is not None:
            attrs["perimeter"] = 2 * (length + width)
        if width is not None and seam is not None:
            attrs["flatMainHeight"] = width + 2 * seam
        if hem is not None and height is not None and length is not None:
            attrs["flatMainWidth"] = 2 * hem + (height * 2) + length
        if height is not None and seam is not None:
            attrs["flatSideWidth"] = height + seam
        if length is not None and seam is not None:
            attrs["flatSideHeight"] = length + (seam * 2)

        fmw = _num(attrs.get("flatMainWidth"))
        fsw = _num(attrs.get("flatSideWidth"))
        fsh = _num(attrs.get("flatSideHeight"))
        if fmw is not None and fsw is not None and fsh is not None:
            attrs["totalSeamLength"] = 2 * fmw + 2 * fsw + 4 * fsh

        fmh = _num(attrs.get("flatMainHeight"))
        if fmw is not None and fmh is not None:
            attrs["areaMainM2"] = (fmw * fmh) / 1_000_000
        if fsw is not None and fsh is not None:
            attrs["areaSideM2"] = (fsw * fsh) / 1_000_000
        area_main = _num(attrs.get("areaMainM2"))
        area_side = _num(attrs.get("areaSideM2"))
        if area_main is not None and area_side is not None:
            attrs["totalFabricArea"] = area_main + 2 * area_side

            # STEP 2: SPLIT PANELS IF NEEDED
        
        panels_list = [
            {"id": "MAIN", "w": fmw or 0, "h": fmh or 0},
            {"id": "SIDE_L", "w": fsw or 0, "h": fsh or 0},
            {"id": "SIDE_R", "w": fsw or 0, "h": fsh or 0},
        ]
        
        product_meta_map = {}
        
        for panel in panels_list:
            if not (panel["w"] > 0 and panel["h"] > 0):
                continue
                
            if panel["h"] > fabric_width:
                # Split panel if too tall
                try:
                    parts = _split_panel_if_needed(
                        panel["w"], panel["h"], fabric_width, min_allowance, seam
                    )
                    for part in parts:
                        suffix = "TOP" if part.get("hasSeam") == "top" else ("BOTTOM" if part.get("hasSeam") == "bottom" else "PART")
                        for q in range(1, quantity + 1):
                            label = f"P{i + 1}_{panel['id']}_{suffix}_Q{q}"
                            rect = {
                                "width": part["width"],
                                "height": part["height"],
                                "label": label,
                                "quantity": 1
                            }
                            meta = {
                                "width": part["width"],
                                "height": part["height"],
                                "base": panel["id"],
                                "productIndex": i,
                                "hasSeam": part.get("hasSeam", "no")
                            }
                            all_rectangles.append(rect)
                            all_meta_map[label] = meta
                            product_meta_map[label] = meta
                except ValueError:
                    # If split fails, skip this panel
                    continue
            else:
                # Panel fits, create quantity copies
                for q in range(1, quantity + 1):
                    label = f"P{i + 1}_{panel['id']}_Q{q}"
                    rect = {
                        "width": panel["w"],
                        "height": panel["h"],
                        "label": label,
                        "quantity": 1
                    }
                    meta = {
                        "width": panel["w"],
                        "height": panel["h"],
                        "base": panel["id"],
                        "productIndex": i
                    }
                    all_rectangles.append(rect)
                    all_meta_map[label] = meta
                    product_meta_map[label] = meta
        
        # Store this product's panels metadata in its attributes
        attrs["panels"] = product_meta_map
        product["attributes"] = attrs

    # Store aggregated nesting data at project level for cross-product nesting
    if not data.get("project_attributes"):
        data["project_attributes"] = {}
    data["project_attributes"]["all_rectangles"] = all_rectangles
    data["project_attributes"]["all_meta_map"] = all_meta_map

    # Perform nesting if we have rectangles
    if all_rectangles:
        max_fabric_width = max(
            (_num(p.get("attributes", {}).get("fabricWidth")) or 1500)
            for p in products
        )
        max_roll_length = max(
            (_num(p.get("attributes", {}).get("fabricRollLength")) or 50000)
            for p in products
        )
        # Convert to integers for nesting
        max_fabric_width = int(max_fabric_width)
        max_roll_length = int(max_roll_length) if max_roll_length else None
        
        try:
            # Call nesting logic directly (no HTTP request)
            from endpoints.api.projects.nest import nest_rectangles_logic
            
            nest_result = nest_rectangles_logic(
                rectangles=all_rectangles,
                fabric_height=max_fabric_width,
                allow_rotation=True,
                fabric_roll_length=max_roll_length
            )
            
            # Distribute nest placements back to individual products
            for label, placement in (nest_result.get("panels") or {}).items():
                mm = all_meta_map.get(label)
                if not mm:
                    continue
                prod = products[mm["productIndex"]]
                if not prod:
                    continue
                attr = prod.get("attributes") or {}
                if not attr.get("panels"):
                    attr["panels"] = {}
                attr["panels"][label] = {
                    "width": mm["width"],
                    "height": mm["height"],
                    "base": mm["base"],
                    "x": placement.get("x"),
                    "y": placement.get("y"),
                    "rotated": bool(placement.get("rotated", False))
                }
                prod["attributes"] = attr
            
            # Store project-level nest result
            data["project_attributes"]["nest"] = nest_result
            data["project_attributes"]["nested_panels"] = all_meta_map
            
        except Exception as e:
            print(f"[COVER] Nesting error: {e}")
            data["project_attributes"]["nestError"] = str(e)

    return data

__all__ = ["calculate"]


def _split_panel_if_needed(width, height, fabric_width, min_allowance, seam):
    """Split panel if height exceeds fabric width.
    
    Returns list of panel parts with width, height, and hasSeam indicator.
    Normalizes orientation (shorter side = height) before splitting.
    """
    rotated = False
    
    # Normalize: shorter side = height
    if width < height:
        width, height = height, width
        rotated = True
    
    # Case 1: Fits without split
    if height <= fabric_width:
        return [{
            "width": width,
            "height": height,
            "hasSeam": "no",
            "rotated": rotated
        }]
    
    # Preferred: small panel gets minAllowance + seam
    small_panel_total = min_allowance + seam
    main_panel = height - min_allowance
    
    if main_panel <= fabric_width:
        return [
            {
                "width": width,
                "height": main_panel,
                "hasSeam": "bottom",
                "rotated": rotated
            },
            {
                "width": width,
                "height": small_panel_total,
                "hasSeam": "top",
                "rotated": rotated
            }
        ]
    
    # Fallback: main panel = fabricWidth, small gets rest + seam
    main_fallback = fabric_width
    small_panel_body = height - main_fallback
    small_fallback_total = small_panel_body + 25
    
    if small_panel_body >= min_allowance:
        return [
            {
                "width": width,
                "height": main_fallback,
                "hasSeam": "top",
                "rotated": rotated
            },
            {
                "width": width,
                "height": small_fallback_total,
                "hasSeam": "bottom",
                "rotated": rotated
            }
        ]
    
    raise ValueError("Cannot split panel with given constraints")
