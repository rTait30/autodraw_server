"""Bisect-rotate normalized workpoint algorithm."""

import math
from typing import Dict, Any, List


def compute_workpoints_bisect_rotate_normalized(points_3d: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
    """Compute workpoints using bisect-rotate normalized method.

    Solves the 'dense points' issue by using an Edge-Weighted Perimeter Centroid instead of a simple vertex average or area centroid.
    Technique:
    1. Calculate the Perimeter Centroid (Center of the wireframe), weighted by edge length.
       - Dense points (short edges) contribute little to the total length, minimizing their influence.
       - Long edges dominant the centroid, centering it effectively in the 'main' body of the sail.
    2. Use this Normalized Centroid as the target for the Bisect-Rotate plane projection logic.
    """
    workpoints = {}
    count = len(points_3d)

    # 1. Calculate Edge-Weighted Perimeter Centroid
    # This replaces (cx_area, cy_area, cz) with a density-independent center.
    sum_Lx = 0.0
    sum_Ly = 0.0
    sum_Lz = 0.0
    total_length = 0.0

    for i in range(count):
        curr_p = points_3d[i]
        next_p = points_3d[(i + 1) % count]

        # Edge Vector
        dx = next_p["x"] - curr_p["x"]
        dy = next_p["y"] - curr_p["y"]
        dz = next_p["z"] - curr_p["z"]
        
        length = math.sqrt(dx*dx + dy*dy + dz*dz)
        if length < 1e-9:
            continue

        # Edge Midpoint
        mx = (curr_p["x"] + next_p["x"]) / 2.0
        my = (curr_p["y"] + next_p["y"]) / 2.0
        mz = (curr_p["z"] + next_p["z"]) / 2.0

        sum_Lx += length * mx
        sum_Ly += length * my
        sum_Lz += length * mz
        total_length += length
    
    if total_length > 1e-9:
        cx_norm = sum_Lx / total_length
        cy_norm = sum_Ly / total_length
        cz_norm = sum_Lz / total_length
    else:
        # Fallback to simple average if degenerate
        cx_norm = sum(p["x"] for p in points_3d) / count
        cy_norm = sum(p["y"] for p in points_3d) / count
        cz_norm = sum(p["z"] for p in points_3d) / count


    # 2. Iterate points to calculate workpoints
    for i in range(count):
        curr_p = points_3d[i]
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]

        # --- Standard Bisector Logic (Same as Workpoints Bisect Rotate) ---
        
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
        # Plane normal: n = bisector × Z = (bis_x, bis_y, 0) × (0, 0, 1) = (bis_y, -bis_x, 0)
        plane_nx = bis_y
        plane_ny = -bis_x

        # 3. Project NORMALIZED CENTROID onto this plane
        # Vector from corner to centroid
        to_centroid_x = cx_norm - curr_p["x"]
        to_centroid_y = cy_norm - curr_p["y"]
        to_centroid_z = cz_norm - curr_p["z"]

        # Dot product with plane normal (only XY components)
        dot = to_centroid_x * plane_nx + to_centroid_y * plane_ny

        # Projected point (relative to corner)
        proj_x = to_centroid_x - dot * plane_nx
        proj_y = to_centroid_y - dot * plane_ny
        proj_z = to_centroid_z

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

        workpoints[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}

    return workpoints
