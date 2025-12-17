"""
Fabrication Workbook PDF Generator for SHADE_SAIL products.

Generates an A3 multi-page PDF containing:
  - Page 1: Project Info & Plotting Specifications
  - Page 2: QC Inspection Checklist
  - Page 3+: Two pages per sail:
      - Sail diagram page (same as work model visualization)
      - Hardware details page with component diagrams
"""

import os
import tempfile
from datetime import datetime, timezone
from flask import send_file, after_this_request
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.colors import black, white, lightgrey, red, gray, green
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Optional SVG support (vector rendering)
try:
    from svglib.svglib import svg2rlg  # type: ignore
    from reportlab.graphics import renderPDF  # type: ignore
    _SVG_ENABLED = True
except Exception:
    _SVG_ENABLED = False

from .shared import extract_sail_geometry, get_detail_list, get_transform_params, get_corner_info_text
from endpoints.api.products.shared.detail_manager import get_detail_image, get_detail_specs

# Register Arial fonts (Windows paths)
try:
    pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
except:
    # Fallback - Arial not available, will use Helvetica
    pass


# =============================================================================
# CONSTANTS
# =============================================================================

# A4 Portrait for cover/QC pages
PORTRAIT_SIZE = A4
PORTRAIT_WIDTH, PORTRAIT_HEIGHT = PORTRAIT_SIZE

# A4 Landscape for sail pages
LANDSCAPE_SIZE = landscape(A4)
LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT = LANDSCAPE_SIZE

MARGIN = 10 * mm
LARGE_FONT = 18
MEDIUM_FONT = 12
SMALL_FONT = 11
BOX_PADDING = 5 * mm


# =============================================================================
# METADATA
# =============================================================================

def get_metadata():
    """Return generator metadata for discovery."""
    return {
        "id": "fabrication_workbook",
        "name": "Fabrication Workbook",
        "type": "pdf"
    }


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def generate(project, **kwargs):
    """
    Generates a Fabrication Workbook PDF for the SHADE_SAIL product.
    
    Args:
        project: Project dictionary containing general info and products list
        **kwargs: Additional arguments (e.g., download_name)
    
    Returns:
        Flask response with PDF file
    """
    download_name = kwargs.get("download_name")
    if not download_name:
        project_name = project.get("general", {}).get("name", "project").strip()
        download_name = f"{project_name}_fabrication_workbook.pdf".replace(" ", "_")

    # Create temporary file
    fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)

    try:
        _build_workbook_pdf(tmp_path, project)
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


# =============================================================================
# PDF BUILDER

def _build_workbook_pdf(tmp_path: str, project: dict):
    """
    Build the complete fabrication workbook PDF.
    
    Args:
        tmp_path: Path to save the PDF
        project: Project dictionary
    """
    # Start with portrait for cover pages
    c = canvas.Canvas(tmp_path, pagesize=PORTRAIT_SIZE)
    
    # Extract data
    general = project.get("general", {})
    products = project.get("products", [])
    
    # Page 1: Project Info & Plotting Specifications (Portrait A4)
    _draw_cover_page(c, project, general, products)
    c.showPage()
    
    # Page 2: QC Inspection Checklist (Portrait A4)
    _draw_qc_checklist_page(c, project, general, products)
    c.showPage()
    
    # Pages 3+: Two pages per sail (Landscape A4)
    for idx, sail in enumerate(products):
        # Switch to landscape for sail pages
        c.setPageSize(LANDSCAPE_SIZE)
        
        # Page A: Sail Diagram (same as work model)
        _draw_sail_diagram_page(c, project, sail, idx + 1, len(products))
        c.showPage()
        
        # Page B: Hardware Details
        _draw_sail_hardware_page(c, project, sail, idx + 1, len(products))
        c.showPage()
    
    c.save()


# =============================================================================
# PAGE 1: COVER PAGE (Project Info & Plotting Specifications)
# =============================================================================

def _draw_cover_page(c: canvas.Canvas, project: dict, general: dict, products: list):
    """
    Draw the cover page with Project Info and Plotting Specifications.
    Portrait A4 layout - single column.
    """
    # Page title
    c.setFont("Arial-Bold", LARGE_FONT)
    c.drawCentredString(PORTRAIT_WIDTH / 2, PORTRAIT_HEIGHT - MARGIN - 12 * mm, "FABRICATION WORKBOOK")
    
    # Calculate layout - single column for portrait A4
    content_top = PORTRAIT_HEIGHT - MARGIN - 28 * mm
    content_width = PORTRAIT_WIDTH - 2 * MARGIN
    
    # Top section: Project Info
    project_height = 120 * mm
    _draw_project_info_section(c, MARGIN, content_top, content_width, project, general, products, project_height)
    
    # Bottom section: Plotting Specifications
    specs_top = content_top - project_height - 8 * mm
    specs_height = specs_top - MARGIN
    _draw_plotting_specs_section(c, MARGIN, specs_top, content_width, project, products, specs_height)


def _draw_project_info_section(c: canvas.Canvas, x: float, top_y: float, width: float, 
                                project: dict, general: dict, products: list, height: float = None):
    """
    Draw the Project Info section with a box around it.
    """
    section_height = height if height else (top_y - MARGIN)
    
    # Draw section box
    _draw_section_box(c, x, top_y - section_height, width, section_height, "Project Info")
    
    # Content area
    content_x = x + BOX_PADDING
    content_y = top_y - 25 * mm  # Below header
    line_height = 14 * mm
    
    # Project details - customize these based on your data structure
    project_name = general.get("name", "N/A")
    project_id = project.get("id", "N/A")
    client = general.get("client", "N/A")
    date_created = general.get("dateCreated", "N/A")
    num_sails = len(products)
    
    details = [
        ("Customer:", client),
        ("Project Name:", project_name),
        ("Project ID:", str(project_id)),
        ("Date Created:", date_created),
        ("Number of Sails:", str(num_sails)),
        # Add more fields as needed
    ]
    
    c.setFont("Arial", MEDIUM_FONT)
    for label, value in details:
        c.setFont("Arial-Bold", MEDIUM_FONT)
        c.drawString(content_x, content_y, label)
        c.setFont("Arial", MEDIUM_FONT)
        c.drawString(content_x + 100 * mm, content_y, str(value))
        content_y -= line_height


