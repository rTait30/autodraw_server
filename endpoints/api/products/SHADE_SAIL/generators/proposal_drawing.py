"""
Proposal Drawing PDF Generator for SHADE_SAIL products.

Generates a simple PDF for proposals containing:
  - One page per sail with:
      - Top view (2D plan view) with catenary edges curving inward
      - Isometric view (3D perspective from SW at 45°) with catenary edges
      - Basic specifications (material, colour, cable, corners if available)
      - Sail shape using workpoints_bisect_rotate (with tension allowance applied)
      - Fabric texture from database (refreshed on each generate)
"""

import os
import tempfile
import math
from datetime import datetime
from flask import send_file, after_this_request, current_app
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.colors import black, white, lightgrey, gray, Color, HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

from .shared import extract_sail_geometry, get_transform_params, transform_point_to_canvas

# Register Cabin fonts (Google Font - same as frontend)
# Look for fonts in static/fonts folder first, then fallback to Helvetica
try:
    import os as _os
    _font_dir = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.dirname(
        _os.path.dirname(_os.path.dirname(_os.path.dirname(__file__)))))), 'static', 'fonts')
    _cabin_regular = _os.path.join(_font_dir, 'Cabin-Regular.ttf')
    _cabin_bold = _os.path.join(_font_dir, 'Cabin-Bold.ttf')
    
    if _os.path.exists(_cabin_regular) and _os.path.exists(_cabin_bold):
        pdfmetrics.registerFont(TTFont('Cabin', _cabin_regular))
        pdfmetrics.registerFont(TTFont('Cabin-Bold', _cabin_bold))
        FONT_REGULAR = 'Cabin'
        FONT_BOLD = 'Cabin-Bold'
    else:
        # Fallback to Helvetica if Cabin not found
        FONT_REGULAR = 'Helvetica'
        FONT_BOLD = 'Helvetica-Bold'
except:
    FONT_REGULAR = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'


# =============================================================================
# CONSTANTS
# =============================================================================

LANDSCAPE_SIZE = landscape(A4)
LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT = LANDSCAPE_SIZE

MARGIN = 12 * mm
LARGE_FONT = 16
MEDIUM_FONT = 11
SMALL_FONT = 9

# Default colours (fallbacks)
DEFAULT_SAIL_FILL = Color(0.75, 0.75, 0.75, alpha=0.9)  # Grey fallback
SAIL_STROKE = Color(0.3, 0.3, 0.3)  # Dark grey outline
SAILTRACK_COLOR = Color(0.8, 0.1, 0.1)  # Red for sail tracks
STRUCTURE_COLOR = Color(0.5, 0.5, 0.5)  # Grey for structure/posts
STRUCTURE_LIGHT = Color(0.7, 0.7, 0.7)  # Lighter grey for highlights
GROUND_COLOR = Color(0.85, 0.82, 0.78)  # Light tan ground


# =============================================================================
# TEXTURE / COLOUR LOOKUP (mimics FabricSelector.jsx logic)
# =============================================================================

def _get_texture_path(fabric_name: str, color_name: str) -> str:
    """
    Build texture path the same way FabricSelector.jsx does:
    /static/textures/{fabricName.toLowerCase().replace(/\s+/g, '')}/{colorName.toLowerCase().replace(/\s+/g, '')}.jpg
    """
    if not fabric_name or not color_name:
        return None
    
    # Normalize names like FabricSelector.jsx does
    fabric_slug = fabric_name.lower().replace(' ', '')
    color_slug = color_name.lower().replace(' ', '')
    
    return f"static/textures/{fabric_slug}/{color_slug}.jpg"


def _get_fabric_texture_and_color(fabric_type: str, colour_name: str) -> tuple:
    """
    Look up fabric texture and colour from database fresh.
    Returns (texture_path_or_None, Color object).
    
    Tries:
    1. texture_path from database if set
    2. Constructed path like FabricSelector.jsx
    3. Falls back to hex_value as Color
    """
    if not fabric_type or not colour_name:
        return None, DEFAULT_SAIL_FILL
    
    try:
        from models import FabricType, FabricColor, db
        
        # Expire all to ensure fresh data
        db.session.expire_all()
        
        # Fresh query
        fabric = db.session.query(FabricType).filter_by(name=fabric_type).first()
        if not fabric:
            return None, DEFAULT_SAIL_FILL
        
        color = db.session.query(FabricColor).filter_by(
            fabric_type_id=fabric.id, 
            name=colour_name
        ).first()
        
        if not color:
            return None, DEFAULT_SAIL_FILL
        
        # Try texture path from database first
        texture_path = None
        if color.texture_path:
            # Database has explicit texture path
            if color.texture_path.startswith('/'):
                texture_path = color.texture_path[1:]  # Remove leading /
            else:
                texture_path = color.texture_path
        else:
            # Construct path like FabricSelector.jsx
            texture_path = _get_texture_path(fabric_type, colour_name)
        
        # Check if texture file exists
        if texture_path:
            # Get absolute path
            static_folder = current_app.static_folder if current_app else 'static'
            if texture_path.startswith('static/'):
                abs_texture_path = os.path.join(os.path.dirname(static_folder), texture_path)
            else:
                abs_texture_path = os.path.join(static_folder, texture_path)
            
            if os.path.exists(abs_texture_path):
                texture_path = abs_texture_path
            else:
                texture_path = None  # File doesn't exist
        
        # Get hex color as fallback (full opacity for richer color)
        hex_color = DEFAULT_SAIL_FILL
        if color.hex_value:
            try:
                base_color = HexColor(color.hex_value)
                hex_color = Color(base_color.red, base_color.green, base_color.blue, alpha=1.0)
            except:
                pass
        
        return texture_path, hex_color
        
    except Exception as e:
        current_app.logger.error(f"Error getting fabric texture: {e}") if current_app else None
        return None, DEFAULT_SAIL_FILL


def _get_fabric_colour(fabric_type: str, colour_name: str) -> Color:
    """Get fabric colour from database. Always fresh query."""
    _, color = _get_fabric_texture_and_color(fabric_type, colour_name)
    return color


def _get_fabric_colour_solid(fabric_type: str, colour_name: str) -> Color:
    """Get solid (non-transparent) fabric colour for strokes. Always fresh from DB."""
    if not fabric_type or not colour_name:
        return SAIL_STROKE
    
    try:
        from models import FabricType, FabricColor, db
        
        db.session.expire_all()
        
        fabric = db.session.query(FabricType).filter_by(name=fabric_type).first()
        if not fabric:
            return SAIL_STROKE
        
        color = db.session.query(FabricColor).filter_by(
            fabric_type_id=fabric.id, 
            name=colour_name
        ).first()
        
        if color and color.hex_value:
            try:
                base_color = HexColor(color.hex_value)
                # Darken slightly for outline
                return Color(
                    max(0, base_color.red * 0.7), 
                    max(0, base_color.green * 0.7), 
                    max(0, base_color.blue * 0.7)
                )
            except:
                pass
        
        return SAIL_STROKE
        
    except Exception:
        return SAIL_STROKE


# =============================================================================
# METADATA
# =============================================================================

def get_metadata():
    """Return generator metadata for discovery."""
    return {
        "id": "proposal_drawing",
        "name": "Proposal Drawing",
        "type": "pdf",
        "client_visible": True  # Show to clients in downloads
    }


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def generate(project, **kwargs):
    """
    Generates a Proposal Drawing PDF for the SHADE_SAIL product.
    Always generates fresh - creates a new PDF file each time from scratch.
    
    Args:
        project: Project dictionary containing general info and products list
        **kwargs: Additional arguments (e.g., download_name)
    
    Returns:
        Flask response with PDF file
    """
    download_name = kwargs.get("download_name")
    if not download_name:
        project_name = project.get("general", {}).get("name", "project").strip()
        # Add timestamp to ensure unique filename and prevent caching
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        download_name = f"{project_name}_proposal_{timestamp}.pdf".replace(" ", "_")

    fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)

    try:
        _build_proposal_pdf(tmp_path, project)
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
    # Aggressive cache prevention headers
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


# =============================================================================
# PDF BUILDER
# =============================================================================

