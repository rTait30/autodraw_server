"""Area centroid workpoint algorithm."""

import math
from typing import Dict, Any, List


def compute_workpoints_area_centroid(points_3d: List[Dict[str, Any]], cx_area: float, cy_area: float, cz: float) -> Dict[str, Dict[str, float]]:
    """Compute workpoints using area centroid method."""
    workpoints_area_centroid = {}

    for p in points_3d:
        label = p["label"]
        x, y, z, ta = p["x"], p["y"], p["z"], p["ta"]

        dx = cx_area - x
        dy = cy_area - y
        dz = cz - z

        mag = math.sqrt(dx*dx + dy*dy + dz*dz) or 1.0

        ux = dx / mag
        uy = dy / mag
        uz = dz / mag

        wx = x + ux * ta
        wy = y + uy * ta
        wz = z + uz * ta

        workpoints_area_centroid[label] = {"x": wx, "y": wy, "z": wz}

    return workpoints_area_centroid