def _draw_plotting_specs_section(c: canvas.Canvas, x: float, top_y: float, width: float,
                                  project: dict, products: list, height: float = None):
    """
    Draw the Plotting Specifications section with a box around it.
    Groups sails by colour, with each sail name on its own line but shared fabric/colour info.
    """
    section_height = height if height else 200 * mm
    
    # Draw section box
    _draw_section_box(c, x, top_y - section_height, width, section_height, "PLOTTING SPECIFICATIONS")
    
    # Content area
    content_x = x + BOX_PADDING
    content_y = top_y - 22 * mm
    line_height = 6 * mm
    
    # Per-sail plotting details
    c.setFont("Arial-Bold", 11)
    c.drawString(content_x, content_y, "PLOTTING DETAILS:")
    content_y -= 9 * mm
    
    # Column positions
    col_sail = content_x
    col_fabric = content_x + 28 * mm
    col_colour = content_x + 70 * mm
    col_length = content_x + 110 * mm
    col_plots = content_x + 132 * mm
    col_file = content_x + 152 * mm
    
    # Column headers
    c.setFont("Arial-Bold", 10)
    c.drawString(col_sail, content_y, "Sail")
    c.drawString(col_fabric, content_y, "Fabric")
    c.drawString(col_colour, content_y, "Colour")
    c.drawString(col_length, content_y, "Length")
    c.drawString(col_plots, content_y, "Plots")
    c.drawString(col_file, content_y, "Filename")
    content_y -= 6 * mm
    
    # Group sails by colour
    colour_groups = {}
    for idx, sail in enumerate(products):
        attrs = sail.get("attributes", {})
        colour = attrs.get("colour", "TBD")
        fabric = attrs.get("fabricType", "TBD")
        sail_name = sail.get("name", f"Sail {idx + 1}")
        key = (colour, fabric)
        if key not in colour_groups:
            colour_groups[key] = []
        colour_groups[key].append(sail_name)
    
    # Draw grouped entries
    c.setFont("Arial", 10)
    for (colour, fabric), sail_names in colour_groups.items():
        group_start_y = content_y
        
        # Draw each sail name on its own line
        for i, sail_name in enumerate(sail_names):
            c.drawString(col_sail, content_y, str(sail_name)[:10])
            content_y -= line_height
        
        # Draw shared info on first line of group
        first_line_y = group_start_y
        c.drawString(col_fabric, first_line_y, str(fabric)[:18])
        c.drawString(col_colour, first_line_y, str(colour)[:18])
        # Length (blank line)
        c.line(col_length, first_line_y - 2, col_length + 18 * mm, first_line_y - 2)
        # Plots (blank line)
        c.line(col_plots, first_line_y - 2, col_plots + 16 * mm, first_line_y - 2)
        # Filename (long blank line)
        c.line(col_file, first_line_y - 2, x + width - BOX_PADDING, first_line_y - 2)
        
        # Small gap between groups
        content_y -= 2 * mm
    
    # General options at the bottom of the box
    bottom_y = top_y - section_height + BOX_PADDING + 8 * mm + 50
    checkbox_size = 5 * mm
    
    # Divider line above general options
    c.line(content_x, bottom_y + 12 * mm, x + width - BOX_PADDING, bottom_y + 12 * mm)
    
    # Plot side (default Underside) and Machine (default Gerber) on same line
    c.setFont("Arial-Bold", 10)
    c.drawString(content_x, bottom_y, "Plot:")
    
    c.setFont("Arial", 10)
    # Underside is default (pre-checked with X)
    opt_x = content_x + 20 * mm
    c.rect(opt_x, bottom_y - checkbox_size + 2 * mm, checkbox_size, checkbox_size, stroke=1, fill=0)
    c.line(opt_x, bottom_y - checkbox_size + 2 * mm, opt_x + checkbox_size, bottom_y + 2 * mm)
    c.line(opt_x + checkbox_size, bottom_y - checkbox_size + 2 * mm, opt_x, bottom_y + 2 * mm)
    c.drawString(opt_x + checkbox_size + 3 * mm, bottom_y, "Underside")
    
    opt_x = content_x + 55 * mm
    c.rect(opt_x, bottom_y - checkbox_size + 2 * mm, checkbox_size, checkbox_size, stroke=1, fill=0)
    c.drawString(opt_x + checkbox_size + 3 * mm, bottom_y, "Topside")
    
    # Machine options (below Plot) — align X with Plot checkboxes and increase vertical spacing
    machine_y = bottom_y - 14 * mm
    c.setFont("Arial-Bold", 10)
    c.drawString(content_x, machine_y, "Machine:")
    
    c.setFont("Arial", 10)
    # Gerber is default (pre-checked with X)
    opt_x = content_x + 20 * mm
    c.rect(opt_x, machine_y - checkbox_size + 2 * mm, checkbox_size, checkbox_size, stroke=1, fill=0)
    c.line(opt_x, machine_y - checkbox_size + 2 * mm, opt_x + checkbox_size, machine_y + 2 * mm)
    c.line(opt_x + checkbox_size, machine_y - checkbox_size + 2 * mm, opt_x, machine_y + 2 * mm)
    c.drawString(opt_x + checkbox_size + 3 * mm, machine_y, "Gerber")
    
    opt_x = content_x + 55 * mm
    c.rect(opt_x, machine_y - checkbox_size + 2 * mm, checkbox_size, checkbox_size, stroke=1, fill=0)
    c.drawString(opt_x + checkbox_size + 3 * mm, machine_y, "Pathfinder")
    
    opt_x = content_x + 90 * mm
    c.rect(opt_x, machine_y - checkbox_size + 2 * mm, checkbox_size, checkbox_size, stroke=1, fill=0)
    c.drawString(opt_x + checkbox_size + 3 * mm, machine_y, "Manual")