def _build_proposal_pdf(tmp_path: str, project: dict):
    """
    Build the proposal drawing PDF.
    
    Args:
        tmp_path: Path to save the PDF
        project: Project dictionary
    """
    c = canvas.Canvas(tmp_path, pagesize=LANDSCAPE_SIZE)
    
    general = project.get("general", {})
    products = project.get("products", [])
    
    for idx, sail in enumerate(products):
        _draw_sail_page(c, project, general, sail, idx + 1, len(products))
        c.showPage()
    
    c.save()


# =============================================================================
# SAIL PAGE
# =============================================================================

def _draw_sail_page(c: canvas.Canvas, project: dict, general: dict, sail: dict, 
                     sail_num: int, total_sails: int):
    """
    Draw a single sail page with top view, isometric view, and specifications.
    """
    # Header
    _draw_page_header(c, general, sail, sail_num, total_sails)
    
    # Extract geometry
    geometry = extract_sail_geometry(sail)
    attrs = sail.get("attributes", {})
    
    # Layout: Left side = Top View, Right side = Isometric + Specs
    content_top = LANDSCAPE_HEIGHT - MARGIN - 20 * mm
    content_height = content_top - MARGIN - 10 * mm
    
    # Top view area (left 55%)
    top_view_width = (LANDSCAPE_WIDTH - 2 * MARGIN) * 0.55
    top_view_x = MARGIN
    top_view_y = MARGIN + 10 * mm
    top_view_height = content_height
    
    # Right side area (45%)
    right_x = top_view_x + top_view_width + 10 * mm
    right_width = LANDSCAPE_WIDTH - right_x - MARGIN
    
    # Isometric view (top right) - 55% to leave more room for specs
    iso_height = content_height * 0.55
    iso_y = content_top - iso_height
    
    # Specs panel (bottom right) - 10mm gap between views
    specs_height = content_height - iso_height - 10 * mm
    specs_y = MARGIN + 10 * mm
    
    # Draw views
    _draw_top_view(c, geometry, attrs, top_view_x, top_view_y, top_view_width, top_view_height)
    _draw_isometric_view(c, geometry, attrs, right_x, iso_y, right_width, iso_height)
    _draw_specs_panel(c, sail, geometry, right_x, specs_y, right_width, specs_height)
    
    # Footer
    _draw_page_footer(c, project)


def _draw_page_header(c: canvas.Canvas, general: dict, sail: dict, 
                       sail_num: int, total_sails: int):
    """Draw page header with project and sail info."""
    header_y = LANDSCAPE_HEIGHT - MARGIN
    
    # Project name (left)
    c.setFont(FONT_BOLD, LARGE_FONT)
    project_name = general.get("name", "Proposal")
    c.drawString(MARGIN, header_y - 5 * mm, project_name)
    
    # Client name (below project)
    c.setFont(FONT_REGULAR, MEDIUM_FONT)
    client = general.get("client_name", "")
    if client:
        c.drawString(MARGIN, header_y - 12 * mm, f"Client: {client}")
    
    # Sail name and count (right)
    c.setFont(FONT_BOLD, 14)
    sail_name = sail.get("name", f"Sail {sail_num}")
    c.drawRightString(LANDSCAPE_WIDTH - MARGIN, header_y - 5 * mm, 
                      f"{sail_name} ({sail_num}/{total_sails})")
    
    # "PROPOSAL" watermark
    c.setFont(FONT_BOLD, 10)
    c.setFillColor(gray)
    c.drawRightString(LANDSCAPE_WIDTH - MARGIN, header_y - 12 * mm, "PROPOSAL DRAWING")
    c.setFillColor(black)


def _draw_page_footer(c: canvas.Canvas, project: dict):
    """Draw page footer with date."""
    footer_y = MARGIN
    c.setFont(FONT_REGULAR, 8)
    c.setFillColor(gray)
    c.drawString(MARGIN, footer_y, f"Generated: {datetime.now().strftime('%d %b %Y')}")
    c.drawRightString(LANDSCAPE_WIDTH - MARGIN, footer_y, "Subject to final site measurements")
    c.setFillColor(black)


# =============================================================================
# CATENARY CURVE HELPER (shared by both views)
# =============================================================================

def _draw_catenary_curve_inward(c: canvas.Canvas, p1: tuple, p2: tuple, 
                                  center: tuple, sag_ratio: float = 0.08):
    """
    Draw a catenary curve that sags INWARD toward the sail center.
    
    Args:
        c: Canvas object
        p1: Start point (x, y)
        p2: End point (x, y)  
        center: Sail center point (x, y) - curve bows toward this
        sag_ratio: How much the curve sags as a ratio of the distance (0.08 = 8%)
    """
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    length = math.sqrt(dx * dx + dy * dy)
    
    if length < 5:  # Too short for curve
        c.line(p1[0], p1[1], p2[0], p2[1])
        return
    
    # Edge midpoint
    mid_x = (p1[0] + p2[0]) / 2
    mid_y = (p1[1] + p2[1]) / 2
    
    # Direction from midpoint toward center (this is "inward")
    to_center_x = center[0] - mid_x
    to_center_y = center[1] - mid_y
    to_center_len = math.sqrt(to_center_x * to_center_x + to_center_y * to_center_y)
    
    if to_center_len < 1:
        # Edge midpoint is at center, just draw straight line
        c.line(p1[0], p1[1], p2[0], p2[1])
        return
    
    # Normalize direction toward center
    inward_x = to_center_x / to_center_len
    inward_y = to_center_y / to_center_len
    
    # Sag amount
    sag = length * sag_ratio
    
    # Control point is midpoint moved inward by sag amount
    ctrl_x = mid_x + inward_x * sag
    ctrl_y = mid_y + inward_y * sag
    
    # Draw quadratic bezier through control point
    path = c.beginPath()
    path.moveTo(p1[0], p1[1])
    
    # Two control points for smooth cubic bezier
    ctrl1_x = p1[0] + dx * 0.25 + inward_x * sag * 0.5
    ctrl1_y = p1[1] + dy * 0.25 + inward_y * sag * 0.5
    ctrl2_x = p1[0] + dx * 0.75 + inward_x * sag * 0.5
    ctrl2_y = p1[1] + dy * 0.75 + inward_y * sag * 0.5
    
    path.curveTo(ctrl1_x, ctrl1_y, ctrl2_x, ctrl2_y, p2[0], p2[1])
    c.drawPath(path, stroke=1, fill=0)


def _add_catenary_edge_to_path(path, p1: tuple, p2: tuple, center: tuple, 
                                sag_ratio: float, sail_tracks: set, edge_key: str):
    """
    Add an edge to a path - catenary curve for cable edges, straight for sail tracks.
    Used for building clipping paths that follow the actual sail edge (catenary).
    
    Args:
        path: ReportLab path object
        p1: Start point (x, y)
        p2: End point (x, y)
        center: Sail center point for inward direction
        sag_ratio: Catenary sag ratio (e.g., 0.08 for 8%)
        sail_tracks: Set of sail track edge keys (e.g., {'AB', 'CD'})
        edge_key: Edge key like 'AB'
    """
    edge_key_rev = edge_key[::-1]  # Reverse e.g., 'AB' -> 'BA'
    is_sailtrack = edge_key in sail_tracks or edge_key_rev in sail_tracks
    
    if is_sailtrack:
        # Straight line for sail track
        path.lineTo(p2[0], p2[1])
    else:
        # Catenary curve inward toward center
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        length = math.sqrt(dx * dx + dy * dy)
        
        if length < 5:
            path.lineTo(p2[0], p2[1])
            return
        
        # Direction toward center
        mid_x = (p1[0] + p2[0]) / 2
        mid_y = (p1[1] + p2[1]) / 2
        to_center_x = center[0] - mid_x
        to_center_y = center[1] - mid_y
        to_center_len = math.sqrt(to_center_x * to_center_x + to_center_y * to_center_y)
        
        if to_center_len < 1:
            path.lineTo(p2[0], p2[1])
            return
        
        inward_x = to_center_x / to_center_len
        inward_y = to_center_y / to_center_len
        sag = length * sag_ratio
        
        # Cubic bezier control points
        ctrl1_x = p1[0] + dx * 0.25 + inward_x * sag * 0.5
        ctrl1_y = p1[1] + dy * 0.25 + inward_y * sag * 0.5
        ctrl2_x = p1[0] + dx * 0.75 + inward_x * sag * 0.5
        ctrl2_y = p1[1] + dy * 0.75 + inward_y * sag * 0.5
        
        path.curveTo(ctrl1_x, ctrl1_y, ctrl2_x, ctrl2_y, p2[0], p2[1])


