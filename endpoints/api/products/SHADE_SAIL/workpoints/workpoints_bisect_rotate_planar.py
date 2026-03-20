"""Bisect-rotate planar workpoint algorithm."""

import math
from typing import Dict, Any, List, Tuple


def _solve_3x3(matrix: List[List[float]], vector: List[float]) -> Tuple[float, float, float]:
    """Solve 3x3 linear system Mx = v using Cramer's rule.
    
    matrix is 3x3, vector is 3x1. normalized to float.
    Returns (x, y, z) tuple.
    """
    m = matrix
    # Determinant of M
    det_m = (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
             m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
             m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))

    if abs(det_m) < 1e-9:
        return None  # Singular matrix

    # Helper to replace column k with vector
    def det_replace_col(k, vec):
        tm = [row[:] for row in m]
        for r in range(3):
            tm[r][k] = vec[r]
        return (tm[0][0] * (tm[1][1] * tm[2][2] - tm[1][2] * tm[2][1]) -
                tm[0][1] * (tm[1][0] * tm[2][2] - tm[1][2] * tm[2][0]) +
                tm[0][2] * (tm[1][0] * tm[2][1] - tm[1][1] * tm[2][0]))

    x = det_replace_col(0, vector) / det_m
    y = det_replace_col(1, vector) / det_m
    z = det_replace_col(2, vector) / det_m
    return (x, y, z)


def compute_workpoints_bisect_rotate_planar(points_3d: List[Dict[str, Any]], cx_area: float, cy_area: float) -> Dict[str, Dict[str, float]]:
    """Compute workpoints using bisect-rotate planar method.

    Solves vertical displacement issues by fitting a mathematical plane to the sail corners.
    Technique:
    1. Determine the 'Planar Z' by fitting a least-squares plane (z = Ax + By + C) to all corner points.
    2. Use the 2D Area Centroid (cx_area, cy_area) as the XY target to handle 2D distribution properly.
    3. Calculate the target Z by projecting the Area Centroid onto the Best-Fit Plane.
    4. Project the Workpoints towards this 'Planar Center' using the standard Bisect-Rotate logic.

    This ensures the target center lies on the optimal flat surface passing through the points,
    ignoring lower/higher clusters that drag the simple average Z up or down inappropriately.
    """
    workpoints = {}
    count = len(points_3d)

    # 1. Fit Plane z = Ax + By + C
    # Construct Normal Equations for Least Squares
    sum_x = 0.0
    sum_y = 0.0
    sum_z = 0.0
    sum_xx = 0.0
    sum_yy = 0.0
    sum_xy = 0.0
    sum_xz = 0.0
    sum_yz = 0.0

    for p in points_3d:
        x, y, z = p["x"], p["y"], p["z"]
        sum_x += x
        sum_y += y
        sum_z += z
        sum_xx += x * x
        sum_yy += y * y
        sum_xy += x * y
        sum_xz += x * z
        sum_yz += y * z

    # Matrix M
    matrix = [
        [sum_xx, sum_xy, sum_x],
        [sum_xy, sum_yy, sum_y],
        [sum_x,  sum_y,  float(count)]
    ]
    # Vector v
    vector = [sum_xz, sum_yz, sum_z]

    # Solve for coeffs (A, B, C)
    coeffs = _solve_3x3(matrix, vector)
    
    if coeffs:
        A, B, C = coeffs
        # 2. Project Area Centroid onto Plane
        cz_planar = A * cx_area + B * cy_area + C
    else:
        # Fallback to simple average if plane fitting fails (e.g. vertical or degenerate)
        cz_planar = sum_z / count if count > 0 else 0


    # 3. Iterate points to calculate workpoints
    for i in range(count):
        curr_p = points_3d[i]
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]

        # --- Standard Bisector Logic ---
        
        # 1. Compute 2D bisector direction (XY plane only)
        v_in_x = curr_p["x"] - prev_p["x"]
        v_in_y = curr_p["y"] - prev_p["y"]
        v_in_mag = math.hypot(v_in_x, v_in_y) or 1.0
        v_in_x /= v_in_mag
        v_in_y /= v_in_mag

        v_out_x = next_p["x"] - curr_p["x"]
        v_out_y = next_p["y"] - curr_p["y"]
        v_out_mag = math.hypot(v_out_x, v_out_y) or 1.0
        v_out_x /= v_out_mag
        v_out_y /= v_out_mag

        bis_x = -v_in_x + v_out_x
        bis_y = -v_in_y + v_out_y
        bis_mag = math.hypot(bis_x, bis_y)

        if bis_mag < 1e-9:
            bis_x = -v_in_y
            bis_y = v_in_x
            bis_mag = math.hypot(bis_x, bis_y) or 1.0

        bis_x /= bis_mag
        bis_y /= bis_mag

        # Reflex check
        cross_z = v_in_x * v_out_y - v_in_y * v_out_x
        if cross_z < -1e-9:  # Reflex
            bis_x = -bis_x
            bis_y = -bis_y

        # 2. Create vertical plane containing bisector
        plane_nx = bis_y
        plane_ny = -bis_x

        # 3. Project PLANAR CENTER onto this plane
        # Vector from corner to planar center
        to_centroid_x = cx_area - curr_p["x"]
        to_centroid_y = cy_area - curr_p["y"]
        to_centroid_z = cz_planar - curr_p["z"]

        dot = to_centroid_x * plane_nx + to_centroid_y * plane_ny

        proj_x = to_centroid_x - dot * plane_nx
        proj_y = to_centroid_y - dot * plane_ny
        proj_z = to_centroid_z

        # 4. Direction
        proj_mag = math.sqrt(proj_x*proj_x + proj_y*proj_y + proj_z*proj_z)

        if proj_mag < 1e-9:
            ux, uy, uz = bis_x, bis_y, 0.0
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
