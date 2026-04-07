"""Bisect workpoint algorithm."""

import math
from typing import Dict, Any, List


def compute_workpoints_bisect(points, cx, cy, cz):
    """Compute workpoints using bisect method.

    Projects the workpoint inwards along the angle bisector of adjacent edges.
    """
    workpoints_bisect = {}
    count = len(points)

    for i in range(count):
        curr_p = points[i]
        prev_p = points[(i - 1 + count) % count]
        next_p = points[(i + 1) % count]

        # Vectors from Current -> Prev, Current -> Next
        v_prev = (prev_p["x"] - curr_p["x"], prev_p["y"] - curr_p["y"], prev_p["z"] - curr_p["z"])
        v_next = (next_p["x"] - curr_p["x"], next_p["y"] - curr_p["y"], next_p["z"] - curr_p["z"])

        # Normalize
        len_prev = math.sqrt(sum(k*k for k in v_prev)) or 1.0
        len_next = math.sqrt(sum(k*k for k in v_next)) or 1.0

        u_prev = [k / len_prev for k in v_prev]
        u_next = [k / len_next for k in v_next]

        # Bisector direction = Sum of normalized edge vectors
        # For a standard convex corner, this points INWARDS.
        bisect = [u_prev[k] + u_next[k] for k in range(3)]
        len_bisect = math.sqrt(sum(k*k for k in bisect))

        if len_bisect < 1e-9:
             # Edges are collinear (180 deg) or degenerate.
             # Fallback to Centroid direction to avoid error
             dx = cx - curr_p["x"]
             dy = cy - curr_p["y"]
             dz = cz - curr_p["z"]
             mag_c = math.sqrt(dx*dx + dy*dy + dz*dz) or 1.0
             u_bisect = [dx/mag_c, dy/mag_c, dz/mag_c]
        else:
             u_bisect = [c / len_bisect for c in bisect]

        ta = curr_p.get("tensionAllowance") or 0.0
        wx = curr_p["x"] + u_bisect[0] * ta
        wy = curr_p["y"] + u_bisect[1] * ta
        wz = curr_p["z"] + u_bisect[2] * ta

        workpoints_bisect = {"x": wx, "y": wy, "z": wz}

        points[i].setdefault("workpoint_methods", {})
        points[i]["workpoint_methods"]["bisect"] = workpoints_bisect

    return workpoints_bisect