# =============================================================================
# TOP VIEW (2D PLAN) - with inward catenaries and workpoints_bisect_rotate
# =============================================================================

def _draw_top_view(c: canvas.Canvas, geometry: dict, attrs: dict,
                    x: float, y: float, width: float, height: float):
    """
    Draw the top view (2D plan view) of the sail with fabric texture/colour.
    Uses workpoints_bisect_rotate (with tension allowance applied) for the sail shape.
    Shows catenary curves curving INWARD on cable edges (non-sailtrack).
    """
    # Section label
    c.setFont(FONT_BOLD, MEDIUM_FONT)
    c.drawString(x, y + height + 3 * mm, "TOP VIEW (PLAN)")
    
    # Draw subtle background
    #c.setFillColor(Color(0.98, 0.98, 0.97))
    #c.setStrokeColor(lightgrey)
    #c.setLineWidth(0.5)
    #c.rect(x, y, width, height, stroke=1, fill=1)
    
    positions = geometry.get("positions", {})
    # Use workpoints_bisect_rotate specifically (as user requested)
    workpoints = geometry.get("workpoints_bisect_rotate", {}) or geometry.get("workpoints", {})
    point_order = geometry.get("point_order", [])
    edges = geometry.get("edges", [])
    points_data = geometry.get("points_data", {})
    centroid = geometry.get("centroid", (0, 0, 0))
    
    if not positions or not point_order:
        c.setFont(FONT_REGULAR, MEDIUM_FONT)
        c.setFillColor(gray)
        c.drawCentredString(x + width / 2, y + height / 2, "No geometry available")
        c.setFillColor(black)
        return
    
    # Get fabric texture and colour fresh from database
    fabric_type = attrs.get("fabricType")
    colour_name = attrs.get("colour")
    texture_path, sail_fill = _get_fabric_texture_and_color(fabric_type, colour_name)
    sail_stroke = _get_fabric_colour_solid(fabric_type, colour_name)
    
    # Get catenary percentage
    catenary_pct = attrs.get("catenary", geometry.get("catenary", 8)) or 8
    catenary_ratio = catenary_pct / 100.0
    
    # Get transform using positions (for consistent bounding box)
    transform = get_transform_params(geometry, x, y, width, height, padding=0.15)
    if not transform or "scale" not in transform:
        return
    
    scale = transform["scale"]
    offset_x = transform["offset_x"]
    offset_y = transform["offset_y"]
    min_x = transform["min_x"]
    min_y = transform["min_y"]
    
    def to_canvas(point):
        if isinstance(point, dict):
            px = offset_x + (point.get("x", 0) - min_x) * scale
            py = offset_y + (point.get("y", 0) - min_y) * scale
        else:
            px = offset_x + (point[0] - min_x) * scale
            py = offset_y + (point[1] - min_y) * scale
        return (px, py)
    
    # Calculate canvas center for catenary direction
    canvas_center = to_canvas(centroid)
    
    # Get sail tracks for highlighting
    sail_tracks = set(attrs.get("sailTracks", []) or [])
    
    # Always use workpoints for sail shape if they exist (they have allowance applied)
    use_workpoints = bool(workpoints)
    sail_positions = workpoints if use_workpoints else positions
    
    # Draw shadow under sail (offset)
    shadow_offset = 3
    path = c.beginPath()
    first = True
    for label in point_order:
        if label in sail_positions:
            pos = sail_positions[label]
            px, py = to_canvas(pos)
            if first:
                path.moveTo(px + shadow_offset, py - shadow_offset)
                first = False
            else:
                path.lineTo(px + shadow_offset, py - shadow_offset)
    path.close()
    c.setFillColor(Color(0, 0, 0, alpha=0.1))
    c.drawPath(path, stroke=0, fill=1)
    
    # Build sail shape path for clipping
    sail_path_points = []
    for label in point_order:
        if label in sail_positions:
            pos = sail_positions[label]
            sail_path_points.append((label, to_canvas(pos)))
    
    # Draw sail with texture if available, otherwise use color
    if texture_path and sail_path_points:
        # Save state, clip to sail shape with catenary edges, draw texture, restore
        c.saveState()
        
        # Create clipping path following catenary curves (not straight lines)
        clip_path = c.beginPath()
        first_pt = sail_path_points[0][1]
        clip_path.moveTo(first_pt[0], first_pt[1])
        
        for i in range(len(sail_path_points)):
            label_a = sail_path_points[i][0]
            p1 = sail_path_points[i][1]
            label_b = sail_path_points[(i + 1) % len(sail_path_points)][0]
            p2 = sail_path_points[(i + 1) % len(sail_path_points)][1]
            edge_key = f"{label_a}{label_b}"
            _add_catenary_edge_to_path(clip_path, p1, p2, canvas_center, 
                                        catenary_ratio, sail_tracks, edge_key)
        
        clip_path.close()
        c.clipPath(clip_path, stroke=0, fill=0)
        
        # Calculate bounding box of sail for texture placement
        sail_xs = [p[1][0] for p in sail_path_points]
        sail_ys = [p[1][1] for p in sail_path_points]
        sail_min_x, sail_max_x = min(sail_xs), max(sail_xs)
        sail_min_y, sail_max_y = min(sail_ys), max(sail_ys)
        sail_w = sail_max_x - sail_min_x
        sail_h = sail_max_y - sail_min_y
        
        try:
            # Draw solid background first to ensure opacity
            c.setFillColor(sail_fill)
            c.rect(sail_min_x - 5, sail_min_y - 5, sail_w + 10, sail_h + 10, stroke=0, fill=1)
            
            # Draw texture image on top
            img = ImageReader(texture_path)
            c.drawImage(img, sail_min_x - 5, sail_min_y - 5, 
                       width=sail_w + 10, height=sail_h + 10,
                       preserveAspectRatio=False, mask=None)
        except Exception as e:
            # Fallback to color if texture fails
            c.setFillColor(sail_fill)
            c.rect(sail_min_x, sail_min_y, sail_w, sail_h, stroke=0, fill=1)
        
        c.restoreState()
        
        # Draw sail outline (no need since edges are drawn with catenaries below)
    else:
        # No texture - draw with solid color using catenary clip path
        path = c.beginPath()
        first = True
        for i in range(len(point_order)):
            label = point_order[i]
            if label not in sail_positions:
                continue
            
            pos = sail_positions[label]
            px, py = to_canvas(pos)
            
            if first:
                path.moveTo(px, py)
                first = False
            else:
                # Add catenary edge
                next_label = point_order[(i + 1) % len(point_order)]
                if next_label in sail_positions:
                    p1 = to_canvas(sail_positions[point_order[(i - 1 + len(point_order)) % len(point_order)]])
                    edge_key = f"{point_order[(i - 1 + len(point_order)) % len(point_order)]}{label}"
                    _add_catenary_edge_to_path(path, p1, (px, py), canvas_center,
                                                catenary_ratio, sail_tracks, edge_key)
        path.close()
        
        c.setFillColor(sail_fill)
        c.setStrokeColor(sail_stroke)
        c.setLineWidth(2)
        c.drawPath(path, stroke=1, fill=1)
    
    # Draw edges with labels and catenaries (curving INWARD toward center)
    for i in range(len(point_order)):
        a = point_order[i]
        b = point_order[(i + 1) % len(point_order)]
        
        if a not in sail_positions or b not in sail_positions:
            continue
        
        p1 = to_canvas(sail_positions[a])
        p2 = to_canvas(sail_positions[b])
        
        # Check if this edge is a sail track
        edge_key = f"{a}{b}"
        edge_key_rev = f"{b}{a}"
        is_sailtrack = edge_key in sail_tracks or edge_key_rev in sail_tracks
        
        if is_sailtrack:
            # Sail track edge - straight, thick red line
            c.setStrokeColor(SAILTRACK_COLOR)
            c.setLineWidth(3.5)
            c.line(p1[0], p1[1], p2[0], p2[1])
        else:
            # Cable edge - draw catenary curve INWARD toward center
            c.setStrokeColor(sail_stroke)
            c.setLineWidth(2)
            _draw_catenary_curve_inward(c, p1, p2, canvas_center, catenary_ratio)
        
        # Edge label at midpoint - use positions for label placement
        if a in positions and b in positions:
            pos_a = to_canvas(positions[a])
            pos_b = to_canvas(positions[b])
            mid_x = (pos_a[0] + pos_b[0]) / 2
            mid_y = (pos_a[1] + pos_b[1]) / 2
            
            # Find edge length
            edge_length = None
            for (la, lb), length in edges:
                if (la == a and lb == b) or (la == b and lb == a):
                    edge_length = length
                    break
            
            if edge_length:
                # Draw dimension line with background
                c.setFillColor(white)
                dim_text = f"{int(edge_length)}mm"
                text_width = c.stringWidth(dim_text, FONT_REGULAR, 8)
                c.rect(mid_x - text_width/2 - 2, mid_y - 5, text_width + 4, 10, stroke=0, fill=1)
                
                c.setFillColor(black)
                c.setFont(FONT_REGULAR, 8)
                c.drawCentredString(mid_x, mid_y - 2, dim_text)
    
    # Draw corner points (posts) at positions - structure in grey
    for label in point_order:
        if label not in positions:
            continue
        
        pos = positions[label]
        px, py = to_canvas(pos)
        
        # Get corner info
        point_info = points_data.get(label, {})

        print (f"Point {label} info: {point_info}")  # Debug print

        height_val = point_info.get("height", 0)
        fitting = point_info.get("cornerFitting", "")
        hardware = point_info.get("tensionHardware", "")
        allowance = point_info.get("tensionAllowance", 0)
        structure = point_info.get("Structure", "Pole")
        
        # Check for special points
        extra_tags = []
        if label == geometry.get("exit_point"):
            extra_tags.append("Exit")
        if label == geometry.get("logo_point"):
            extra_tags.append("Logo")
        
        # Draw line from structure (fitting point) to workpoint first (behind circle)
        if label in workpoints:
            wp = workpoints[label]
            wpx, wpy = to_canvas(wp)
            
            # Draw line from fitting point (structure) to workpoint (sail attachment)
            c.setStrokeColor(Color(0.4, 0.4, 0.4))
            c.setLineWidth(1)
            c.setDash([3, 2])
            c.line(px, py, wpx, wpy)
            c.setDash([])
            
            # Draw small workpoint marker (sail attachment point)
            c.setStrokeColor(Color(0.3, 0.3, 0.3))
            c.setFillColor(Color(0.9, 0.9, 0.9))
            c.setLineWidth(1)
            c.circle(wpx, wpy, 4, stroke=1, fill=1)
        
        # Draw outer ring (shadow effect)
        c.setStrokeColor(Color(0, 0, 0, alpha=0.2))
        c.setLineWidth(3)
        c.circle(px, py, 10, stroke=1, fill=0)
        
        # Draw structure/post circle in grey
        c.setStrokeColor(STRUCTURE_COLOR)
        c.setFillColor(white)
        c.setLineWidth(2)
        c.circle(px, py, 8, stroke=1, fill=1)
        
        # Inner highlight
        c.setFillColor(STRUCTURE_LIGHT)
        c.circle(px - 1, py + 1, 4, stroke=0, fill=1)
        
        # Label inside circle
        c.setFillColor(black)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(px, py - 3.5, label)
        
        # Draw corner info text (like DXF work model) - positioned outward from centroid
        cx, cy = canvas_center
        dx = px - cx
        dy = py - cy
        dist = math.sqrt(dx * dx + dy * dy) or 1.0
        ux, uy = dx / dist, dy / dist
        
        # Position info text outward from sail
        info_offset = 18  # Distance from corner circle
        info_x = px + ux * info_offset
        info_y = py + uy * info_offset
        
        # Build info lines
        info_lines = []
        if extra_tags:
            info_lines.append(f"({', '.join(extra_tags)})")
        if height_val:
            info_lines.append(f"H: {int(round(height_val))}mm")
        if fitting:
            info_lines.append(f"Fit: {fitting}")
        if allowance:
            info_lines.append(f"Allow: {int(allowance)}mm")
        if hardware:
            info_lines.append(f"HW: {hardware}")
        if structure:  # Only show if not default Pole
            info_lines.append(f"Struct: {structure}")
        
        if info_lines:
            c.setFont(FONT_REGULAR, 6)
            c.setFillColor(Color(0.3, 0.3, 0.3))
            line_height = 7
            
            # Adjust text alignment based on position relative to center
            for i, line in enumerate(info_lines):
                text_y = info_y - i * line_height
                if ux > 0.3:
                    # Right side - left align
                    c.drawString(info_x, text_y, line)
                elif ux < -0.3:
                    # Left side - right align
                    c.drawRightString(info_x, text_y, line)
                else:
                    # Top or bottom - center
                    c.drawCentredString(info_x, text_y, line)
    
    c.setFillColor(black)  # Reset fill color
    
    # Legend for sail track (if present)
    if sail_tracks:
        legend_y = y + 8 * mm
        legend_x = x + 5 * mm
        
        # Legend box background
        c.setFillColor(Color(1, 1, 1, alpha=0.9))
        c.rect(legend_x - 2, legend_y - 5, 50 * mm, 12, stroke=0, fill=1)
        
        c.setStrokeColor(SAILTRACK_COLOR)
        c.setLineWidth(3)
        c.line(legend_x, legend_y, legend_x + 12 * mm, legend_y)
        c.setFillColor(black)
        c.setFont(FONT_REGULAR, 8)
        c.drawString(legend_x + 14 * mm, legend_y - 2.5, "Sail Track Edge")