# =============================================================================
# PAGE 2: QC INSPECTION CHECKLIST
# =============================================================================

def _draw_qc_checklist_page(c: canvas.Canvas, project: dict, general: dict, products: list):
    """
    Draw the QC Inspection Checklist page (Portrait A4).
    """
    # Page title
    c.setFont("Arial-Bold", LARGE_FONT)
    project_name = general.get("name", "N/A")
    c.drawCentredString(PORTRAIT_WIDTH / 2, PORTRAIT_HEIGHT - MARGIN - 12 * mm, f"QC INSPECTION - {project_name}")
    
    # Content metrics
    content_top = PORTRAIT_HEIGHT - MARGIN - 25 * mm
    content_width = PORTRAIT_WIDTH - 2 * MARGIN
    sig_area_height = 22 * mm
    
    # Initial Inspection box (top, small with 3 items) — draw via helper
    init_box_height = 50 * mm
    init_box_y = content_top - init_box_height
    init_items = [
        "Fabric for plotting/cutting",
        "Hardware",
    ]
    _draw_inspection_box(c, MARGIN, init_box_y, content_width, init_box_height, "INITIAL INSPECTION", init_items)
    
    # Final Inspection box (below initial) — draw via helper
    final_top = init_box_y - 8 * mm
    final_height = final_top - (MARGIN + sig_area_height + 8 * mm)
    final_y = MARGIN + sig_area_height + 8 * mm

    checklist_items = [
        "Tenara Tag on A point",
        "Logo Stitched as per Drawings",
        "Pull tabs (on top side) added as per Drawings",
        "Doubler Stitched aesthetically",
        "Spline/Keder reinforced at start & end of Shade Sail",
        "Thread Colour according to Drawing",
        "Pocket Stitched down throughly",
        "Body and intersection seams stitching",
        "Punch holes for plates in required corners",
        "Trace cables on Shade Sail",
        "UFC Pocket stitched according to drawings",
        "Skin dimensions according to Drawing",
        "Clean panels",
        "Disc Plate with Toogle & Tube as per drawings",
        "Kint Seal for DriZ fabric",
        "TG7 Eyelets for Hip & Ridge Skins",
        "Hardware packed in a bag",
        "Pictures' taken of completed job",
    ]

    _draw_inspection_box(c, MARGIN, final_y, content_width, final_height, "FINAL INSPECTION ITEMS", checklist_items)
    
    # Signature area under the box
    sig_y = MARGIN + 4 * mm
    c.setFont("Arial", 10)
    c.drawString(MARGIN, sig_y, "Name: ___________________________")
    c.drawString(MARGIN + 250, sig_y, "Signature: ____________")
    c.drawString(MARGIN + 450, sig_y, "Date: ____________")


# =============================================================================
# PAGE 3+: SAIL DIAGRAM PAGES (Same as Work Model)
# =============================================================================

def _draw_sail_diagram_page(c: canvas.Canvas, project: dict, sail: dict, sail_num: int, total_sails: int):
    """
    Draw the sail diagram page - replicates the work model visualization.
    Landscape A4 layout - diagram on left, info panel on right.
    """
    # Page header (move lower to free top space for diagram)
    c.setFont("Arial-Bold", 14)
    sail_name = sail.get("name", f"Sail {sail_num}")
    header_y = LANDSCAPE_HEIGHT - 6 * mm  # closer to top edge, minimal margin
    c.drawCentredString(LANDSCAPE_WIDTH / 2, header_y, f"SAIL {sail_num}/{total_sails}: {sail_name}")
    
    # Extract geometry using shared function
    geometry = extract_sail_geometry(sail)
    
    # Layout for landscape: diagram on left, info panel on right
    info_box_width = 70 * mm
    draw_area_x = 6 * mm
    draw_area_y = 4 * mm  # reduce top margin for more picture space
    draw_area_width = LANDSCAPE_WIDTH - draw_area_x - MARGIN - info_box_width - 5 * mm
    draw_area_height = LANDSCAPE_HEIGHT - 16 * mm - draw_area_y  # tighten bottom spacing
    
    # Draw the sail diagram (left side)
    # For now, only draw corner info (no sail lines/diagram)
    _draw_sail_shape(c, geometry, draw_area_x, draw_area_y, draw_area_width, draw_area_height, draw_diagram=False)
    
    # Info box on right side
    info_box_x = draw_area_x + draw_area_width + 5 * mm
    info_box_y = 4 * mm
    info_box_height = draw_area_height
    _draw_sail_info_panel(c, sail, geometry, info_box_x, info_box_y, info_box_width, info_box_height)

    # Cable length field at bottom center of the page (space for manual entry)
    c.setFont("Arial-Bold", 14)
    c.setFillColor(black)
    bottom_text_y = MARGIN + 8 * mm
    c.drawCentredString(200, bottom_text_y, "CABLE LENGTH: __________ mm")


