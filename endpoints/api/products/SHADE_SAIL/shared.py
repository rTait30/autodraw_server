"""Shared utilities for SHADE_SAIL calculations."""

from typing import Dict


def _get_dist_xy(u: int, v: int, xy_distances: Dict[str, float]) -> float:
    """Get the XY distance between two points u and v."""
    k = f"{min(u,v)}-{max(u,v)}"
    return xy_distances.get(k, 0.0)