# =============================================================================
# ISOMETRIC VIEW (3D - 45° from Southwest) - with catenaries and workpoints
# =============================================================================

def _project_point(p, func):
    """Helper to project a 3D point (x,y,z) or dict using projector function."""
    if isinstance(p, (list, tuple)):
        return func(p[0], p[1], p[2])
    return func(p.get('x',0), p.get('y',0), p.get('z',0))

def _draw_3d_box(c, center, size, orientation_vec, projector, color=STRUCTURE_COLOR, stroke=Color(0.4,0.4,0.4)):
    """
    Draw a 3D box centered at `center` with `size` (w, d, h).
    Oriented such that width is along tangent, depth along normal (away from sail).
    orientation_vec is vector towards sail center (normal points away).
    """
    cx, cy, cz = center
    w, d, h = size
    
    # Normalize orientation vector (u)
    ux, uy = orientation_vec
    dist = math.sqrt(ux*ux + uy*uy) or 1.0
    ux, uy = ux/dist, uy/dist
    
    # Tangent vector (v)
    vx, vy = -uy, ux
    
    # Corner offsets relative to center (x, y)
    # We want depth to go AWAY from sail. So backward along u.
    # corners:
    # Front-Left:  center + w/2 * (-v)
    # Front-Right: center + w/2 * (v)
    # Back-Left:   center + w/2 * (-v) - d * u
    # Back-Right:  center + w/2 * (v) - d * u
    
    dx_w = vx * (w/2)
    dy_w = vy * (w/2)
    dx_d = -ux * d
    dy_d = -uy * d
    
    # Bottom face corners (z = cz - h/2)
    z_bot = cz - h/2
    z_top = cz + h/2
    
    # 8 coordinates
    p1 = (cx - dx_w, cy - dy_w, z_bot) # Front Left Bot
    p2 = (cx + dx_w, cy + dy_w, z_bot) # Front Right Bot
    p3 = (cx + dx_w + dx_d, cy + dy_w + dy_d, z_bot) # Back Right Bot
    p4 = (cx - dx_w + dx_d, cy - dy_w + dy_d, z_bot) # Back Left Bot
    
    p5 = (cx - dx_w, cy - dy_w, z_top) # FL Top
    p6 = (cx + dx_w, cy + dy_w, z_top) # FR Top
    p7 = (cx + dx_w + dx_d, cy + dy_w + dy_d, z_top) # BR Top
    p8 = (cx - dx_w + dx_d, cy - dy_w + dy_d, z_top) # BL Top
    
    vertices = [p1, p2, p3, p4, p5, p6, p7, p8]
    proj_verts = [_project_point(v, projector) for v in vertices]
    
    c.setStrokeColor(stroke)
    c.setLineWidth(0.5)
    c.setLineJoin(1) # Round join
    
    # Simple painter's algo: Back faces, then Side/Front, then Top.
    # Faces: Bottom(0123), Top(4567), Front(0154), Right(1265), Back(2376), Left(3047)
    
    faces = [
        ([0, 1, 2, 3], 0.5), # Bottom
        ([3, 0, 4, 7], 0.7), # Left
        ([2, 3, 7, 6], 0.6), # Back
        ([1, 2, 6, 5], 0.8), # Right
        ([0, 1, 5, 4], 0.9), # Front
        ([4, 5, 6, 7], 1.0), # Top
    ]
    
    # Sort faces by "distance" (high X+Y-Z constitutes far)
    face_depths = []
    for indices, shade_mult in faces:
        # Calculate centroid
        cent_x = sum(vertices[i][0] for i in indices)/len(indices)
        cent_y = sum(vertices[i][1] for i in indices)/len(indices)
        cent_z = sum(vertices[i][2] for i in indices)/len(indices)
        
        # Sort Key: X + Y - Z (High = Far)
        key = cent_x + cent_y - cent_z
        face_depths.append((key, indices, shade_mult))
        
    # Sort descending
    face_depths.sort(key=lambda x: x[0], reverse=True)
    
    for _, indices, shade_mult in face_depths:
        path = c.beginPath()
        first = True
        for i in indices:
            px, py = proj_verts[i]
            if first: path.moveTo(px, py); first=False
            else: path.lineTo(px, py)
        path.close()
        
        # Shade color
        r, g, b = color.red, color.green, color.blue
        shaded = Color(r*shade_mult, g*shade_mult, b*shade_mult)
        c.setFillColor(shaded)
        c.drawPath(path, stroke=1, fill=1)