import math

def _draw_catenary(c: canvas.Canvas, p1: tuple, p2: tuple, center: tuple, sag_percent: float = 0.05):
    """
    Draw a catenary (curved line with sag) between two points, curving toward center.
    
    Args:
        c: Canvas object
        p1: Start point (x, y)
        p2: End point (x, y)
        center: Center point of sail (x, y) - curve sags toward this
        sag_percent: Sag as percentage of span (0.10 = 10%)
    """
    x1, y1 = p1
    x2, y2 = p2
    cx, cy = center
    
    # Calculate span and midpoint
    dx = x2 - x1
    dy = y2 - y1
    span = math.sqrt(dx**2 + dy**2)
    
    if span == 0:
        return
    
    # Sag amount (perpendicular to the line)
    sag = span * sag_percent
    
    # Midpoint of the edge
    mid_x = (x1 + x2) / 2
    mid_y = (y1 + y2) / 2
    
    # Vector from midpoint toward center
    to_center_x = cx - mid_x
    to_center_y = cy - mid_y
    to_center_mag = math.sqrt(to_center_x**2 + to_center_y**2)
    
    if to_center_mag > 0:
        # Normalize and use as sag direction
        sag_dir_x = to_center_x / to_center_mag
        sag_dir_y = to_center_y / to_center_mag
    else:
        # Fallback to perpendicular
        sag_dir_x = -dy / span
        sag_dir_y = dx / span
    
    # Generate points along the catenary
    num_segments = 20
    path = c.beginPath()
    path.moveTo(x1, y1)
    
    for i in range(1, num_segments + 1):
        t = i / num_segments
        # Linear interpolation along the line
        lx = x1 + t * dx
        ly = y1 + t * dy
        # Parabolic sag (max at midpoint)
        sag_factor = 4 * t * (1 - t)  # Peaks at 0.5
        # Apply sag toward center
        px = lx + sag_dir_x * sag * sag_factor
        py = ly + sag_dir_y * sag * sag_factor
        path.lineTo(px, py)
    
    c.drawPath(path, stroke=1, fill=0)


def _draw_sail_shape(c: canvas.Canvas, geometry: dict, 
                      x: float, y: float, width: float, height: float,
                      draw_diagram: bool = True):
    """
    Draw the sail shape with workpoint catenaries and corner info.
    Only shows internal red catenary lines (no perimeter or diagonal lines).
    """
    positions = geometry["positions"]
    workpoints = geometry["workpoints"]
    edges = geometry["edges"]
    centroid = geometry["centroid"]
    point_order = geometry["point_order"]
    
    if not positions:
        c.setFont("Arial", MEDIUM_FONT)
        c.drawCentredString(x + width / 2, y + height / 2, "No sail geometry available")
        return
    
    # Get transform parameters (reduced padding so sail and corner info can be larger)
    transform = get_transform_params(geometry, x, y, width, height, padding=0.12)

    # Defensive fallback: ensure transform contains expected keys to avoid KeyError
    if not isinstance(transform, dict) or "scale" not in transform:
        # Compute a safe default transform centered in the draw area
        min_x, min_y, max_x, max_y = geometry.get("bbox", (0.0, 0.0, 1.0, 1.0))
        sail_w = max_x - min_x or 1.0
        sail_h = max_y - min_y or 1.0
        safe_scale = min(width / sail_w, height / sail_h) * 0.9
        safe_offset_x = x + (width - sail_w * safe_scale) / 2
        safe_offset_y = y + (height - sail_h * safe_scale) / 2
        transform = {
            "scale": safe_scale,
            "offset_x": safe_offset_x,
            "offset_y": safe_offset_y,
            "min_x": min_x,
            "min_y": min_y,
        }

    scale = transform["scale"]
    offset_x = transform["offset_x"]
    offset_y = transform["offset_y"]
    min_x = transform["min_x"]
    min_y = transform["min_y"]
    
    def to_canvas(point):
        """Transform sail coordinate to canvas coordinate."""
        px = offset_x + (point[0] - min_x) * scale
        py = offset_y + (point[1] - min_y) * scale
        return (px, py)
    
    # Draw centroid
    cx, cy = to_canvas(centroid)
    if draw_diagram:
        c.setStrokeColor(gray)
        c.setFillColor(gray)
        c.circle(cx, cy, 3, stroke=1, fill=1)

    
    # Draw workpoint polygon with catenaries if enabled
    if draw_diagram:
        c.setStrokeColor(black)
        c.setLineWidth(1.5)
        for i in range(len(point_order)):
            a = point_order[i]
            b = point_order[(i + 1) % len(point_order)]
            if a in workpoints and b in workpoints:
                wp1 = to_canvas(workpoints[a])
                wp2 = to_canvas(workpoints[b])
                _draw_catenary(c, wp1, wp2, (cx, cy), sag_percent=0.05)
                
                # Edge label at midpoint (slightly offset for catenary)
                mid_x = (wp1[0] + wp2[0]) / 2
                mid_y = (wp1[1] + wp2[1]) / 2
                # Find edge length from edges list
                edge_key = f"{a}{b}"
                edge_length = None
                for (la, lb), length in edges:
                    if (la == a and lb == b) or (la == b and lb == a):
                        edge_length = length
                        break
                if edge_length:
                    c.setFont("Arial-Bold", 11)
                    c.setFillColor(black)
                    c.drawCentredString(mid_x, mid_y + 5 * mm, f"{a}{b}")
                    c.drawCentredString(mid_x, mid_y - 5 * mm, f"{int(edge_length)}mm")
                    c.setFillColor(black)
    
    # Draw posts/corners and info
    c.setLineWidth(1)
    circle_radius = 8
    for label in point_order:
        if label not in positions:
            continue
        
        pos = positions[label]
        px, py = to_canvas(pos)
        
        # Post circle (black outline, white fill) only if drawing diagram
        if draw_diagram:
            c.setStrokeColor(black)
            c.setFillColor(white)
            c.circle(px, py, circle_radius, stroke=1, fill=1)
        
        # Position label away from center (reduce offset so labels sit closer to corners)
        dx = px - cx
        dy = py - cy
        mag = (dx**2 + dy**2) ** 0.5 or 1
        label_offset = 25
        label_x = px + (dx / mag) * label_offset
        label_y = py + (dy / mag) * label_offset
        
        # Corner label (large, bold)
        c.setFillColor(black)
        c.setFont("Arial-Bold", 16)
        c.drawCentredString(label_x, label_y + 18, label)
        
        # Corner info text (matching DXF work model format exactly)
        info_lines = get_corner_info_text(label, geometry)
        c.setFont("Arial", 9)
        # Start slightly closer to the label so the sail and info can both be larger
        info_y = label_y + 4
        for line in info_lines:
            c.drawCentredString(label_x, info_y, line)
            info_y -= 10
        
        # Workpoint dot and connector only if drawing diagram
        if draw_diagram and label in workpoints:
            wp = workpoints[label]
            wpx, wpy = to_canvas(wp)
            c.setStrokeColor(black)
            c.setFillColor(black)
            c.circle(wpx, wpy, 4, stroke=1, fill=1)
            c.line(px, py, wpx, wpy)


