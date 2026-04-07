"""Centroid workpoint algorithm."""

import math
from typing import Dict, Any, List


def compute_workpoints_centroid(points, cx: float, cy: float, cz: float) -> Dict[str, Dict[str, float]]:
    """Compute workpoints using centroid method.

    Projects the workpoint inwards towards the centroid.
    """
    workpoints_centroid = {}

    for p in points:
        x, y, z, ta = p["x"], p["y"], p["z"], p["tensionAllowance"] or 0.0

        # Vector from point to centroid
        dx = cx - x
        dy = cy - y
        dz = cz - z

        mag = math.sqrt(dx*dx + dy*dy + dz*dz) or 1.0

        # Unit vector (Direction: Post -> Centroid)
        ux = dx / mag
        uy = dy / mag
        uz = dz / mag

        # Workpoint = Post + (Direction * Allowance)
        # Moves point INWARDS from the corner definition
        wx = x + ux * ta
        wy = y + uy * ta
        wz = z + uz * ta
        
        p.setdefault("workpoint_methods", {})
        p["workpoint_methods"]["centroid"] = {"x": wx, "y": wy, "z": wz}

    return workpoints_centroid