def _draw_3d_wall(c, p_attach, projector, sail_center):
    """Draw a 3D wall block around the attachment point."""
    px, py, pz = p_attach
    cx, cy = sail_center
    
    # Wall dimensions
    width = 1200
    depth = 250
    
    # Calculate orientation vector (to sail center)
    ux, uy = cx - px, cy - py
    
    # If pz is low (ground mount wall?), extend to ground
    # Otherwise floating wall block
    if pz < 2500:
        h_wall = max(pz + 600, 2400)
        z_center = h_wall / 2
        _draw_3d_box(c, (px, py, z_center), (width, depth, h_wall), (ux, uy), projector, color=Color(0.85, 0.85, 0.85))
    else:
        # Floating block centered on point
        block_h = 2400
        z_center = pz
        _draw_3d_box(c, (px, py, z_center), (width, depth, block_h), (ux, uy), projector, color=Color(0.85, 0.85, 0.85))


def _draw_3d_roof(c, p_attach, projector, sail_center):
    """Draw a 3D roof eave section."""
    px, py, pz = p_attach
    cx, cy = sail_center
    
    width = 1500
    depth = 800
    height = 250
    
    # Calculate orientation vector (to sail center)
    ux, uy = cx - px, cy - py
    
    # Offset roof so attachment is on the fascia
    # The box function centers width and depth on the 'center' point given, but 
    # we want the front face to be at p_attach (roughly).
    # `_draw_3d_box` aligns center with p_attach for width, but depth is pushed BACK from 'center'
    # if we assume 'center' is the front face center?
    # No, `_draw_3d_box` inputs `center` as the geometric center of the box.
    # We want `p_attach` to be on the FRONT face.
    # The front face is at distance d/2 from center in direction (vx, vy)? No normal direction.
    # The normal direction is -u. So Front face is "forward" towards sail.
    # Actually box logic: Front-Left: center + w/2*(-v). Front-Right: center + w/2*(v).
    # This assumes center is at the centroid.
    # The Front face is aligned with center along the normal axis? No, Z axis.
    # Wait, `center` in box function is geometric center.
    # Depth displacement: `dx_d = -ux * d`.
    # P1 (Front) = center ... P3 (Back) = center ... - d*u.
    # So P1/P2/P5/P6 are "Front" relative to the backing displacement `d*u`.
    # This means the provided `center` IS the Front Face Center in terms of depth?
    # Let's check:
    # p1 = cx - dx_w, cy - dy_w, ...
    # p3 = cx + dx_w + dx_d, ...
    # dx_d = -ux * d.
    # So p3 is displaced by -u*d from p2? No.
    # p2 = cx + dx_w...
    # p3 = cx + dx_w - ux*d...
    # So P3 is "behind" P2 along the U vector (towards sail). 
    # Wait. U points TO sail. We want wall BEHIND point relative to sail.
    # So we want to move AWAY from U.
    # Displacement is `-ux * d`. This moves coordinate in direction -U.
    # Correct.
    # So P1/P2/P5/P6 are at `center` (along normal axis).
    # So `center` IS the front face location.
    # Excellent.
    
    # For roof, align top with attachment? Or bottom?
    # Usually attachment is in middle of fascia.
    z_center = pz
    
    _draw_3d_box(c, (px, py, z_center), (width, depth, height), (ux, uy), projector, color=Color(0.7, 0.7, 0.75))
    
    # Add a roof top surface (sloped)
    # Just a larger thin box on top
    overhang = 200
    _draw_3d_box(c, (px, py, z_center + height/2 + 20), (width + 100, depth + overhang, 40), (ux, uy), projector, color=Color(0.5, 0.5, 0.55))


def _draw_3d_pole(c, p_base, p_top, projector, diameter=150):
    """Draw a 3D polygonal cylinder (prism)."""
    bx, by, bz = p_base
    tx, ty, tz = p_top
    
    radius = diameter / 2
    sides = 12
    angle_step = 2 * math.pi / sides
    
    vertices_bot = []
    vertices_top = []
    
    for i in range(sides):
        ang = i * angle_step
        dx = math.cos(ang) * radius
        dy = math.sin(ang) * radius
        vertices_bot.append((bx+dx, by+dy, bz))
        vertices_top.append((tx+dx, ty+dy, tz))
        
    proj_bot = [_project_point(p, projector) for p in vertices_bot]
    proj_top = [_project_point(p, projector) for p in vertices_top]
    
    c.setLineWidth(0.3)
    c.setStrokeColor(Color(0.4, 0.4, 0.4))
    
    # Faces
    faces = []
    for i in range(sides):
        next_i = (i+1)%sides
        
        # Centroid X,Y,Z
        cx = (vertices_bot[i][0] + vertices_bot[next_i][0] + vertices_top[next_i][0] + vertices_top[i][0]) / 4
        cy = (vertices_bot[i][1] + vertices_bot[next_i][1] + vertices_top[next_i][1] + vertices_top[i][1]) / 4
        cz = (vertices_bot[i][2] + vertices_bot[next_i][2] + vertices_top[next_i][2] + vertices_top[i][2]) / 4
        
        key = cx + cy - cz
        faces.append((key, [proj_bot[i], proj_bot[next_i], proj_top[next_i], proj_top[i]], i))
        
    faces.sort(key=lambda x: x[0], reverse=True)
    
    for key, pts, idx in faces:
        path = c.beginPath()
        path.moveTo(pts[0][0], pts[0][1])
        path.lineTo(pts[1][0], pts[1][1])
        path.lineTo(pts[2][0], pts[2][1])
        path.lineTo(pts[3][0], pts[3][1])
        path.close()
        
        # Shading
        ang = idx * angle_step + angle_step/2
        nx, ny = math.cos(ang), math.sin(ang)
        # Light from SW (-1,-1)
        light_x, light_y = -0.707, -0.707
        dot = nx*light_x + ny*light_y
        intensity = 0.5 + 0.4 * (dot + 1)/2
        
        col = STRUCTURE_COLOR
        c.setFillColor(Color(col.red*intensity, col.green*intensity, col.blue*intensity))
        c.drawPath(path, stroke=1, fill=1)
        
    # Cap
    path = c.beginPath()
    path.moveTo(proj_top[0][0], proj_top[0][1])
    for p in proj_top[1:]:
        path.lineTo(p[0], p[1])
    path.close()
    c.setFillColor(STRUCTURE_LIGHT)
    c.drawPath(path, stroke=1, fill=1)

