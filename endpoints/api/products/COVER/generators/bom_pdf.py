import os
import tempfile
from datetime import datetime, timezone
from flask import send_file, after_this_request
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape

def get_metadata():
    return {
        "id": "bom_pdf",
        "name": "Bill of Materials",
        "type": "pdf"
    }

def generate(project, **kwargs):
    """
    Generates a Bill of Materials PDF for the COVER product.
    """
    # Extract parameters from project
    # The project structure passed here is likely the full project dict
    # We need to extract specific product data.
    # Assuming 'project' contains 'product_data' or similar, or we just use the project dict directly
    # based on how the previous code worked.
    
    # In the previous code (bom_drawing.py), the route handler extracted:
    # width_mm, length_mm, height_mm, attrs, bom_level
    
    # Let's look at how we can extract these from the 'project' object passed to generate.
    # The 'project' object usually comes from the database or request.
    # If it's the full project document:
    product_data = project.get("product_data", {})
    params = product_data.get("params", {})
    
    width_mm = _safe_float(params.get("width"), default=2000)
    length_mm = _safe_float(params.get("length"), default=2000)
    height_mm = _safe_float(params.get("height"), default=500)
    
    # attrs might be separate or part of params. In the previous code:
    # attrs = data.get("product_data", {}).get("attrs", {})
    attrs = product_data.get("attrs", {})
    
    # bom_level was a query param in the old code. 
    # Here we might default it or look for it in kwargs if passed.
    bom_level = kwargs.get("bom_level", "summary")

    # Create a temporary file
    fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)

    try:
        _build_bom_pdf(tmp_path, project, width_mm, length_mm, height_mm, attrs, bom_level)
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

    filename = f"BOM_{project.get('id', 'project')}.pdf"

    resp = send_file(
        tmp_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
        max_age=0,
        etag=False,
        conditional=False,
        last_modified=None,
    )
    resp.headers["Cache-Control"] = "no-store, must-revalidate, private"
    return resp

def _build_bom_pdf(tmp_path, project, width_mm, length_mm, height_mm, attrs, bom_level="summary"):
    page_w, page_h = landscape(A4)
    c = canvas.Canvas(tmp_path, pagesize=(page_w, page_h))

    _draw_bom_page(
        c=c,
        project=project,
        dims={"width": width_mm, "length": length_mm, "height": height_mm},
        attrs=attrs,
        bom_level=bom_level,
    )

    c.showPage()
    c.save()

def _estimate_bom_items(dims: dict, attrs: dict, level: str = "summary") -> list[dict]:
    width = float(dims.get("width", 0.0))
    length = float(dims.get("length", 0.0))
    height = float(dims.get("height", 0.0))
    qty = int(attrs.get("quantity") or 1)

    fabric_w = attrs.get("fabricWidth") or 0.0  # mm
    hem = attrs.get("hem") or 0.0              # mm
    seam = attrs.get("seam") or 0.0            # mm

    rows = []

    if fabric_w and fabric_w > 0:
        usable_len_mm = (width * length) / fabric_w
        usable_len_m = usable_len_mm / 1000.0
        rows.append({
            "code": "FAB-ROLL",
            "description": "Fabric roll usage (est.)",
            "qty": round(usable_len_m * qty, 2),
            "unit": "m",
            "notes": f"{int(fabric_w)} mm roll; seams ~{int(seam or 0)} mm",
        })
    else:
        rows.append({
            "code": "FAB-ROLL",
            "description": "Fabric roll usage (est.)",
            "qty": round((width*length)/1_000_000 * qty, 2),
            "unit": "m²",
            "notes": "No fabric width set; showing area",
        })

    perimeter_mm = 2 * (width + length)
    perimeter_m = perimeter_mm / 1000.0
    if hem and hem > 0:
        rows.append({
            "code": "HEM-THREAD",
            "description": "Hem / stitching",
            "qty": round(perimeter_m * qty, 2),
            "unit": "m",
            "notes": f"hem ~{int(hem)} mm",
        })

    rows.append({
        "code": "EDGE-TAPE",
        "description": "Edge reinforcement tape",
        "qty": round(perimeter_m * qty, 2),
        "unit": "m",
        "notes": "",
    })

    if level == "detailed":
        rows.append({
            "code": "QA-LABEL",
            "description": "Labels & QA tags",
            "qty": qty,
            "unit": "ea",
            "notes": "Per cover",
        })

    return rows

def _draw_bom_page(c: canvas.Canvas, project, dims: dict, attrs: dict, bom_level: str = "summary"):
    page_w, page_h = c._pagesize
    margin = 24
    inner_w = page_w - 2 * margin
    y = page_h - margin

    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y, "Bill of Materials")
    c.setFont("Helvetica", 9)
    y -= 14
    name = project.get("general", {}).get("name") or ""
    pid = project.get("id") or ""
    c.drawString(margin, y, f"Project: {name} (#{pid})")
    y -= 20

    rows = _estimate_bom_items(dims, attrs, level=bom_level)

    headers = ["Code", "Description", "Qty", "Unit", "Notes"]
    col_w = [80, inner_w - (80 + 70 + 50 + 180), 70, 50, 180]
    # assert sum(col_w) == inner_w

    c.setLineWidth(0.8)
    c.line(margin, y, margin + inner_w, y)
    y -= 18
    c.setFont("Helvetica-Bold", 10)

    x = margin
    for i, h in enumerate(headers):
        c.drawString(x + 2, y, h)
        x += col_w[i]
    y -= 6
    c.line(margin, y, margin + inner_w, y)

    c.setFont("Helvetica", 9)
    for r in rows:
        y -= 16
        if y < margin + 40:
            c.showPage()
            y = page_h - margin
            c.setFont("Helvetica-Bold", 12)
            c.drawString(margin, y, "Bill of Materials (cont.)")
            y -= 24
            c.setFont("Helvetica", 9)

        x = margin
        cells = [
            r.get("code", ""),
            r.get("description", ""),
            str(r.get("qty", "")),
            r.get("unit", ""),
            r.get("notes", ""),
        ]
        for i, val in enumerate(cells):
            c.drawString(x + 2, y, val)
            x += col_w[i]

        c.setLineWidth(0.3)
        c.line(margin, y - 3, margin + inner_w, y - 3)

    y = margin + 8
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(margin, y, f"Level: {bom_level.capitalize()} — Generated UTC {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}")

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
