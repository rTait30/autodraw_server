from typing import Any, Dict


def get_materials_labour(data: Dict[str, Any]) -> Dict[str, Dict[str, Dict[str, Any]]]:
    products = data.get("products") or []
    total_corners = 0

    for sail in products:
        attributes = sail.get("attributes") or {}

        try:
            point_count = int(attributes.get("pointCount") or 0)
        except (TypeError, ValueError):
            point_count = 0

        if point_count <= 0:
            points = attributes.get("points") or []
            point_count = len(points)

        total_corners += point_count

    materials: Dict[str, Dict[str, Any]] = {}
    if total_corners > 0:
        materials["PRO-RIG"] = {
            "name": "Pro-Rig",
            "quantity": total_corners,
            "unit": "ea",
        }

    return {
        "materials": materials,
        "labour": {},
    }
