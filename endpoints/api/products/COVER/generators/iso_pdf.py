import math
import tempfile
import os
from datetime import datetime, timezone
from flask import send_file, after_this_request
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape

def get_metadata():
    return {
        "id": "initial_drawing",
        "name": "Initial Drawing (PDF)",
        "type": "pdf"
    }

def generate(project, **kwargs):
    """
    Generates the Isometric View PDF for the COVER product.
    """
    download_name = kwargs.get("download_name")
    if not download_name:
        download_name = f"{(project.get('general', {}).get('name') or 'project').strip()}_iso.pdf".replace(" ", "_")

    # Get attributes from first product
    if not project.get("products"):
        raise ValueError(f"No products found for Project {project.get('id')}")
    
    products = project.get("products", [])
    if not products:
         raise ValueError(f"No products found for Project {project.get('id')}")

    a = products[0].get("attributes") or {}
    width  = _safe_float(a.get("width"),  default=1000.0, min_val=1.0)
    length = _safe_float(a.get("length"), default=1000.0, min_val=1.0)
    height = _safe_float(a.get("height"), default=50.0,   min_val=0.0)

    quantity     = int(_safe_float(a.get("quantity"), default=1.0, min_val=1.0))
    fabric_width = _safe_float(a.get("fabricWidth"), default=None)
    hem          = _safe_float(a.get("hem"),         default=None)
    seam         = _safe_float(a.get("seam"),        default=None)

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp_path = tmp.name
    tmp.close()

    try:
        _build_iso_pdf(
            tmp_path=tmp_path,
            project=project,
            width_mm=width,
            length_mm=length,
            height_mm=height,
            attrs={
                "quantity": quantity,
                "fabricWidth": fabric_width,
                "hem": hem,
                "seam": seam,
            }
        )
    except Exception as e:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise e

    @after_this_request
    def _cleanup(response):
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        return response

    resp = send_file(
        tmp_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=download_name,
        max_age=0,
        etag=False,
        conditional=False,
        last_modified=None,
    )
    resp.headers["Cache-Control"] = "no-store, must-revalidate, private"
    return resp


def _build_iso_pdf(tmp_path, project, width_mm, length_mm, height_mm, attrs):
    page_w, page_h = landscape(A4)
    c = canvas.Canvas(tmp_path, pagesize=(page_w, page_h))

    margin = 24
    inner_w = page_w - 2 * margin
    inner_h = page_h - 2 * margin

    left_ratio = 0.55
    left_w = inner_w * left_ratio
    right_w = inner_w - left_w

    left_x = margin
    left_y = margin
    right_x = margin + left_w
    right_y = margin

    # Divider
    c.setLineWidth(0.5)
    c.line(right_x, margin, right_x, page_h - margin)

    # Header
    c.setFont("Helvetica-Bold", 14)
    c.drawString(margin, page_h - margin + 6, "Cover — Isometric Sheet")
    c.setFont("Helvetica", 9)
    gen_ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    c.drawRightString(page_w - margin, page_h - margin + 6, f"Generated: {gen_ts}")

    # Page 1 content
    _draw_isometric_with_dimensions(
        c,
        viewport=(left_x + 8, left_y + 8, left_w - 16, inner_h - 16),
        width_mm=width_mm,
        length_mm=length_mm,
        height_mm=height_mm,
    )

    _draw_info_panel(
        c,
        x=right_x + 16,
        y=right_y + inner_h - 16,
        w=right_w - 32,
        project=project,
        dims={"width": width_mm, "length": length_mm, "height": height_mm},
        attrs=attrs,
    )

    c.showPage()
    c.save()


def _draw_isometric_with_dimensions(c, viewport, width_mm, length_mm, height_mm):
    vx, vy, vw, vh = viewport
    pts3d = [
        (0,         0,          0),           # 0
        (width_mm,  0,          0),           # 1
        (width_mm,  length_mm,  0),           # 2
        (0,         length_mm,  0),           # 3
        (0,         0,          height_mm),   # 4
        (width_mm,  0,          height_mm),   # 5
        (width_mm,  length_mm,  height_mm),   # 6
        (0,         length_mm,  height_mm),   # 7
    ]

    cos30 = math.cos(math.radians(30))
    sin30 = math.sin(math.radians(30))

    def iso_project(p):
        X, Y, Z = p
        x2d = (X - Y) * cos30
        y2d = (X + Y) * sin30 - Z
        return (x2d, y2d)

    pts2d = list(map(iso_project, pts3d))

    min_x = min(p[0] for p in pts2d)
    max_x = max(p[0] for p in pts2d)
    min_y = min(p[1] for p in pts2d)
    max_y = max(p[1] for p in pts2d)

    box_w = max_x - min_x
    box_h = max_y - min_y
    if box_w <= 0 or box_h <= 0:
        return

    pad = 28.0
    scale = min((vw - 2 * pad) / box_w, (vh - 2 * pad) / box_h)

    def to_screen(p):
        x = (p[0] - min_x) * scale
        y = (p[1] - min_y) * scale
        x += vx + (vw - box_w * scale) / 2.0
        y += vy + (vh - box_h * scale) / 2.0
        return (x, y)

    pts = list(map(to_screen, pts2d))

    c.setLineWidth(1.25)
    edges = [
        (0, 1), (1, 2), (2, 3), (3, 0),
        (4, 5), (5, 6), (6, 7), (7, 4),
        (0, 4), (1, 5), (2, 6), (3, 7),
    ]
    for a, b in edges:
        c.line(pts[a][0], pts[a][1], pts[b][0], pts[b][1])

    dim_offset = -16
    txt_size = 9

    _dim_aligned(c, p1=pts[0], p2=pts[1], value_mm=width_mm, offset=dim_offset, text_size=txt_size)
    _dim_aligned(c, p1=pts[0], p2=pts[3], value_mm=length_mm, offset=dim_offset, text_size=txt_size)
    _dim_aligned(c, p1=pts[0], p2=pts[4], value_mm=height_mm, offset=dim_offset, text_size=txt_size)

    c.setFont("Helvetica-Oblique", 8)
    c.drawString(vx + 4, vy + 4, "Isometric view (dimensions in mm)")


