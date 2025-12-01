"""SHADE_SAIL DXF generation.

Draws each shade sail (each product) side-by-side (left to right) showing:
  - Plan view (posts as circles, perimeter edges)
  - Post height indicator (small vertical line + caps) per point
  - Height annotation text below each post

Relies on attributes structure:
  products[i].attributes.points[LETTER].height
  products[i].attributes.positions[LETTER] = {x, y}
  products[i].attributes.pointCount
"""

import math
import tempfile
from flask import send_file
from endpoints.api.projects.shared.dxf_utils import new_doc_mm


def _safe_num(v):
    if v in (None, "", " "):
        return None
    try:
        return float(str(v).strip())
    except (ValueError, TypeError):
        return None


def generate_dxf(nest: dict, nested_panels: dict, download_name: str, product_dims: dict):
    """Lean DXF: read from full project, iterate products, draw points with XYZ."""
    doc, msp = new_doc_mm()

    project = product_dims.get("project")
    if not project or not getattr(project, "products", None):
        msp.add_text("SHADE SAIL DXF — no project/products", dxfattribs={"layer": "PEN", "height": 60}).set_placement((100, 200))
        tmp = tempfile.NamedTemporaryFile(suffix=".dxf", delete=False)
        tmp_path = tmp.name
        tmp.close()
        doc.saveas(tmp_path)
        return send_file(tmp_path, mimetype="application/dxf", as_attachment=True, download_name=download_name,
                         max_age=0, etag=False, conditional=False, last_modified=None)

    circle_radius = 50.0
    cap_half_width = 30.0
    height_line_offset = 300.0  # not used for poles; kept for optional side indicators
    x_offset = 0.0
    spacing = 8000.0
    bbox_buffer = 200.0  # small buffer around bounding box (plan units)

    # Title
    msp.add_text("SHADE SAILS — XYZ points", dxfattribs={"layer": "PEN", "height": 120}).set_placement((0, -300))

    for idx, pp in enumerate(project.products):
        attrs = pp.attributes or {}
        positions = attrs.get("positions") or {}
        points = attrs.get("points") or {}
        point_count = attrs.get("pointCount") or len(positions)

        # Quick bbox for horizontal offset progression and drawing
        xs = [(_safe_num(p.get("x")) or 0.0) for p in positions.values()]
        ys = [(_safe_num(p.get("y")) or 0.0) for p in positions.values()]
        min_x = min(xs) if xs else 0.0
        max_x = max(xs) if xs else 0.0
        min_y = min(ys) if ys else 0.0
        max_y = max(ys) if ys else 0.0
        width_local = (max_x - min_x)
        height_local = (max_y - min_y)

        post_xy = {}

        # Draw posts and annotations
        for label, pos in positions.items():
            rx = _safe_num(pos.get("x")) or 0.0
            ry = _safe_num(pos.get("y")) or 0.0
            # Use raw units; flip Y for plan orientation
            x = x_offset + (rx - min_x)
            y = - (ry)

            # Z from points height
            h_raw = (points.get(label) or {}).get("height")
            z = _safe_num(h_raw) or 0.0

            post_xy[label] = (x, y, z)

            # 2D circle + 3D point
            msp.add_circle((x, y), circle_radius, dxfattribs={"layer": "MARK"})
            msp.add_point((x, y, z), dxfattribs={"layer": "MARK"})

            # Draw pole as true vertical line at the post location (3D)
            # From ground z=0 to top z=z at same (x,y)
            if z > 0:
                msp.add_line((x, y, 0), (x, y, z), dxfattribs={"layer": "MARK"})

            # Labels
            t_pt = msp.add_text(label, dxfattribs={"layer": "PEN", "height": 60}); t_pt.dxf.halign = 1; t_pt.dxf.valign = 1; t_pt.set_placement((x, y + 120))
            t_h  = msp.add_text(f"H: {int(round(z))}mm", dxfattribs={"layer": "PEN", "height": 40}); t_h.dxf.halign = 1; t_h.dxf.valign = 3; t_h.set_placement((x, y - 120))
            t_xyz = msp.add_text(f"X:{round(rx,2)} Y:{round(ry,2)} Z:{round(z,2)}", dxfattribs={"layer": "PEN", "height": 35}); t_xyz.dxf.halign = 1; t_xyz.dxf.valign = 1; t_xyz.set_placement((x, y + 220))

        # Compute center in 3D (average of post XYZ)
        if positions:
            sum_x = 0.0
            sum_y = 0.0
            sum_z = 0.0
            npts = 0
            for label, pos in positions.items():
                rx = _safe_num(pos.get("x")) or 0.0
                ry = _safe_num(pos.get("y")) or 0.0
                x_post = x_offset + (rx - min_x)
                y_post = - (ry)
                z_post = _safe_num((points.get(label) or {}).get("height")) or 0.0
                sum_x += x_post
                sum_y += y_post
                sum_z += z_post
                npts += 1
            cx = sum_x / npts if npts else x_offset
            cy = sum_y / npts if npts else 0.0
            cz = sum_z / npts if npts else 0.0
            # draw center point (3D)
            msp.add_point((cx, cy, cz), dxfattribs={"layer": "MARK"})
            msp.add_circle((cx, cy, cz), 35.0, dxfattribs={"layer": "MARK"})

        # Perimeter in 3D using A..N order
        order = [chr(65 + i) for i in range(point_count)]
        for i in range(point_count):
            a = order[i]; b = order[(i + 1) % point_count]
            if a in post_xy and b in post_xy:
                msp.add_line(post_xy[a], post_xy[b], dxfattribs={"layer": "MARK"})

        # Workpoints: 3D offset from each post toward 3D center by tensionAllowance
        workpoints = {}
        for label, pos in positions.items():
            rx = _safe_num(pos.get("x")) or 0.0
            ry = _safe_num(pos.get("y")) or 0.0
            x_post = x_offset + (rx - min_x)
            y_post = - (ry)
            z_post = _safe_num((points.get(label) or {}).get("height")) or 0.0
            ta_raw = (points.get(label) or {}).get("tensionAllowance")
            ta = _safe_num(ta_raw) or 0.0
            # direction vector from post to center (3D)
            dx = (cx - x_post)
            dy = (cy - y_post)
            dz = (cz - z_post)
            mag = math.sqrt(dx*dx + dy*dy + dz*dz) or 1.0
            ux = dx / mag
            uy = dy / mag
            uz = dz / mag
            wx = x_post + ux * ta
            wy = y_post + uy * ta
            wz = z_post + uz * ta
            workpoints[label] = (wx, wy, wz)
            # draw workpoint (red)
            msp.add_circle((wx, wy), 30.0, dxfattribs={"layer": "PEN", "color": 1})
            msp.add_point((wx, wy, wz), dxfattribs={"layer": "PEN", "color": 1})

        # Draw polygon connecting workpoints in 3D (red)
        for i in range(point_count):
            a = order[i]; b = order[(i + 1) % point_count]
            if a in workpoints and b in workpoints:
                msp.add_line(workpoints[a], workpoints[b], dxfattribs={"layer": "PEN", "color": 1})


        # Advance offset; if width_local is zero (degenerate), still move by spacing
        advance = width_local if width_local > 0 else 0.0
        x_offset += advance + spacing

    # Footer
    msp.add_text("Units: raw JSON; Perimeter in 3D", dxfattribs={"layer": "PEN", "height": 50}).set_placement((0, -600))

    tmp = tempfile.NamedTemporaryFile(suffix=".dxf", delete=False)
    tmp_path = tmp.name
    tmp.close()
    doc.saveas(tmp_path)

    return send_file(
        tmp_path,
        mimetype="application/dxf",
        as_attachment=True,
        download_name=download_name,
        max_age=0,
        etag=False,
        conditional=False,
        last_modified=None,
    )


__all__ = ["generate_dxf"]