def _draw_sail_info_panel(c: canvas.Canvas, sail: dict, geometry: dict,
                           x: float, y: float, width: float, height: float):
    """
    Draw the sail info panel on the right side (landscape layout).
    Contains all sail specifications and cable length recording area.
    """
    attrs = sail.get("attributes", {})
    
    # Draw outer box
    c.setStrokeColor(black)
    c.setLineWidth(1.5)
    c.rect(x, y, width, height, stroke=1, fill=0)
    
    # Header
    header_height = 8 * mm
    c.setFillColor(lightgrey)
    c.rect(x, y + height - header_height, width, header_height, stroke=1, fill=1)
    c.setFillColor(black)
    c.setFont("Arial-Bold", 10)
    c.drawCentredString(x + width / 2, y + height - header_height + 2 * mm, "SAIL SPECS")
    
    # Content - single column for sidebar
    c.setLineWidth(1)
    content_x = x + 3 * mm
    content_y = y + height - header_height - 6 * mm
    line_height = 5.5 * mm
    
    # Info rows - all key specifications
    # Format cable size with 'mm' suffix when present
    raw_cable_size = attrs.get('cableSize')
    if raw_cable_size is None or raw_cable_size == '':
        cable_size_str = 'N/A'
    else:
        cable_size_str = f"{raw_cable_size}mm"

    info_items = [
        ("Points", str(geometry['point_count'])),
        ("Perimeter", f"{int(geometry['perimeter'])}mm"),
        ("Edge Meter", f"{geometry['edge_meter']}m"),
        ("Fabric", geometry['fabric_type']),
        ("Colour", geometry['colour']),
        ("Exit Point", geometry.get('exit_point') or 'N/A'),
        ("Logo Point", geometry.get('logo_point') or 'None'),
        ("Fold Side", attrs.get('foldSide') or 'N/A'),
        ("Cable Size", cable_size_str),
        ("Thread", attrs.get('threadColour') or 'N/A'),
    ]
    
    # Add pocket size if present
    pocket_size = geometry.get('pocket_size', 0)
    if pocket_size:
        info_items.append(("Pocket Size", f"{int(pocket_size)}mm"))
    
    # Add area if available
    area = attrs.get('area', 0)
    if area:
        info_items.append(("Area", f"{area}m²"))
    
    # Draw info items in single column
    for label, value in info_items:
        c.setFont("Arial-Bold", 8)
        c.drawString(content_x, content_y, f"{label}:")
        c.setFont("Arial", 8)
        c.drawRightString(x + width - 3 * mm, content_y, str(value))
        content_y -= line_height
    
    # Divider line
    content_y -= 2 * mm
    c.line(x + 2 * mm, content_y, x + width - 2 * mm, content_y)
    content_y -= 5 * mm
    
    # Cable Lengths Section
    c.setFont("Arial-Bold", 9)
    c.drawString(content_x, content_y, "CABLES:")
    content_y -= 5 * mm
    
    # Get exit point for default
    exit_point = geometry.get('exit_point') or 'A'
    
    # Table header
    col1 = content_x
    col2 = content_x + 20 * mm
    col3 = content_x + 40 * mm
    
    c.setFont("Arial-Bold", 7)
    c.drawString(col1, content_y, "From")
    c.drawString(col2, content_y, "To")
    c.drawString(col3, content_y, "Length")
    content_y -= 4 * mm
    
    # 4 cable entry rows
    cable_line_height = 6 * mm
    for i in range(4):
        # From field
        if i == 0:
            c.setFont("Arial", 7)
            c.drawString(col1, content_y, exit_point)
        c.line(col1, content_y - 2, col1 + 16 * mm, content_y - 2)
        
        # To field  
        if i == 0:
            c.drawString(col2, content_y, exit_point)
        c.line(col2, content_y - 2, col2 + 16 * mm, content_y - 2)
        
        # Length field
        c.line(col3, content_y - 2, x + width - 3 * mm, content_y - 2)
        
        content_y -= cable_line_height
    
    # Notes section
    content_y -= 2 * mm
    c.line(x + 2 * mm, content_y, x + width - 2 * mm, content_y)
    content_y -= 4 * mm
    c.setFont("Arial-Bold", 8)
    c.drawString(content_x, content_y, "NOTES:")
    content_y -= 4 * mm
    # Blank lines for notes
    while content_y > y + 4 * mm:
        c.line(content_x, content_y, x + width - 3 * mm, content_y)
        content_y -= 4 * mm