def _draw_isometric_view(c: canvas.Canvas, geometry: dict, attrs: dict,
                          x: float, y: float, width: float, height: float):
    """
    Draw an isometric view (3D perspective) of the sail from 45° southwest.
    Uses workpoints_bisect_rotate (with tension allowance) for sail shape.
    Includes proper poles, catenary edges curving inward, and sail with fabric texture.
    """
    # Section label
    c.setFont(FONT_BOLD, MEDIUM_FONT)
    c.drawString(x, y + height + 3 * mm, "3D VIEW (SW 45°)")
    
    positions = geometry.get("positions", {})
    # Use workpoints_bisect_rotate specifically (as user requested)
    workpoints = geometry.get("workpoints_bisect_rotate", {}) or geometry.get("workpoints", {})
    point_order = geometry.get("point_order", [])
    points_data = geometry.get("points_data", {})
    centroid = geometry.get("centroid", (0, 0, 0))
    print(f"[DEBUG] Isometric view points_data: {points_data}")  # Debug print
    
    if not positions or not point_order:
        c.setFont(FONT_REGULAR, MEDIUM_FONT)
        c.setFillColor(gray)
        c.drawCentredString(x + width / 2, y + height / 2, "No geometry available")
        c.setFillColor(black)
        return
    
    # Get fabric texture and colour fresh from database
    fabric_type = attrs.get("fabricType")
    colour_name = attrs.get("colour")
    texture_path, sail_fill = _get_fabric_texture_and_color(fabric_type, colour_name)
    sail_stroke = _get_fabric_colour_solid(fabric_type, colour_name)
    
    # Get catenary percentage
    catenary_pct = attrs.get("catenary", geometry.get("catenary", 8)) or 8
    catenary_ratio = catenary_pct / 100.0
    
    # Always use workpoints for sail shape if they exist (they have allowance applied)
    use_workpoints = bool(workpoints)
    
    # Build 3D points for posts (always at positions) and sail (at workpoints)
    points_3d_posts = []  # Pole positions
    points_3d_sail = []   # Sail corner positions (workpoints with allowance)
    has_any_height = False
    
    for label in point_order:
        if label not in positions:
            continue
        pos = positions[label]
        if isinstance(pos, dict):
            px, py = pos.get("x", 0), pos.get("y", 0)
        elif isinstance(pos, (list, tuple)) and len(pos) >= 2:
            px, py = pos[0], pos[1]
        else:
            continue
            
        # Get height from points_data
        height_val = float(points_data.get(label, {}).get("height", 0) or 0)
        if height_val > 0:
            has_any_height = True
        points_3d_posts.append((label, float(px), float(py), height_val))
        
        # For sail, use workpoint (has allowance applied)
        if use_workpoints and label in workpoints:
            wp = workpoints[label]
            if isinstance(wp, dict):
                wpx, wpy = wp.get("x", px), wp.get("y", py)
                wpz = wp.get("z", height_val)
            elif isinstance(wp, (list, tuple)) and len(wp) >= 3:
                wpx, wpy, wpz = wp[0], wp[1], wp[2]
            else:
                wpx, wpy, wpz = px, py, height_val
            points_3d_sail.append((label, float(wpx), float(wpy), float(wpz)))
        else:
            points_3d_sail.append((label, float(px), float(py), height_val))
    
    if not points_3d_posts:
        c.setFont(FONT_REGULAR, MEDIUM_FONT)
        c.setFillColor(gray)
        c.drawCentredString(x + width / 2, y + height / 2, "No geometry available")
        c.setFillColor(black)
        return
    
    # If no heights specified, use a default visual height based on sail size
    if not has_any_height:
        # Calculate approximate sail size for default height
        all_x = [p[1] for p in points_3d_posts]
        all_y = [p[2] for p in points_3d_posts]
        sail_span = max(max(all_x) - min(all_x), max(all_y) - min(all_y), 1000)
        default_height = sail_span * 0.4  # 40% of span as default pole height
        points_3d_posts = [(label, px, py, default_height) for label, px, py, _ in points_3d_posts]
        points_3d_sail = [(label, px, py, default_height) for label, px, py, _ in points_3d_sail]
    
    # Calculate sail centroid (2D) for orientation
    sail_cx = sum(p[1] for p in points_3d_sail) / len(points_3d_sail)
    sail_cy = sum(p[2] for p in points_3d_sail) / len(points_3d_sail)
    sail_center_2d = (sail_cx, sail_cy)

    # 45° Southwest isometric projection
    azimuth = math.radians(225)  # 225° = Southwest
    elevation = math.radians(35)  # 35° elevation
    
    cos_az = math.cos(azimuth)
    sin_az = math.sin(azimuth)
    cos_el = math.cos(elevation)
    sin_el = math.sin(elevation)
    
    def to_iso_raw(px, py, pz):
        """Convert 3D point to 2D isometric from SW at 45°."""
        rx = px * cos_az - py * sin_az
        ry = px * sin_az + py * cos_az
        rz = pz
        screen_x = rx
        screen_y = ry * sin_el + rz * cos_el
        return screen_x, screen_y
    
    # Calculate bounds for scaling (include all points)
    raw_points = []
    # Include post tops and bottoms
    for label, px, py, ph in points_3d_posts:
         raw_points.append(to_iso_raw(px, py, 0))
         raw_points.append(to_iso_raw(px, py, ph))

    # Also include sail points
    for label, px, py, pz in points_3d_sail:
        raw_points.append(to_iso_raw(px, py, pz))
        
    iso_xs = [p[0] for p in raw_points]
    iso_ys = [p[1] for p in raw_points]
    
    if not iso_xs or not iso_ys:
        return
    
    iso_min_x = min(iso_xs)
    iso_max_x = max(iso_xs)
    iso_min_y = min(iso_ys)
    iso_max_y = max(iso_ys)
    
    iso_width = iso_max_x - iso_min_x or 1
    iso_height = iso_max_y - iso_min_y or 1
    
    padding = 0.15
    avail_width = width * (1 - 2 * padding)
    avail_height = height * (1 - 2 * padding)
    
    scale = min(avail_width / iso_width, avail_height / iso_height)
    
    center_x = x + width / 2
    center_y = y + height * 0.5
    
    iso_center_x = (iso_min_x + iso_max_x) / 2
    iso_center_y = (iso_min_y + iso_max_y) / 2
    
    def to_canvas_iso(px, py, pz):
        iso_pt = to_iso_raw(px, py, pz)
        return (
            center_x + (iso_pt[0] - iso_center_x) * scale,
            center_y + (iso_pt[1] - iso_center_y) * scale
        )
    
    # Get sail tracks
    sail_tracks = set(attrs.get("sailTracks", []) or [])
    
    # Sort points by depth for proper rendering order (X + Y is a good proxy for depth in SW view)
    sorted_posts = sorted(points_3d_posts, key=lambda p: p[1] + p[2], reverse=True)
    
    # ========== DRAW STRUCTURES (corners - different types based on attachment) ==========
    for label, px, py, pz in sorted_posts:
        # Get attachment type for this corner (default to "Pole")
        point_info = points_data.get(label, {})
        attachment_type = point_info.get("Structure", "Pole")
        
        # Draw different attachment types
        if attachment_type.lower() == "wall":
            _draw_3d_wall(c, (px, py, pz), to_canvas_iso, sail_center_2d)
        elif attachment_type.lower() == "roof":
            _draw_3d_roof(c, (px, py, pz), to_canvas_iso, sail_center_2d)
        else:
            # Default to pole for "Pole" or any other/unknown type
            _draw_3d_pole(c, (px, py, 0), (px, py, pz), to_canvas_iso)
        
        # Draw line from structure top (fitting point) to workpoint (sail attachment)
        if use_workpoints:
            sail_pt_3d = next((p for p in points_3d_sail if p[0] == label), None)
            if sail_pt_3d:
                top_pt = to_canvas_iso(px, py, pz)
                sail_pt = to_canvas_iso(sail_pt_3d[1], sail_pt_3d[2], sail_pt_3d[3])
                
                if abs(sail_pt[0] - top_pt[0]) > 2 or abs(sail_pt[1] - top_pt[1]) > 2:
                    c.setStrokeColor(Color(0.4, 0.4, 0.4))
                    c.setLineWidth(1)
                    c.setDash([2, 2])
                    c.line(top_pt[0], top_pt[1], sail_pt[0], sail_pt[1])
                    c.setDash([])
    
    # ========== DRAW SAIL SHADOW ==========
    shadow_path = c.beginPath()
    first = True
    for label in point_order:
        post = next((p for p in points_3d_posts if p[0] == label), None)
        if post:
            px, py = to_canvas_iso(post[1], post[2], 0)
            if first:
                shadow_path.moveTo(px + 6, py - 4)
                first = False
            else:
                shadow_path.lineTo(px + 6, py - 4)
    shadow_path.close()
    c.setFillColor(Color(0, 0, 0, alpha=0.06))
    c.drawPath(shadow_path, stroke=0, fill=1)
    
    # ========== DRAW SAIL MEMBRANE (with texture if available) ==========
    # Calculate sail center in canvas coordinates for inward catenaries
    sail_canvas_points = []
    for i, label in enumerate(point_order):
        pt_3d = next((p for p in points_3d_sail if p[0] == label), None)
        if pt_3d:
            px, py = to_canvas_iso(pt_3d[1], pt_3d[2], pt_3d[3])
            sail_canvas_points.append((label, (px, py)))
    
    # Calculate sail centroid for inward catenary direction
    if sail_canvas_points:
        scx = sum(p[1][0] for p in sail_canvas_points) / len(sail_canvas_points)
        scy = sum(p[1][1] for p in sail_canvas_points) / len(sail_canvas_points)
        canvas_sail_center = (scx, scy)
    else:
        canvas_sail_center = (center_x, center_y)
    
    # Draw sail with texture if available
    if texture_path and sail_canvas_points:
        # Save state, clip to sail shape with catenary edges, draw texture
        c.saveState()
        
        # Create clipping path following catenary curves
        clip_path = c.beginPath()
        first_pt = sail_canvas_points[0][1]
        clip_path.moveTo(first_pt[0], first_pt[1])
        
        for i in range(len(sail_canvas_points)):
            label_a = sail_canvas_points[i][0]
            p1 = sail_canvas_points[i][1]
            label_b = sail_canvas_points[(i + 1) % len(sail_canvas_points)][0]
            p2 = sail_canvas_points[(i + 1) % len(sail_canvas_points)][1]
            edge_key = f"{label_a}{label_b}"
            _add_catenary_edge_to_path(clip_path, p1, p2, canvas_sail_center, 
                                        catenary_ratio, sail_tracks, edge_key)
        
        clip_path.close()
        c.clipPath(clip_path, stroke=0, fill=0)
        
        # Calculate bounding box for texture placement
        sail_xs = [p[1][0] for p in sail_canvas_points]
        sail_ys = [p[1][1] for p in sail_canvas_points]
        s_min_x, s_max_x = min(sail_xs), max(sail_xs)
        s_min_y, s_max_y = min(sail_ys), max(sail_ys)
        s_w = s_max_x - s_min_x
        s_h = s_max_y - s_min_y
        
        try:
            # Draw solid background first to ensure opacity
            c.setFillColor(sail_fill)
            c.rect(s_min_x - 5, s_min_y - 5, s_w + 10, s_h + 10, stroke=0, fill=1)
            
            # Draw texture image on top
            img = ImageReader(texture_path)
            c.drawImage(img, s_min_x - 5, s_min_y - 5, 
                       width=s_w + 10, height=s_h + 10,
                       preserveAspectRatio=False, mask=None)
        except Exception:
            c.setFillColor(sail_fill)
            c.rect(s_min_x, s_min_y, s_w, s_h, stroke=0, fill=1)
        
        c.restoreState()
    else:
        # No texture - draw with solid color
        path = c.beginPath()
        first = True
        
        if sail_canvas_points:
             first_pt = sail_canvas_points[0][1]
             path.moveTo(first_pt[0], first_pt[1])
             for i in range(len(sail_canvas_points)):
                 label_a = sail_canvas_points[i][0]
                 p1 = sail_canvas_points[i][1]
                 label_b = sail_canvas_points[(i + 1) % len(sail_canvas_points)][0]
                 p2 = sail_canvas_points[(i + 1) % len(sail_canvas_points)][1]
                 edge_key = f"{label_a}{label_b}"
                 _add_catenary_edge_to_path(path, p1, p2, canvas_sail_center, catenary_ratio, sail_tracks, edge_key)
             path.close()
        
        c.setFillColor(sail_fill)
        c.setStrokeColor(sail_stroke)
        c.setLineWidth(1.5)
        c.drawPath(path, stroke=1, fill=1)
    
    # ========== DRAW EDGES (catenary curving INWARD for non-sailtrack, straight for sailtrack) ==========
    for i in range(len(point_order)):
        a = point_order[i]
        b = point_order[(i + 1) % len(point_order)]
        
        # Find connection points
        pa = next((p for p in sail_canvas_points if p[0] == a), None)
        pb = next((p for p in sail_canvas_points if p[0] == b), None)
        
        if not pa or not pb:
            continue
        
        p1 = pa[1]
        p2 = pb[1]
        
        edge_key = f"{a}{b}"
        edge_key_rev = f"{b}{a}"
        is_sailtrack = edge_key in sail_tracks or edge_key_rev in sail_tracks
        
        if is_sailtrack:
            # Sail track edge - straight, thick red line
            c.setStrokeColor(SAILTRACK_COLOR)
            c.setLineWidth(3.5)
            c.line(p1[0], p1[1], p2[0], p2[1])
        else:
            # Cable edge - draw catenary curve INWARD toward sail center
            c.setStrokeColor(sail_stroke)
            c.setLineWidth(2)
            _draw_catenary_curve_inward(c, p1, p2, canvas_sail_center, catenary_ratio)
    
    # ========== DRAW POLE CAPS, LABELS AND CORNER INFO ==========
    for label, px, py, pz in sorted_posts:
        top_pt = to_canvas_iso(px, py, pz)
        
        # Get corner info
        point_info = points_data.get(label, {})
        fitting = point_info.get("cornerFitting", "")
        hardware = point_info.get("tensionHardware", "")
        allowance = point_info.get("tensionAllowance", 0)
        structure = point_info.get("Structure", "Pole")
        
        # Check for special points
        extra_tags = []
        if label == geometry.get("exit_point"):
            extra_tags.append("Exit")
        if label == geometry.get("logo_point"):
            extra_tags.append("Logo")
        
        # Pole cap / fitting - grey
        c.setStrokeColor(Color(0.35, 0.35, 0.35))
        c.setFillColor(STRUCTURE_LIGHT)
        c.setLineWidth(1.5)
        c.circle(top_pt[0], top_pt[1], 6, stroke=1, fill=1)
        
        # Shiny highlight
        c.setFillColor(white)
        c.circle(top_pt[0] - 1.5, top_pt[1] + 1.5, 2, stroke=0, fill=1)
        
        # Label
        c.setFillColor(black)
        c.setFont(FONT_BOLD, 9)
        c.drawCentredString(top_pt[0], top_pt[1] - 3, label)
        
        # Corner info text - position above pole cap
        info_y = top_pt[1] + 10
        c.setFont(FONT_REGULAR, 6)
        c.setFillColor(Color(0.3, 0.3, 0.3))
        
        info_lines = []
        if extra_tags:
            info_lines.append(f"({', '.join(extra_tags)})")
        if height_val > 0 and has_any_height:
            height_text = f"H: {int(height_val)}mm" if height_val < 10000 else f"H: {height_val/1000:.1f}m"
            info_lines.append(height_text)
        if fitting:
            info_lines.append(f"Fit: {fitting}")
        if allowance:
            info_lines.append(f"Allow: {int(allowance)}mm")
        if hardware:
            info_lines.append(f"HW: {hardware}")
        
        for i, line in enumerate(info_lines):
            c.drawCentredString(top_pt[0], info_y + i * 7, line)
        
        c.setFillColor(black)
        
        # Draw workpoint marker at sail attachment point
        if use_workpoints:
            sail_pt_3d = next((p for p in points_3d_sail if p[0] == label), None)
            if sail_pt_3d:
                sail_pt_2d = to_canvas_iso(sail_pt_3d[1], sail_pt_3d[2], sail_pt_3d[3])
                if abs(sail_pt_2d[0] - top_pt[0]) > 2 or abs(sail_pt_2d[1] - top_pt[1]) > 2:
                    # Small workpoint marker (sail attachment point)
                    c.setFillColor(Color(0.9, 0.9, 0.9))
                    c.setStrokeColor(Color(0.4, 0.4, 0.4))
                    c.setLineWidth(0.5)
                    c.circle(sail_pt_2d[0], sail_pt_2d[1], 3, stroke=1, fill=1)


