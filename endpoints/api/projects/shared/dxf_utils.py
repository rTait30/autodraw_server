"""Shared DXF utilities for all product types."""
import ezdxf


_SNAP = 1e-3  # mm snap tolerance for de-duping (0.001 mm)


def new_doc_mm():
    """Create a new DXF document with millimeter units and standard layers."""
    # R2000 is widely compatible and supports TEXT halign/valign
    doc = ezdxf.new(dxfversion="R2000", setup=True)
    # 4 = millimetres
    doc.units = 4
    doc.header["$INSUNITS"] = 4
    msp = doc.modelspace()
    for name, color in [("WHEEL", 3), ("PEN", 2), ("BORDER", 1), ("MARK", 4)]:
        if name not in doc.layers:
            doc.layers.add(name, color=color)
    return doc, msp


def snap_pt(p):
    """Snap a point to a small grid so nearly-identical coordinates dedupe."""
    return (round(p[0] / _SNAP) * _SNAP, round(p[1] / _SNAP) * _SNAP)


def seg_key(a, b):
    """Undirected segment key with snapping; order-independent."""
    a = snap_pt(a)
    b = snap_pt(b)
    return (a, b) if a <= b else (b, a)


def is_on_border(pt, total_w, bin_h):
    """Check if a snapped point lies on the border rectangle (within tolerance)."""
    x, y = pt
    return (
        abs(x - 0.0) <= _SNAP or
        abs(x - total_w) <= _SNAP or
        abs(y - 0.0) <= _SNAP or
        abs(y - bin_h) <= _SNAP
    )


def snap(v: float) -> float:
    """Snap a single value to the grid."""
    return round(v / _SNAP) * _SNAP


def add_unique_line(msp, a, b, layer, seen_set):
    """Add a LINE only if this exact segment hasn't been drawn already (in either direction)."""
    # Round to avoid tiny FP jitter making duplicates
    ra = (round(a[0], 6), round(a[1], 6))
    rb = (round(b[0], 6), round(b[1], 6))
    key = (ra, rb) if ra <= rb else (rb, ra)
    if key in seen_set:
        return
    seen_set.add(key)
    msp.add_line(ra, rb, dxfattribs={"layer": layer})


def merge_intervals(ranges):
    """Merge overlapping 1D intervals. Returns list of (start, end) tuples."""
    if not ranges:
        return []
    sorted_ranges = sorted(ranges, key=lambda r: r[0])
    merged = [sorted_ranges[0]]
    for current in sorted_ranges[1:]:
        last = merged[-1]
        if current[0] <= last[1]:
            # Overlapping or adjacent
            merged[-1] = (last[0], max(last[1], current[1]))
        else:
            merged.append(current)
    return merged


__all__ = [
    "new_doc_mm",
    "snap_pt",
    "seg_key",
    "is_on_border",
    "snap",
    "add_unique_line",
    "merge_intervals",
]