# =============================================================================
# DETAILS PAGE (Corner Fittings, Pockets, etc.)
# =============================================================================

def _draw_sail_hardware_page(c: canvas.Canvas, project: dict, sail: dict, sail_num: int, total_sails: int):
    """
    Draw the details page for a sail (Landscape A4).
    Shows diagrams/details for corner fittings and pocket sizes (up to 6 items).
    """
    # Page header
    c.setFont("Arial-Bold", 14)
    sail_name = sail.get("name", f"Sail {sail_num}")
    c.drawCentredString(LANDSCAPE_WIDTH / 2, LANDSCAPE_HEIGHT - MARGIN - 8 * mm, 
                        f"DETAILS - {sail_name} ({sail_num}/{total_sails})")
    
    # Get detail list for this sail (corner fittings + pockets, max 6)
    detail_list = get_detail_list(sail)
    
    if not detail_list:
        c.setFont("Arial", MEDIUM_FONT)
        c.drawCentredString(LANDSCAPE_WIDTH / 2, LANDSCAPE_HEIGHT / 2, "No fabrication details specified for this sail")
        return
    
    # Layout detail items in a grid (3 columns x 2 rows for landscape)
    content_top = LANDSCAPE_HEIGHT - MARGIN - 18 * mm
    content_width = LANDSCAPE_WIDTH - 2 * MARGIN
    content_height = content_top - MARGIN - 5 * mm
    
    # Grid layout: 3 columns, 2 rows for landscape
    cols = 3
    rows = 2
    gap = 8 * mm
    
    item_width = (content_width - (cols - 1) * gap) / cols
    item_height = (content_height - (rows - 1) * gap) / rows
    
    for idx, detail in enumerate(detail_list[:6]):  # Max 6 items
        row = idx // cols
        col = idx % cols
        
        item_x = MARGIN + col * (item_width + gap)
        item_y = content_top - (row + 1) * item_height - row * gap
        
        _draw_detail_box(c, detail, item_x, item_y, item_width, item_height, sail)


