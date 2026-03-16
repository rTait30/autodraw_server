import os
import tempfile
from flask import send_file, after_this_request
from endpoints.api.projects.shared.dxf_utils import new_doc_mm, snap as _snap, merge_intervals


def get_metadata():
    return {
        "id": "plot_file",
        "name": "Plot File",
        "type": "dxf"
    }


def generate(project, **kwargs):
    """
    Generates a DXF plot file for the RECTANGLES product.
    """
    filename = f"PLOT_{project.get('id', 'project')}.dxf"
    return generate_dxf(project, filename)


def _safe_num(v):
    if v in (None, "", " "):
        return None
    try:
        return float(str(v).strip())
    except (ValueError, TypeError):
        return None


def _add_rounded_rect(msp, x, y, w, h, r, layer="WHEEL"):
    """Add a rectangle with rounded corners using lines and arcs.
    
    If r <= 0 adds a plain rectangle. Clamps r to half the smaller dimension.
    (x, y) is the bottom-left corner.
    """
    r = max(0, min(r, w / 2, h / 2))

    if r <= 0:
        msp.add_line((x, y), (x + w, y), dxfattribs={"layer": layer})
        msp.add_line((x + w, y), (x + w, y + h), dxfattribs={"layer": layer})
        msp.add_line((x + w, y + h), (x, y + h), dxfattribs={"layer": layer})
        msp.add_line((x, y + h), (x, y), dxfattribs={"layer": layer})
        return

    # Straight edges (shortened for corner arcs)
    msp.add_line((x + r, y), (x + w - r, y), dxfattribs={"layer": layer})
    msp.add_line((x + w, y + r), (x + w, y + h - r), dxfattribs={"layer": layer})
    msp.add_line((x + w - r, y + h), (x + r, y + h), dxfattribs={"layer": layer})
    msp.add_line((x, y + h - r), (x, y + r), dxfattribs={"layer": layer})

    # Corner arcs
    msp.add_arc((x + r, y + r), r, 180, 270, dxfattribs={"layer": layer})
    msp.add_arc((x + w - r, y + r), r, 270, 360, dxfattribs={"layer": layer})
    msp.add_arc((x + w - r, y + h - r), r, 0, 90, dxfattribs={"layer": layer})
    msp.add_arc((x + r, y + h - r), r, 90, 180, dxfattribs={"layer": layer})


def _collect_rect_segments(x, y, w, h, r, horizontals, verticals):
    """Collect the straight-edge segments of a (possibly rounded) rectangle
    into horizontal/vertical interval buckets for later merging."""
    r = max(0, min(r, w / 2, h / 2))

    if r <= 0:
        # Full edges
        _add_h(horizontals, y, x, x + w)
        _add_h(horizontals, y + h, x, x + w)
        _add_v(verticals, x, y, y + h)
        _add_v(verticals, x + w, y, y + h)
    else:
        # Edges shortened by corner radius
        _add_h(horizontals, y, x + r, x + w - r)       # bottom
        _add_h(horizontals, y + h, x + r, x + w - r)   # top
        _add_v(verticals, x, y + r, y + h - r)          # left
        _add_v(verticals, x + w, y + r, y + h - r)      # right


def _add_h(horizontals, y, x1, x2):
    y = _snap(y)
    a, b = sorted((_snap(x1), _snap(x2)))
    if a == b:
        return
    horizontals.setdefault(y, []).append((a, b))


def _add_v(verticals, x, y1, y2):
    x = _snap(x)
    a, b = sorted((_snap(y1), _snap(y2)))
    if a == b:
        return
    verticals.setdefault(x, []).append((a, b))


