"""Weighted workpoint algorithm."""

import math
from typing import Dict, Any, List


def compute_workpoints_weighted(points_3d: List[Dict[str, Any]], cx_area: float, cy_area: float) -> Dict[str, Dict[str, float]]:
    """Compute workpoints using edge-tension weighted method.

    IMPROVED: Instead of point-to-point, compute tension toward EDGES.
    Each corner is pulled toward the "opposite" edges of the sail.
    Closer edges have less weight (they're already connected), distant edges pull more.
    This gives E and D more vertical pull toward the A-B edge.
    """
    workpoints_weighted = {}
    count = len(points_3d)

    # Build list of edges as line segments (each edge connects two adjacent points)
    edges_list = []
    for j in range(count):
        p1 = points_3d[j]
        p2 = points_3d[(j + 1) % count]
        edges_list.append((p1, p2, j, (j + 1) % count))

    for i in range(count):
        curr_p = points_3d[i]

        weighted_sum_x = 0.0
        weighted_sum_y = 0.0
        total_weight = 0.0

        # For each edge, compute distance and direction from current point to edge midpoint
        for (ep1, ep2, idx1, idx2) in edges_list:
            # Skip edges that include this corner (adjacent edges)
            if idx1 == i or idx2 == i:
                continue

            # Edge midpoint
            emx = (ep1["x"] + ep2["x"]) / 2.0
            emy = (ep1["y"] + ep2["y"]) / 2.0

            # Vector from corner to edge midpoint
            dx = emx - curr_p["x"]
            dy = emy - curr_p["y"]
            dist_2d = math.hypot(dx, dy)

            # Edge length (longer edges have more "pull" - more membrane area)
            edge_len = math.hypot(ep2["x"] - ep1["x"], ep2["y"] - ep1["y"])

            # Weight: (edge_length) / distance^1.5
            # The 1.5 power gives moderate distance falloff
            # Longer edges contribute more pull (more membrane attached)
            if dist_2d > 100.0:
                weight = edge_len / (dist_2d ** 1.5)
            else:
                weight = edge_len / (100.0 ** 1.5)

            weighted_sum_x += dx * weight
            weighted_sum_y += dy * weight
            total_weight += weight

        if total_weight > 1e-9:
            avg_dx = weighted_sum_x / total_weight
            avg_dy = weighted_sum_y / total_weight
        else:
            # Fallback to area centroid
            avg_dx = cx_area - curr_p["x"]
            avg_dy = cy_area - curr_p["y"]

        mag_2d = math.hypot(avg_dx, avg_dy)
        if mag_2d < 1e-9:
            avg_dx = cx_area - curr_p["x"]
            avg_dy = cy_area - curr_p["y"]
            mag_2d = math.hypot(avg_dx, avg_dy) or 1.0

        ux = avg_dx / mag_2d
        uy = avg_dy / mag_2d

        ta = curr_p["ta"]
        wx = curr_p["x"] + ux * ta
        wy = curr_p["y"] + uy * ta

        # Z: Project onto local plane
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]
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

        workpoints_weighted[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}

    return workpoints_weighted