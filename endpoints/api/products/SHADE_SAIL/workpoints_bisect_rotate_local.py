"""Bisect-rotate local workpoint algorithm."""

import math
from typing import Dict, Any, List


def compute_workpoints_bisect_rotate_local(points_3d: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
    """Compute workpoints using bisect-rotate local method.

    Solves the 'low centroid' issue by relying on local edge geometry.
    Technique:
    1. Calculate the true 3D angle bisector of the two adjacent edges.
    2. Calculate the 2D (XY) angle bisector to define the standard vertical workpoint plane.
    3. Project the 3D bisector onto this vertical plane.
    
    This ensures the hardware aligns vertically with the corner bisection (installation standard)
    while taking the vertical tilt from the immediate cables, ignoring distant low points.
    """
    workpoints = {}
    count = len(points_3d)

    for i in range(count):
        curr_p = points_3d[i]
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]

        # 1. Compute 3D Bisector direction (based on local edges)
        # Vector IN (prev -> curr)
        vin_x = curr_p["x"] - prev_p["x"]
        vin_y = curr_p["y"] - prev_p["y"]
        vin_z = curr_p["z"] - prev_p["z"]
        vin_mag = math.sqrt(vin_x**2 + vin_y**2 + vin_z**2) or 1.0
        vin_x /= vin_mag
        vin_y /= vin_mag
        vin_z /= vin_mag

        # Vector OUT (curr -> next)
        vout_x = next_p["x"] - curr_p["x"]
        vout_y = next_p["y"] - curr_p["y"]
        vout_z = next_p["z"] - curr_p["z"]
        vout_mag = math.sqrt(vout_x**2 + vout_y**2 + vout_z**2) or 1.0
        vout_x /= vout_mag
        vout_y /= vout_mag
        vout_z /= vout_mag

        # 3D Bisector (sum of negated incoming and outgoing unit vectors)
        b3_x = -vin_x + vout_x
        b3_y = -vin_y + vout_y
        b3_z = -vin_z + vout_z
        b3_mag = math.sqrt(b3_x**2 + b3_y**2 + b3_z**2)

        if b3_mag < 1e-9:
            # Degenerate/Straight line fallback
            b3_x, b3_y, b3_z = 0, 0, 1
        else:
            b3_x /= b3_mag
            b3_y /= b3_mag
            b3_z /= b3_mag

        # 2. Compute 2D Bisector (XY Only) for the vertical plane orientation
        # (This is consistent with the original bisect-rotate logic for plan-view alignment)
        
        # 2D Unit Vectors
        v2in_mag = math.hypot(vin_x, vin_y) or 1.0
        v2in_x = vin_x / v2in_mag
        v2in_y = vin_y / v2in_mag
        
        v2out_mag = math.hypot(vout_x, vout_y) or 1.0
        v2out_x = vout_x / v2out_mag
        v2out_y = vout_y / v2out_mag

        b2_x = -v2in_x + v2out_x
        b2_y = -v2in_y + v2out_y
        b2_mag = math.hypot(b2_x, b2_y)

        if b2_mag < 1e-9:
            b2_x = -v2in_y
            b2_y = v2in_x
            b2_mag = math.hypot(b2_x, b2_y) or 1.0
        
        b2_x /= b2_mag
        b2_y /= b2_mag

        # Reflex Angle Check (keep consistent winding)
        cross_z = v2in_x * v2out_y - v2in_y * v2out_x
        if cross_z < -1e-9:
            b2_x = -b2_x
            b2_y = -b2_y

        # 3. Project 3D Bisector onto Vertical Plane defined by 2D Bisector
        # Vertical Plane Normal in XY = (-b2_y, b2_x, 0)
        plane_nx = -b2_y
        plane_ny = b2_x
        
        # Dot product of 3D bisector with Plane Normal (removes sideways tilt)
        dot = b3_x * plane_nx + b3_y * plane_ny # + b3_z*0
        
        # Final Vector
        ux = b3_x - dot * plane_nx
        uy = b3_y - dot * plane_ny
        uz = b3_z # Z is unaffected as plane is vertical
        
        f_mag = math.sqrt(ux*ux + uy*uy + uz*uz)
        if f_mag < 1e-9:
            ux, uy, uz = b2_x, b2_y, 0.0
        else:
            ux /= f_mag
            uy /= f_mag
            uz /= f_mag

        # Apply Tension Allowance
        ta = curr_p["ta"]
        wx = curr_p["x"] + ux * ta
        wy = curr_p["y"] + uy * ta
        wz = curr_p["z"] + uz * ta

        workpoints[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}

    return workpoints