def _draw_detail_box(c: canvas.Canvas, detail: dict, 
                      x: float, y: float, width: float, height: float,
                      sail: dict):
    """
    Draw a detail box with diagram placeholder and specifications.
    
    Args:
        detail: Detail dictionary with 'type', 'id', 'name' keys
        x, y, width, height: Box position and dimensions
        sail: Sail dict to extract specific detail specs
    """
    detail_type = detail.get("type", "unknown")
    detail_id = detail.get("id", "unknown")
    detail_name = detail.get("name", detail_id.upper().replace("_", " "))
    
    # Draw box with header
    _draw_section_box(c, x, y, width, height, detail_name)
    
    # Content area below header (reduce header height to free more space for image)
    header_height = 10 * mm
    content_y = y + height - header_height - 6 * mm
    content_height = height - header_height - BOX_PADDING
    
    # Split box: favor diagram height
    diagram_height = content_height * 0.75
    specs_height = content_height * 0.25
    
    # Diagram area (placeholder - will be replaced with actual diagrams)
    diagram_x = x + BOX_PADDING
    diagram_y = y + specs_height + BOX_PADDING
    diagram_w = width - 2 * BOX_PADDING
    diagram_h = diagram_height - BOX_PADDING
    
    # Draw diagram if available (prefer shared manager with SVGs)
    diagram_path = _load_detail_diagram(detail_type, detail_id)
    if diagram_path:
        ext = os.path.splitext(diagram_path)[1].lower()
        if ext == ".svg" and _SVG_ENABLED:
            try:
                drawing = svg2rlg(diagram_path)
                if getattr(drawing, 'width', 0) and getattr(drawing, 'height', 0):
                    dw, dh = float(drawing.width), float(drawing.height)
                    # Compute scale to fit but slightly shrink to avoid hairline strokes touching box edges
                    scale = min(diagram_w / dw, diagram_h / dh)
                    shrink = 0.995  # small inward shrink to avoid edge artifacts
                    scale *= shrink
                    # Add a small inset in device space to keep strokes away from the border
                    inset = 0.5 * mm
                    tx = diagram_x + (diagram_w - dw * scale) / 2.0 + inset
                    ty = diagram_y + (diagram_h - dh * scale) / 2.0 + inset
                    c.saveState()
                    try:
                        c.translate(tx, ty)
                        c.scale(scale, scale)
                        renderPDF.draw(drawing, c, 0, 0)
                    except Exception:
                        # As a fallback, attempt rasterizing the SVG to a PNG and draw as image
                        try:
                            from reportlab.graphics import renderPM  # type: ignore
                            png_data = renderPM.drawToString(drawing, fmt='PNG')
                            # Use a temporary file to draw the PNG
                            import tempfile
                            tf = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
                            tf.write(png_data)
                            tf.flush()
                            tf.close()
                            # Draw raster image scaled to fit inside the diagram box
                            c.drawImage(tf.name, diagram_x + BOX_PADDING, diagram_y + BOX_PADDING,
                                        diagram_w - 2 * BOX_PADDING, diagram_h - 2 * BOX_PADDING, preserveAspectRatio=True, anchor='c')
                        except Exception:
                            # Last-resort placeholder if rasterization fails
                            c.setStrokeColor(lightgrey)
                            c.setDash(5, 5)
                            c.rect(diagram_x, diagram_y, diagram_w, diagram_h, stroke=1, fill=0)
                            c.setDash()
                            c.setFont("Arial", 12)
                            c.setFillColor(gray)
                            c.drawCentredString(diagram_x + diagram_w / 2, diagram_y + diagram_h / 2, f"[{detail_id}]")
                            c.setFillColor(black)
                    finally:
                        c.restoreState()
                else:
                    # Invalid SVG dimensions; draw placeholder
                    c.setStrokeColor(lightgrey)
                    c.setDash(5, 5)
                    c.rect(diagram_x, diagram_y, diagram_w, diagram_h, stroke=1, fill=0)
                    c.setDash()
                    c.setFont("Arial", 12)
                    c.setFillColor(gray)
                    c.drawCentredString(diagram_x + diagram_w / 2, diagram_y + diagram_h / 2, f"[{detail_id}]")
                    c.setFillColor(black)
            except Exception:
                # Fallback to placeholder if SVG render fails
                c.setStrokeColor(lightgrey)
                c.setDash(5, 5)
                c.rect(diagram_x, diagram_y, diagram_w, diagram_h, stroke=1, fill=0)
                c.setDash()
                c.setFont("Arial", 12)
                c.setFillColor(gray)
                c.drawCentredString(diagram_x + diagram_w / 2, diagram_y + diagram_h / 2, f"[{detail_id}]")
                c.setFillColor(black)
        else:
            try:
                # Draw raster or PDF image scaled to fit area
                c.drawImage(diagram_path, diagram_x, diagram_y, diagram_w, diagram_h, preserveAspectRatio=True, anchor='c')
            except Exception:
                # Fallback to placeholder
                c.setStrokeColor(lightgrey)
                c.setDash(5, 5)
                c.rect(diagram_x, diagram_y, diagram_w, diagram_h, stroke=1, fill=0)
                c.setDash()
                c.setFont("Arial", 12)
                c.setFillColor(gray)
                c.drawCentredString(diagram_x + diagram_w / 2, diagram_y + diagram_h / 2, f"[{detail_id}]")
                c.setFillColor(black)
    else:
        # Draw placeholder
        c.setStrokeColor(lightgrey)
        c.setDash(5, 5)
        c.rect(diagram_x, diagram_y, diagram_w, diagram_h, stroke=1, fill=0)
        c.setDash()
        c.setFont("Arial", 12)
        c.setFillColor(gray)
        c.drawCentredString(diagram_x + diagram_w / 2, diagram_y + diagram_h / 2, f"[{detail_id}]")
        c.setFillColor(black)
    
    # Specifications area
    specs_x = x + BOX_PADDING
    specs_y = y + BOX_PADDING
    
    # Get detail-specific specs
    if detail_type == "corner_fitting":
        specs = _get_corner_fitting_specs(detail_id, sail)
    elif detail_type == "pocket":
        specs = _get_pocket_specs(detail, sail)
    elif detail_type == "cable":
        specs = _get_cable_specs(detail_id, sail)
    else:
        specs = [("Type", detail_type)]
    
    c.setFont("Arial", 11)
    spec_y = specs_y + specs_height - 5 * mm
    line_height = 14
    
    for spec_label, spec_value in specs:
        c.setFont("Arial-Bold", 11)
        c.drawString(specs_x, spec_y, f"{spec_label}:")
        c.setFont("Arial", 11)
        # Truncate long values
        value_str = str(spec_value)[:25]
        c.drawString(specs_x + 50 * mm, spec_y, value_str)
        spec_y -= line_height
        
        if spec_y < specs_y:
            break


def _get_corner_fitting_specs(fitting_id: str, sail: dict) -> list:
    """
    Get specifications for a corner fitting type.
    
    Args:
        fitting_id: Fitting identifier (e.g., 'prorig')
        sail: Sail dict for context
        
    Returns:
        List of (label, value) tuples
    """
    # Count how many corners use this fitting
    attrs = sail.get("attributes", {})
    points = attrs.get("points", {})
    
    corner_count = 0
    corner_labels = []
    
    for label, point in points.items():
        if point.get("cornerFitting", "").lower().replace(" ", "_") == fitting_id:
            corner_count += 1
            corner_labels.append(label)
    
    # Simplified specs: only show quantity and which corners (per request)
    specs = [
        ("Quantity", str(corner_count)),
        ("Corners", ", ".join(sorted(corner_labels)) or "-"),
    ]
    
    return specs


def _get_pocket_specs(detail: dict, sail: dict) -> list:
    """
    Get specifications for a pocket based on size.
    
    Args:
        detail: Pocket detail dict with 'size' key
        sail: Sail dict for context
        
    Returns:
        List of (label, value) tuples
    """
    # Support cable-pockets with ids like 'pocket_4' (4mm cable pocket)
    pocket_size = detail.get("size", 0)
    cable_mm = None
    try:
        # Prefer parsing size from id when present
        did = str(detail.get("id", ""))
        cable_mm = int(did.split("_")[-1])
    except Exception:
        pass
    if cable_mm in (4, 5, 6, 8):
        return [("Size", f"{cable_mm}mm cable")]

    # Fallback: treat numeric size as a pocket dimension if provided
    try:
        pocket_val = int(pocket_size)
    except Exception:
        pocket_val = 0
    if pocket_val:
        # Keep minimal specs for simplicity
        return [("Size", f"{pocket_val}mm")]
    
    return [("Size", "TBD")]