def _dim_aligned(c, p1, p2, value_mm, offset=14, text_size=9):
    x1, y1 = p1
    x2, y2 = p2
    dx, dy = (x2 - x1), (y2 - y1)
    L = math.hypot(dx, dy)
    if L < 1e-3:
        return

    ux, uy = dx / L, dy / L
    nx, ny = -uy, ux

    e1 = (x1 + nx * offset, y1 + ny * offset)
    e2 = (x2 + nx * offset, y2 + ny * offset)

    c.setLineWidth(0.75)
    c.line(x1, y1, e1[0], e1[1])
    c.line(x2, y2, e2[0], e2[1])

    c.setLineWidth(0.9)
    c.line(e1[0], e1[1], e2[0], e2[1])

    _arrowhead(c, tip=e1, direction=(-ux, -uy), size=6)
    _arrowhead(c, tip=e2, direction=(ux, uy), size=6)

    label = f"{int(round(value_mm))} mm"
    cx, cy = ((e1[0] + e2[0]) / 2.0, (e1[1] + e2[1]) / 2.0)

    text_off = 8
    tx, ty = (cx + nx * text_off, cy + ny * text_off)

    angle_deg = math.degrees(math.atan2(dy, dx))
    c.saveState()
    c.translate(tx, ty)
    c.rotate(angle_deg)
    c.setFont("Helvetica", text_size)
    w = c.stringWidth(label, "Helvetica", text_size)
    c.drawString(-w / 2.0, -text_size / 2.5, label)
    c.restoreState()


def _arrowhead(c, tip, direction, size=6):
    tx, ty = tip
    ux, uy = direction
    L = math.hypot(ux, uy)
    if L < 1e-6:
        return
    ux, uy = ux / L, uy / L
    px, py = -uy, ux
    back_x, back_y = (tx - ux * size, ty - uy * size)
    left_x, left_y = (back_x + px * (size * 0.6), back_y + py * (size * 0.6))
    right_x, right_y = (back_x - px * (size * 0.6), back_y - py * (size * 0.6))
    p = c.beginPath()
    p.moveTo(tx, ty)
    p.lineTo(left_x, left_y)
    p.lineTo(right_x, right_y)
    p.close()
    c.setLineWidth(0.5)
    c.drawPath(p, fill=1, stroke=1)


def _draw_info_panel(c, x, y, w, project, dims, attrs):
    line_h = 14
    small = 9
    big = 12

    def line(text, bold=False, pad=0):
        nonlocal y
        y -= pad
        c.setFont("Helvetica-Bold" if bold else "Helvetica", big if bold else small)
        c.drawString(x, y, text)
        y -= line_h

    name = project.get("general", {}).get("name") or "Untitled"
    pid = project.get("id") or ""
    line(f"Project: {name} (ID {pid})", bold=True, pad=2)

    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "Attributes")
    y -= line_h

    c.setFont("Helvetica", 9)
    def kv(label, val):
        nonlocal y
        c.drawString(x + 12, y, f"{label}: {val}")
        y -= line_h

    kv("Width",  f"{int(round(dims['width']))} mm")
    kv("Length", f"{int(round(dims['length']))} mm")
    kv("Height", f"{int(round(dims['height']))} mm")

    if attrs.get("fabricWidth"):
        kv("Fabric width", f"{int(round(attrs['fabricWidth']))} mm")
    if attrs.get("hem") is not None:
        kv("Hem", f"{int(round(attrs['hem']))} mm")
    if attrs.get("seam") is not None:
        kv("Seam", f"{int(round(attrs['seam']))} mm")

    kv("Quantity", f"{int(attrs.get('quantity') or 1)}")

    y -= 4
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(x, y, "Notes: All dimensions in millimetres. Drawing proportional; labels show true sizes.")

def _safe_float(v, default=None, min_val=None, max_val=None):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return default
    if min_val is not None and f < min_val:
        f = min_val
    if max_val is not None and f > max_val:
        f = max_val
    return f
