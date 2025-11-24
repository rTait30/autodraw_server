"""SHADE_SAIL product calculations."""
from typing import Dict


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def calculate(data: Dict) -> Dict:
    attrs = dict(data.get("attributes") or {})
    a = _num(attrs.get("a")) or _num(attrs.get("side_a"))
    b = _num(attrs.get("b")) or _num(attrs.get("side_b"))
    if a is not None and b is not None:
        attrs["approx_area"] = a * b
    return attrs

__all__ = ["calculate"]
