"""RECTANGLES product calculations."""
from typing import Dict


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def calculate(data: Dict) -> Dict:
    """Per-project RECTANGLES calculations.
    
    Expects payload with 'project_attributes' containing 'rectangles' list and nesting params.
    Calls nest_rectangles_logic and returns placements in the response.
    """
    project_attrs = data.get("project_attributes") or {}
    rectangles = project_attrs.get("rectangles") or []
    fabric_width = _num(project_attrs.get("fabricWidth")) or 1500
    allow_rotation = bool(project_attrs.get("allowRotation")) if "allowRotation" in project_attrs else True
    fabric_roll_length = _num(project_attrs.get("fabricRollLength")) or 50000

    # Prepare rectangles for nesting
    nest_rects = []
    meta_map = {}
    for i, rect in enumerate(rectangles):
        width = _num(rect.get("width"))
        height = _num(rect.get("height"))
        label = rect.get("label") or f"R{i+1}"
        quantity = int(_num(rect.get("quantity")) or 1)
        if width is None or height is None or quantity < 1:
            continue
        for q in range(quantity):
            rect_label = f"{label}_Q{q+1}" if quantity > 1 else label
            nest_rects.append({
                "width": width,
                "height": height,
                "label": rect_label,
                "quantity": 1
            })
            meta_map[rect_label] = {
                "width": width,
                "height": height,
                "base": label,
                "rectIndex": i
            }

    data["project_attributes"]["all_rectangles"] = nest_rects
    data["project_attributes"]["all_meta_map"] = meta_map

    # Perform nesting if we have rectangles
    if nest_rects:
        try:
            from endpoints.api.projects.nest import nest_rectangles_logic
            nest_result = nest_rectangles_logic(
                rectangles=nest_rects,
                fabric_height=int(fabric_width),  # renamed for consistency
                allow_rotation=allow_rotation,
                fabric_roll_length=int(fabric_roll_length) if fabric_roll_length else None
            )
            # Distribute nest placements back to meta_map
            for label, placement in (nest_result.get("panels") or {}).items():
                mm = meta_map.get(label)
                if not mm:
                    continue
                mm["x"] = placement.get("x")
                mm["y"] = placement.get("y")
                mm["rotated"] = bool(placement.get("rotated", False))
            data["project_attributes"]["nest"] = nest_result
            data["project_attributes"]["nested_panels"] = meta_map
        except Exception as e:
            print(f"[RECTANGLES] Nesting error: {e}")
            data["project_attributes"]["nestError"] = str(e)

    return data

__all__ = ["calculate"]
