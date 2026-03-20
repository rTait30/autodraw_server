"""Midpoint workpoint algorithm."""

import math
from typing import Dict, Any, List


def compute_workpoints_midpoint(points_3d: List[Dict[str, Any]], cx_area: float, cy_area: float, cz: float) -> Dict[str, Dict[str, float]]:
    """Compute workpoints using planar midpoint method.

    Addresses "vertical corner" distortion and "reflex angle" stability.
    Uses 2D Median (Vector to midpoint of neighbors), corrected for reflex,
    with Z projected onto the local corner plane.
    IMPROVED: When neighbors are too close, extend to further neighbors or use centroid blend.
    """
    workpoints_midpoint = {}
    count = len(points_3d)

    # Minimum distance threshold - if neighbors are closer than this, extend search
    MIN_NEIGHBOR_DIST = 500.0  # 500mm minimum meaningful distance

    for i in range(count):
        curr_p = points_3d[i]
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]

        # Check if neighbors are too close to the current point
        dist_to_prev = math.hypot(prev_p["x"] - curr_p["x"], prev_p["y"] - curr_p["y"])
        dist_to_next = math.hypot(next_p["x"] - curr_p["x"], next_p["y"] - curr_p["y"])

        # If both neighbors are very close, use extended neighbors
        if dist_to_prev < MIN_NEIGHBOR_DIST and dist_to_next < MIN_NEIGHBOR_DIST:
            # Look further - use 2nd neighbors
            prev_p = points_3d[(i - 2 + count) % count]
            next_p = points_3d[(i + 2) % count]
        elif dist_to_prev < MIN_NEIGHBOR_DIST:
            # Just prev is close, extend prev
            prev_p = points_3d[(i - 2 + count) % count]
        elif dist_to_next < MIN_NEIGHBOR_DIST:
            # Just next is close, extend next
            next_p = points_3d[(i + 2) % count]

        # 1. Planar Midpoint of Neighbors
        mx = (prev_p["x"] + next_p["x"]) / 2.0
        my = (prev_p["y"] + next_p["y"]) / 2.0

        # Vector from Corner to Midpoint
        dx = mx - curr_p["x"]
        dy = my - curr_p["y"]

        # 2. Reflex Check (Assuming Clockwise Winding)
        # Use original immediate neighbors for reflex check
        orig_prev = points_3d[(i - 1 + count) % count]
        orig_next = points_3d[(i + 1) % count]
        v_in_x = curr_p["x"] - orig_prev["x"]
        v_in_y = curr_p["y"] - orig_prev["y"]
        v_out_x = orig_next["x"] - curr_p["x"]
        v_out_y = orig_next["y"] - curr_p["y"]

        # Cross Product (2D)
        # Positive = Right Turn (Convex in CW)
        # Negative = Left Turn (Reflex in CW)
        cross_z = v_in_x * v_out_y - v_in_y * v_out_x

        is_reflex = cross_z < -1e-9

        if is_reflex:
            # For reflex, the median points "Inwards" (into the fabric).
            # We want to pull "Outwards". Flip the vector.
            dx = -dx
            dy = -dy

        dist_2d = math.hypot(dx, dy)
        if dist_2d < MIN_NEIGHBOR_DIST / 2.0:
            # Still too close - blend with area centroid direction
            centroid_dx = cx_area - curr_p["x"]
            centroid_dy = cy_area - curr_p["y"]
            # Blend: 50% midpoint, 50% centroid
            dx = dx + centroid_dx
            dy = dy + centroid_dy
            dist_2d = math.hypot(dx, dy) or 1.0

        # Normalize 2D Direction
        ux = dx / dist_2d
        uy = dy / dist_2d

        ta = curr_p["ta"]

        # 3. Calculate Workpoint X/Y
        wx = curr_p["x"] + ux * ta
        wy = curr_p["y"] + uy * ta

        # 4. Calculate Workpoint Z (Project onto Local Plane P-C-N)
        # Normal N = (P-C) x (N-C)
        v1x, v1y, v1z = prev_p["x"] - curr_p["x"], prev_p["y"] - curr_p["y"], prev_p["z"] - curr_p["z"]
        v2x, v2y, v2z = next_p["x"] - curr_p["x"], next_p["y"] - curr_p["y"], next_p["z"] - curr_p["z"]

        nx = v1y * v2z - v1z * v2y
        ny = v1z * v2x - v1x * v2z
        nz = v1x * v2y - v1y * v2x # This is effectively cross_z

        # Plane Eq: nx(x-cx) + ny(y-cy) + nz(z-cz) = 0
        # We know wx, wy. Solve for wz.
        # nz(wz - cz) = -nx(wx - cx) - ny(wy - cy)
        # wz = cz - (nx*dx_w + ny*dy_w) / nz

        # Use a soft threshold for nz to avoid divide by zero (vertical planes or straight lines)
        if abs(nz) > 1e-6:
            dx_w = wx - curr_p["x"]
            dy_w = wy - curr_p["y"]
            wz = curr_p["z"] - (nx * dx_w + ny * dy_w) / nz
        else:
            # Fallback for vertical/degenerate conditions:
            # Use average Z slope of neighbors
            # dist_prev = hypot(v1x, v1y)
            # dist_next = hypot(v2x, v2y)
            # if dist_prev > 1e-6 and dist_next > 1e-6:
            #    slope = ((v1z/dist_prev) + (v2z/dist_next)) / 2.0
            #    wz = curr_p["z"] + slope * ta
            # else:
            wz = curr_p["z"]

        workpoints_midpoint[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}

    return workpoints_midpoint