def _get_cable_specs(detail_id: str, sail: dict) -> list:
    """
    Get specifications for a cable detail (e.g., 'cable_4').
    Returns a list of (label, value) tuples. Values are placeholders that
    can be updated when you provide real specifications.
    """
    # Extract numeric size from id
    try:
        size = int(detail_id.split('_')[-1])
    except Exception:
        size = None

    # Simplified: only show size for cables
    if size in (4, 5, 6, 8):
        specs = [("Size", f"{size}mm")]
    else:
        specs = [("Size", str(size) if size else "TBD")]

    return specs


# =============================================================================
# DETAIL DIAGRAM LOADING (Placeholder for future implementation)
# =============================================================================

def _load_detail_diagram(detail_type: str, detail_id: str) -> str:
    """
    Load a detail diagram file path via shared detail manager.
    Falls back to product-local diagrams directory if needed.
    """
    # Try shared detail manager first (prefers SVG, supports foldered assets)
    path = get_detail_image(f"{detail_type}_{detail_id}") or get_detail_image(detail_id)
    if path:
        return path

    # Fallback to product-local diagrams
    base_dir = os.path.dirname(__file__)
    product_diagrams = os.path.join(base_dir, "diagrams")
    names = [f"{detail_type}_{detail_id}", detail_id]
    exts = [".svg", ".png", ".jpg", ".jpeg", ".pdf"]
    for name in names:
        for ext in exts:
            p = os.path.join(product_diagrams, name + ext)
            if os.path.exists(p):
                return p
    return None


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def _draw_section_box(c: canvas.Canvas, x: float, y: float, width: float, height: float, title: str):
    """
    Draw a section box with a title header.
    
    Args:
        c: Canvas object
        x: Left x coordinate
        y: Bottom y coordinate
        width: Box width
        height: Box height
        title: Section title text
    """
    header_height = 10 * mm
    
    # Draw outer box
    c.setStrokeColor(black)
    c.setLineWidth(1.5)
    c.rect(x, y, width, height, stroke=1, fill=0)
    
    # Draw header text (left-aligned, using box padding)
    c.setFillColor(black)
    c.setFont("Arial-Bold", 12)
    header_x = x + BOX_PADDING
    header_y = y + height - header_height + 2 * mm
    c.drawString(header_x, header_y, title)
    
    # Reset line width
    c.setLineWidth(1)


def _draw_inspection_box(c: canvas.Canvas, x: float, y: float, width: float, height: float, title: str, items: list):
    """
    Draw an inspection box with a list of items and a QC footer.

    Args:
        c: Canvas
        x, y: bottom-left of box
        width, height: box dimensions
        title: header title
        items: list of strings for each checklist item
    """
    _draw_section_box(c, x, y, width, height, title)

    # Header + content area
    header_height = 10 * mm
    content_top = y + height - header_height - 10 * mm
    content_bottom = y + BOX_PADDING

    content_x = x + BOX_PADDING
    # Column for comments starts at approx this x
    comments_x = x + BOX_PADDING + 110 * mm

    # Starting line height heuristics
    # Smaller boxes get slightly larger default line height
    start_line_h = 12 * mm if height < 70 * mm else 10 * mm
    line_h = start_line_h
    min_line_h = 7 * mm

    # Reserve space for footer (QC Officer + name/sign/date)
    reserved_footer = 18 * mm
    available_space = content_top - (content_bottom + reserved_footer)

    # Reduce line height until items fit or minimum
    while len(items) * line_h > available_space and line_h > min_line_h:
        line_h -= 1 * mm

    # Choose font based on resulting line height
    item_font = 8 if line_h > 8 * mm else 7

    # Draw column headers
    c.setFont("Arial-Bold", 8)
    c.drawString(content_x, content_top + 5 * mm, "Item")
    c.drawString(comments_x, content_top + 5 * mm, "Comments")

    # Draw items
    c.setFont("Arial", item_font)
    checkbox_size = 5 * mm
    row_y = content_top
    for item in items:
        if row_y < content_bottom + reserved_footer:
            break
        # Checkbox
        c.rect(content_x, row_y - checkbox_size + 2 * mm, checkbox_size, checkbox_size, stroke=1, fill=0)
        # Item text
        c.drawString(content_x + checkbox_size + 3 * mm, row_y, item[:140])
        # Comment line
        c.line(comments_x, row_y - 2, x + width - BOX_PADDING, row_y - 2)
        row_y -= line_h

    # Compute footer top Y and ensure it doesn't overlap items
    footer_top = max(row_y - 4 * mm, content_bottom + 4 * mm)

    # Draw inline footer (QC Officer left, QC Checked (date) right)
    c.setFont("Arial-Bold", 8)
    c.drawString(content_x, footer_top, "QC Officer:")
    # line for QC Officer
    line_start = content_x + 30 * mm
    line_end = line_start + 60 * mm
    c.line(line_start, footer_top - 2 * mm, line_end, footer_top - 2 * mm)

    # QC Checked (date) on right
    right_x = x + width - BOX_PADDING - 70 * mm
    c.drawString(right_x, footer_top, "QC Checked (date):")
    date_line_start = right_x + 40 * mm
    date_line_end = x + width - BOX_PADDING - 5 * mm
    c.line(date_line_start, footer_top - 2 * mm, date_line_end, footer_top - 2 * mm)




def _safe_float(value, default=0.0, min_val=None, max_val=None):
    """
    Safely convert a value to float with optional bounds.
    
    Args:
        value: Value to convert
        default: Default if conversion fails
        min_val: Minimum allowed value
        max_val: Maximum allowed value
    
    Returns:
        Float value within bounds
    """
    try:
        result = float(value) if value is not None else default
    except (ValueError, TypeError):
        result = default
    
    if min_val is not None and result < min_val:
        result = min_val
    if max_val is not None and result > max_val:
        result = max_val
    
    return result
