"""Minimal surface workpoint algorithm."""

import math
from typing import Dict, Any, List


def compute_workpoints_minimal(points_3d: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
    """Compute workpoints using minimal surface method.

    Simulates membrane tension using Laplacian smoothing concept.
    Each corner is pulled toward the average position of ALL other corners,
    which approximates where a minimal surface would want to pull.
    Then blend with the bisector direction for local angle consideration.
    """
    workpoints_minimal = {}
    count = len(points_3d)

    for i in range(count):
        curr_p = points_3d[i]

        # Compute average position of all OTHER corners (Laplacian target)
        avg_x = 0.0
        avg_y = 0.0
        for j in range(count):
            if i == j:
                continue
            avg_x += points_3d[j]["x"]
            avg_y += points_3d[j]["y"]
        avg_x /= (count - 1)
        avg_y /= (count - 1)

        # Direction to Laplacian center
        lap_dx = avg_x - curr_p["x"]
        lap_dy = avg_y - curr_p["y"]
        lap_mag = math.hypot(lap_dx, lap_dy) or 1.0

        # Also compute bisector direction (local angle consideration)
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]

        v_in_x = curr_p["x"] - prev_p["x"]
        v_in_y = curr_p["y"] - prev_p["y"]
        v_in_mag = math.hypot(v_in_x, v_in_y) or 1.0

        v_out_x = next_p["x"] - curr_p["x"]
        v_out_y = next_p["y"] - curr_p["y"]
        v_out_mag = math.hypot(v_out_x, v_out_y) or 1.0

        # Normalize
        v_in_x /= v_in_mag
        v_in_y /= v_in_mag
        v_out_x /= v_out_mag
        v_out_y /= v_out_mag

        # Bisector (inward pointing)
        bis_x = -v_in_x + v_out_x
        bis_y = -v_in_y + v_out_y
        bis_mag = math.hypot(bis_x, bis_y)

        if bis_mag < 1e-9:
            # Straight line, use perpendicular
            bis_x = -v_in_y
            bis_y = v_in_x
            bis_mag = math.hypot(bis_x, bis_y) or 1.0

        bis_x /= bis_mag
        bis_y /= bis_mag

        # Reflex check
        cross_z = v_in_x * v_out_y - v_in_y * v_out_x
        if cross_z < -1e-9:  # Reflex in CW winding
            bis_x = -bis_x
            bis_y = -bis_y

        # Blend: 60% Laplacian (global surface), 40% Bisector (local angle)
        # This gives smooth global behavior with local angle respect
        blend_x = 0.6 * (lap_dx / lap_mag) + 0.4 * bis_x
        blend_y = 0.6 * (lap_dy / lap_mag) + 0.4 * bis_y
        blend_mag = math.hypot(blend_x, blend_y) or 1.0

        ux = blend_x / blend_mag
        uy = blend_y / blend_mag

        ta = curr_p["ta"]
        wx = curr_p["x"] + ux * ta
        wy = curr_p["y"] + uy * ta

        # Z: Project onto local plane
        v1x, v1y, v1z = prev_p["x"] - curr_p["x"], prev_p["y"] - curr_p["y"], prev_p["z"] - curr_p["z"]
        v2x, v2y, v2z = next_p["x"] - curr_p["x"], next_p["y"] - curr_p["y"], next_p["z"] - curr_p["z"]

        nx = v1y * v2z - v1z * v2y
        ny = v1z * v2x - v1x * v2z
        nz = v1x * v2y - v1y * v2x

        if abs(nz) > 1e-6:
            dx_w = wx - curr_p["x"]
            dy_w = wy - curr_p["y"]
            wz = curr_p["z"] - (nx * dx_w + ny * dy_w) / nz
        else:
            wz = curr_p["z"]

        workpoints_minimal[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}

    return workpoints_minimal