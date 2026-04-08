"""TARPAULIN project calculations."""
import copy
from typing import Dict


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def _calc_eyelet_positions(length, mode, val):
    """Returns a list of positions (offsets) along an edge of given length."""
    if not val:
        return []
    try:
        val = float(val)
    except (TypeError, ValueError):
        return []

    positions = []
    if mode == 'count':
        count = int(val)
        if count <= 0:
            return []
        if count == 1:
            positions = [length / 2]
        else:
            step = length / (count - 1)
            # Ensure we hit exactly 0 and length despite float math
            positions = [i * step for i in range(count)]
    else:  # mode == 'spacing'
        if val <= 0:
            return []
        count = round(length / val)
        if count < 1: 
            count = 1
        
        real_spacing = length / count
        # For N spaces, we have N+1 points (0 to Length)
        num_points = int(count) + 1
        positions = [i * real_spacing for i in range(num_points)]

    return positions

def calculate(data: Dict) -> Dict:
    """Per-project TARPAULIN calculations.

    Expects payload shape including optional `products: [ { attributes: {...} }, ... ]`.
    Iterates each product, mutating its attributes in-place with derived fields.
    Returns the FULL (mutated) data payload so callers can pick updated products.
    """

    products = data.get("products") or []
    
    for i, product in enumerate(products):
        attrs = product.get("attributes") or {}
        if not isinstance(attrs, dict):
            continue

        calculated = copy.deepcopy(attrs)

        length = _num(calculated.get("length"))
        width = _num(calculated.get("width"))
        pocket = 25  # 25mm pocket on each side

        if length is not None and width is not None:
            # Original dimensions
            calculated["original_length"] = length
            calculated["original_width"] = width
            # With pocket
            final_length = length + 2 * pocket
            final_width = width + 2 * pocket
            calculated["final_length"] = final_length
            calculated["final_width"] = final_width
            
            # Perimeter of final
            calculated["perimeter"] = 2 * (final_length + final_width)
            # Area
            calculated["area"] = final_length * final_width

            # --- Calculate Eyelets ---
            calculated_eyelets = []
            sides = ["top", "bottom", "left", "right"]
            
            for side in sides:
                enabled = calculated.get(f"eyelet_{side}_enabled")
                if enabled:
                    mode = calculated.get(f"eyelet_{side}_mode", "spacing")
                    val = calculated.get(f"eyelet_{side}_val")
                    
                    # Determine edge length for this side
                    edge_len = final_length if side in ["top", "bottom"] else final_width
                    
                    offsets = _calc_eyelet_positions(edge_len, mode, val)
                    
                    for pos in offsets:
                        # Determine (x, y) relative to bottom-left (0,0) of the FINAL tarp
                        eyelet_data = {"side": side, "offset": pos}
                        
                        if side == "top":
                            eyelet_data["x"] = pos
                            eyelet_data["y"] = final_width
                        elif side == "bottom":
                            eyelet_data["x"] = pos
                            eyelet_data["y"] = 0
                        elif side == "left":
                            eyelet_data["x"] = 0
                            eyelet_data["y"] = pos
                        elif side == "right":
                            eyelet_data["x"] = final_length
                            eyelet_data["y"] = pos
                            
                        calculated_eyelets.append(eyelet_data)
            
            calculated["calculated_eyelets"] = calculated_eyelets

        product["calculated"] = calculated

    return data