# =============================================================================
# SPECIFICATIONS PANEL
# =============================================================================

def _draw_specs_panel(c: canvas.Canvas, sail: dict, geometry: dict,
                       x: float, y: float, width: float, height: float):
    """
    Draw the specifications panel with material, colour, cable info, and corners.
    Only shows information that is available. Includes colour swatch from database.
    Gets fabric info directly from attrs for fresh data.
    """
    # Section label
    c.setFont(FONT_BOLD, MEDIUM_FONT)
    c.setFillColor(black)

    c.drawString(x, y + height + 3 * mm, "SPECIFICATIONS")
    
    # Draw background
    #c.setFillColor(Color(0.99, 0.99, 0.98))
    #c.setStrokeColor(lightgrey)
    #c.setLineWidth(0.5)
    #c.rect(x, y, width, height, stroke=1, fill=1)
    
    attrs = sail.get("attributes", {})
    
    # Get fabric info directly from attrs (fresh, not from geometry cache)
    fabric_type = attrs.get("fabricType")
    colour_name = attrs.get("colour")
    
    # Draw colour/texture swatch at top if we have colour info
    swatch_height = 0
    if fabric_type and colour_name:
        swatch_height = 18 * mm
        swatch_x = x + 4 * mm
        swatch_y = y + height - swatch_height - 4 * mm
        swatch_w = width - 8 * mm
        swatch_h = 15 * mm
        
        # Get fabric texture and colour (fresh from database)
        texture_path, sail_fill = _get_fabric_texture_and_color(fabric_type, colour_name)
        sail_stroke = _get_fabric_colour_solid(fabric_type, colour_name)
        
        # Draw swatch with rounded corners effect
        c.saveState()
        
        # Create rounded rect clipping path
        clip_path = c.beginPath()
        r = 3  # Corner radius
        clip_path.moveTo(swatch_x + r, swatch_y)
        clip_path.lineTo(swatch_x + swatch_w - r, swatch_y)
        clip_path.arcTo(swatch_x + swatch_w - 2*r, swatch_y, swatch_x + swatch_w, swatch_y + 2*r, -90, 90)
        clip_path.lineTo(swatch_x + swatch_w, swatch_y + swatch_h - r)
        clip_path.arcTo(swatch_x + swatch_w - 2*r, swatch_y + swatch_h - 2*r, swatch_x + swatch_w, swatch_y + swatch_h, 0, 90)
        clip_path.lineTo(swatch_x + r, swatch_y + swatch_h)
        clip_path.arcTo(swatch_x, swatch_y + swatch_h - 2*r, swatch_x + 2*r, swatch_y + swatch_h, 90, 90)
        clip_path.lineTo(swatch_x, swatch_y + r)
        clip_path.arcTo(swatch_x, swatch_y, swatch_x + 2*r, swatch_y + 2*r, 180, 90)
        clip_path.close()
        c.clipPath(clip_path, stroke=0, fill=0)
        
        # Draw texture if available, otherwise solid color
        if texture_path:
            try:
                img = ImageReader(texture_path)
                c.drawImage(img, swatch_x, swatch_y, width=swatch_w, height=swatch_h,
                           preserveAspectRatio=False)
            except Exception:
                c.setFillColor(sail_fill)
                c.rect(swatch_x, swatch_y, swatch_w, swatch_h, stroke=0, fill=1)
        else:
            c.setFillColor(sail_fill)
            c.rect(swatch_x, swatch_y, swatch_w, swatch_h, stroke=0, fill=1)
        
        c.restoreState()
        
        # Draw border
        c.setStrokeColor(sail_stroke)
        c.setLineWidth(1.5)
        c.roundRect(swatch_x, swatch_y, swatch_w, swatch_h, 3, stroke=1, fill=0)
        
        # Label on swatch
        c.setFillColor(white)
        c.setFont(FONT_BOLD, 9)
        # Draw text with shadow for readability
        c.setFillColor(Color(0, 0, 0, alpha=0.5))
        c.drawCentredString(swatch_x + swatch_w/2 + 0.5, swatch_y + swatch_h/2 - 3.5, 
                           f"{fabric_type} - {colour_name}")
        c.setFillColor(white)
        c.drawCentredString(swatch_x + swatch_w/2, swatch_y + swatch_h/2 - 3, 
                           f"{fabric_type} - {colour_name}")
    
    # Build specs list (only include available info)
    specs = []
    
    # Basic info
    point_count = attrs.get("pointCount") or geometry.get("point_count", 0)
    if point_count:
        specs.append(("Points", str(point_count)))
    
    perimeter = attrs.get("perimeter") or geometry.get("perimeter", 0)
    if perimeter:
        specs.append(("Perimeter", f"{int(perimeter)}mm"))
    
    edge_meter = attrs.get("edgeMeter") or geometry.get("edge_meter", 0)
    if edge_meter:
        specs.append(("Edge Meter", f"{edge_meter}m"))
    
    # Cable info
    cable_size = attrs.get("cableSize")
    if cable_size:
        specs.append(("Cable Size", f"{cable_size}mm"))
    
    # Sail tracks
    sail_tracks = attrs.get("sailTracks", [])
    if sail_tracks:
        specs.append(("Sail Tracks", ", ".join(sail_tracks)))
    
    # Corner details (fittings only - allowances are on drawings)
    points_data = attrs.get("points", {})
    
    # Collect corner info: just fitting per corner (allowance removed from specs)
    corner_info = []
    for label in sorted(points_data.keys()):
        pt = points_data[label]
        fitting = pt.get("cornerFitting", "")
        if fitting:
            corner_info.append((label, fitting))
    
    if corner_info:
        specs.append(("", ""))  # Spacer
        specs.append(("CORNERS", ""))
        for label, fitting in corner_info:
            specs.append((f"Corner {label}", fitting))
    
    # Tension hardware (only if specified)
    hardware_types = {}
    for label, pt in points_data.items():
        hw = pt.get("tensionHardware")
        if hw:
            if hw not in hardware_types:
                hardware_types[hw] = []
            hardware_types[hw].append(label)
    
    if hardware_types:
        specs.append(("", ""))  # Spacer
        specs.append(("HARDWARE", ""))
        for hw, labels in hardware_types.items():
            specs.append((hw, ", ".join(sorted(labels))))
    
    # Draw specs below swatch
    content_x = x + 4 * mm
    content_y = y + height - swatch_height - 12 * mm
    line_height = 4.5 * mm
    
    for label, value in specs:
        if content_y < y + 4 * mm:
            break
        
        if label == "":
            content_y -= 2 * mm
            continue
        
        if value == "":
            # Section header
            c.setFont(FONT_BOLD, 8)
            c.setFillColor(black)
            c.drawString(content_x, content_y, label)
        else:
            c.setFont(FONT_REGULAR, 8)
            c.setFillColor(black)
            c.drawString(content_x, content_y, f"{label}:")
            c.setFont(FONT_BOLD, 8)
            # Truncate long values
            value_str = str(value)[:18]
            c.drawRightString(x + width - 4 * mm, content_y, value_str)
        
        content_y -= line_height
