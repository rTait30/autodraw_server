"""Plane-projected resultant workpoint algorithm.

Goal: a cheap, robust "direction of pull" estimate that behaves better
for common gable-ish shapes (many points near a plane + one high point)
without FEA.

Method (per corner):
- Compute a global best-fit polygon normal using Newell's method.
- Compute local edge resultant (sum of normalized adjacent edge vectors).
- Blend with corner->centroid direction.
- Project the blended vector onto the global plane (removes excessive
  vertical-only artifacts while still allowing world-Z variation if the
  plane is tilted).
- Ensure it points inward (toward centroid) and scale by tension allowance.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple


def _norm(v: Tuple[float, float, float]) -> float:
    return math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])


def _normalize(v: Tuple[float, float, float]) -> Tuple[float, float, float]:
    mag = _norm(v)
    if mag <= 1e-12:
        return (0.0, 0.0, 0.0)
    return (v[0] / mag, v[1] / mag, v[2] / mag)


def _dot(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _add(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> Tuple[float, float, float]:
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def _sub(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> Tuple[float, float, float]:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _scale(v: Tuple[float, float, float], s: float) -> Tuple[float, float, float]:
    return (v[0] * s, v[1] * s, v[2] * s)


def _project_onto_plane(v: Tuple[float, float, float], n_unit: Tuple[float, float, float]) -> Tuple[float, float, float]:
    # Remove component along normal.
    # v_plane = v - (v·n)n
    return _sub(v, _scale(n_unit, _dot(v, n_unit)))


def _newell_normal(points_3d: List[Dict[str, Any]]) -> Tuple[float, float, float]:
    """Approximate polygon normal for a 3D non-planar loop (Newell's method)."""
    nx = ny = nz = 0.0
    count = len(points_3d)
    if count < 3:
        return (0.0, 0.0, 1.0)

    for i in range(count):
        p0 = points_3d[i]
        p1 = points_3d[(i + 1) % count]
        x0, y0, z0 = float(p0["x"]), float(p0["y"]), float(p0["z"])
        x1, y1, z1 = float(p1["x"]), float(p1["y"]), float(p1["z"])
        nx += (y0 - y1) * (z0 + z1)
        ny += (z0 - z1) * (x0 + x1)
        nz += (x0 - x1) * (y0 + y1)

    n = (nx, ny, nz)
    n_unit = _normalize(n)
    if _norm(n_unit) <= 1e-12:
        # Fall back to something sensible.
        return (0.0, 0.0, 1.0)
    return n_unit


def compute_workpoints_plane_resultant(
    points_3d: List[Dict[str, Any]],
    cx: float,
    cy: float,
    cz: float,
    *,
    alpha_edge: float = 0.75,
    beta_centroid: float = 0.25,
) -> Dict[str, Dict[str, float]]:
    """Compute workpoints using plane-projected edge-resultant method."""

    count = len(points_3d)
    if count == 0:
        return {}

    n_unit = _newell_normal(points_3d)
    centroid = (float(cx), float(cy), float(cz))

    out: Dict[str, Dict[str, float]] = {}

    for i in range(count):
        curr = points_3d[i]
        prev = points_3d[(i - 1 + count) % count]
        nxt = points_3d[(i + 1) % count]

        p = (float(curr["x"]), float(curr["y"]), float(curr["z"]))
        p_prev = (float(prev["x"]), float(prev["y"]), float(prev["z"]))
        p_next = (float(nxt["x"]), float(nxt["y"]), float(nxt["z"]))

        # Adjacent edge unit vectors (from corner to neighbors)
        u_prev = _normalize(_sub(p_prev, p))
        u_next = _normalize(_sub(p_next, p))

        edge_res = _add(u_prev, u_next)
        edge_res_u = _normalize(edge_res)

        to_centroid_u = _normalize(_sub(centroid, p))

        if _norm(edge_res_u) <= 1e-9:
            blended = to_centroid_u
        else:
            blended = _add(_scale(edge_res_u, alpha_edge), _scale(to_centroid_u, beta_centroid))

        # Project onto global best-fit plane to reduce "straight down" artifacts.
        projected = _project_onto_plane(blended, n_unit)
        v = projected if _norm(projected) > 1e-9 else blended
        v = _normalize(v)

        # Ensure it points inward.
        if _dot(v, to_centroid_u) < 0:
            v = _scale(v, -1.0)

        ta = float(curr.get("ta") or 0.0)
        wx, wy, wz = _add(p, _scale(v, ta))

        out[str(curr["label"])] = {"x": wx, "y": wy, "z": wz}

    return out