def generate_dxf(project, download_name: str):
    """Generate DXF file for RECTANGLES product type.

    Expected structure:
      project = {
        "project_attributes": {
          "rectangles": [ {width, height, label, quantity, cornerRadius}, ... ],
          "fabricWidth": ...,
          "nest": { "panels": {label: {x, y, rotated}}, "bin_height": ..., "total_width": ... },
          "nested_panels": {label: {width, height, cornerRadius, base, rectIndex}},
        }
      }
    """
    doc, msp = new_doc_mm()

    project_attrs = project.get("project_attributes") or {}
    nest = project_attrs.get("nest") or {}
    nested_panels = project_attrs.get("nested_panels") or {}
    rolls = nest.get("rolls") or []
    bin_h = float(nest.get("bin_height") or nest.get("fabric_height") or 0)
    rectangles_raw = project_attrs.get("rectangles") or []

    if not rolls:
        msp.add_text(
            "RECTANGLES DXF: No nested panels found",
            dxfattribs={"layer": "PEN", "height": 50},
        ).set_placement((100, 100))
        return _save_and_send(doc, download_name)

    # Build a cornerRadius lookup from the original rectangles array (by index)
    # as a fallback for older projects calculated before cornerRadius was added
    cr_by_index = {}
    for i, rect in enumerate(rectangles_raw):
        cr_by_index[i] = float(rect.get("cornerRadius") or 0)

    # Build dims map from nested_panels meta (width, height, cornerRadius)
    dims = {}
    for name, rec in nested_panels.items():
        try:
            w = float(rec.get("width") or 0)
            h = float(rec.get("height") or 0)
            # Try nested_panels first, fall back to original rectangles array
            cr = float(rec.get("cornerRadius") or 0)
            if cr <= 0:
                rect_idx = rec.get("rectIndex", -1)
                cr = cr_by_index.get(rect_idx, 0)
        except (TypeError, ValueError):
            continue
        if w > 0 and h > 0:
            dims[str(name)] = (w, h, cr)

    roll_spacing = 100.0  # gap between rolls in DXF
    current_y = 0.0

    # Collect all straight-edge segments for merging
    horizontals = {}
    verticals = {}

    for roll in rolls:
        roll_width = float(roll.get("width") or roll.get("max_width") or 0)
        roll_height = bin_h
        roll_panels = roll.get("panels") or {}

        # Draw roll boundary (going downward: current_y is negative)
        y_top = -current_y
        y_bot = -(current_y + roll_height)
        msp.add_line((0, y_top), (roll_width, y_top), dxfattribs={"layer": "BORDER"})
        msp.add_line((roll_width, y_top), (roll_width, y_bot), dxfattribs={"layer": "BORDER"})
        msp.add_line((roll_width, y_bot), (0, y_bot), dxfattribs={"layer": "BORDER"})
        msp.add_line((0, y_bot), (0, y_top), dxfattribs={"layer": "BORDER"})

        # Roll label
        rl = msp.add_text(
            f"Roll {roll.get('roll_number', '')}",
            dxfattribs={"layer": "PEN", "height": 20},
        )
        rl.dxf.insert = (5, y_top + 25)
        rl.dxf.align_point = (5, y_top + 25)

        # Draw panels within this roll
        for name, pos in roll_panels.items():
            if name not in dims:
                continue

            w, h, corner_r = dims[name]
            rotated = bool(pos.get("rotated"))
            if rotated:
                w, h = h, w

            px = float(pos.get("x", 0))
            # Flip Y: panel y=0 is at the top of the roll, going down
            py = y_top - float(pos.get("y", 0)) - h

            # Collect straight edges for merging; draw arcs immediately (unique per panel)
            r_clamped = max(0, min(corner_r, w / 2, h / 2))
            _collect_rect_segments(px, py, w, h, corner_r, horizontals, verticals)
            if r_clamped > 0:
                msp.add_arc((px + r_clamped, py + r_clamped), r_clamped, 180, 270, dxfattribs={"layer": "WHEEL"})
                msp.add_arc((px + w - r_clamped, py + r_clamped), r_clamped, 270, 360, dxfattribs={"layer": "WHEEL"})
                msp.add_arc((px + w - r_clamped, py + h - r_clamped), r_clamped, 0, 90, dxfattribs={"layer": "WHEEL"})
                msp.add_arc((px + r_clamped, py + h - r_clamped), r_clamped, 90, 180, dxfattribs={"layer": "WHEEL"})

            # Label — use the base name (e.g. "A" not "A_Q1")
            label_margin = 15.0
            base_label = (nested_panels.get(name) or {}).get("base", name)
            tx, ty = px + label_margin, py + h - label_margin
            t = msp.add_text(base_label, dxfattribs={"layer": "PEN", "height": 14})
            t.dxf.halign = 0
            t.dxf.valign = 3
            t.dxf.insert = (tx, ty)
            t.dxf.align_point = (tx, ty)

        current_y += roll_height + roll_spacing

    # --- Draw merged segments (deduplicates shared edges) ---
    for y_coord, spans in horizontals.items():
        for x1, x2 in merge_intervals(spans):
            msp.add_line((x1, y_coord), (x2, y_coord), dxfattribs={"layer": "WHEEL"})

    for x_coord, spans in verticals.items():
        for y1, y2 in merge_intervals(spans):
            msp.add_line((x_coord, y1), (x_coord, y2), dxfattribs={"layer": "WHEEL"})

    return _save_and_send(doc, download_name)


def _save_and_send(doc, download_name: str):
    """Save DXF doc to a temp file and return a Flask send_file response."""
    tmp = tempfile.NamedTemporaryFile(suffix=".dxf", delete=False)
    tmp_path = tmp.name
    tmp.close()
    doc.saveas(tmp_path)

    @after_this_request
    def _cleanup(response):
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        return response

    return send_file(
        tmp_path,
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=download_name,
        max_age=0,
        etag=False,
        conditional=False,
        last_modified=None,
    )
