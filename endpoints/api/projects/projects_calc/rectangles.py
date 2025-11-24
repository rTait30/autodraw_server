"""RECTANGLES product calculations."""
from typing import Dict


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def calculate(data: Dict) -> Dict:
    attrs = dict(data.get("attributes") or {})
    w = _num(attrs.get("width"))
    l = _num(attrs.get("length"))
    if w is not None and l is not None:
        attrs["area"] = w * l
        attrs["perimeter"] = 2 * (w + l)
    return attrs

__all__ = ["calculate"]
