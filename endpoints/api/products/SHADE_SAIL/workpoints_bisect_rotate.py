"""Bisect-rotate workpoint algorithm."""

import math
from typing import Dict, Any, List


def compute_workpoints_bisect_rotate(points_3d: List[Dict[str, Any]], cx_area: float, cy_area: float, cz: float) -> Dict[str, Dict[str, float]]:
    """Compute workpoints using bisect-rotate method.

    Manual technique simulation:
    1. Bisect the corner angle (like bisect algorithm) to get horizontal direction
    2. Create a vertical plane containing this bisector direction
    3. Project the area centroid onto this plane
    4. Workpoint direction goes toward the projected centroid
    This constrains direction to the bisector's vertical slice while aiming at area centroid.
    """
    workpoints_bisect_rotate = {}
    count = len(points_3d)

    for i in range(count):
        curr_p = points_3d[i]
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]

        # 1. Compute 2D bisector direction (XY plane only)
        # Vector from prev to curr (incoming edge)
        v_in_x = curr_p["x"] - prev_p["x"]
        v_in_y = curr_p["y"] - prev_p["y"]
        v_in_mag = math.hypot(v_in_x, v_in_y) or 1.0
        v_in_x /= v_in_mag
        v_in_y /= v_in_mag

        # Vector from curr to next (outgoing edge)
        v_out_x = next_p["x"] - curr_p["x"]
        v_out_y = next_p["y"] - curr_p["y"]
        v_out_mag = math.hypot(v_out_x, v_out_y) or 1.0
        v_out_x /= v_out_mag
        v_out_y /= v_out_mag

        # Bisector = sum of negated incoming and outgoing unit vectors
        bis_x = -v_in_x + v_out_x
        bis_y = -v_in_y + v_out_y
        bis_mag = math.hypot(bis_x, bis_y)

        if bis_mag < 1e-9:
            # Straight line - use perpendicular to edge
            bis_x = -v_in_y
            bis_y = v_in_x
            bis_mag = math.hypot(bis_x, bis_y) or 1.0

        bis_x /= bis_mag
        bis_y /= bis_mag

        # Reflex check - if reflex angle, flip bisector outward
        cross_z = v_in_x * v_out_y - v_in_y * v_out_x
        if cross_z < -1e-9:  # Reflex in CW winding
            bis_x = -bis_x
            bis_y = -bis_y

        # 2. Create vertical plane containing bisector
        # Plane passes through curr_p, with normal perpendicular to bisector (in XY) and perpendicular to Z
        # Plane normal: n = bisector × Z = (bis_x, bis_y, 0) × (0, 0, 1) = (bis_y, -bis_x, 0)
        plane_nx = bis_y
        plane_ny = -bis_x
        # plane_nz = 0 (horizontal normal = vertical plane)

        # 3. Project area centroid onto this plane
        # Plane equation: plane_nx*(x - curr_x) + plane_ny*(y - curr_y) = 0
        # Project point P onto plane: P_proj = P - ((P-curr) · n) * n
        # Vector from corner to area centroid
        to_centroid_x = cx_area - curr_p["x"]
        to_centroid_y = cy_area - curr_p["y"]
        to_centroid_z = cz - curr_p["z"]

        # Dot product with plane normal (only XY components since nz=0)
        dot = to_centroid_x * plane_nx + to_centroid_y * plane_ny

        # Projected point (relative to corner)
        proj_x = to_centroid_x - dot * plane_nx
        proj_y = to_centroid_y - dot * plane_ny
        proj_z = to_centroid_z  # Z unchanged by horizontal normal

        # 4. Direction from corner to projected centroid
        proj_mag = math.sqrt(proj_x*proj_x + proj_y*proj_y + proj_z*proj_z)

        if proj_mag < 1e-9:
            # Fallback to bisector direction with no Z tilt
            ux = bis_x
            uy = bis_y
            uz = 0.0
        else:
            ux = proj_x / proj_mag
            uy = proj_y / proj_mag
            uz = proj_z / proj_mag

        # Apply tension allowance
        ta = curr_p["ta"]
        wx = curr_p["x"] + ux * ta
        wy = curr_p["y"] + uy * ta
        wz = curr_p["z"] + uz * ta

        workpoints_bisect_rotate[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}

    return workpoints_bisect_rotate