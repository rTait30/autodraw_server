import os
import tempfile
import math
from flask import send_file, after_this_request
from endpoints.api.projects.shared.dxf_utils import new_doc_mm

def get_metadata():
    return {
        "id": "plot_file",
        "name": "Plot File",
        "type": "dxf"
    }

def generate(project, **kwargs):
    """
    Generates a DXF plot file for the SCREEN product.
    Uses pre-calculated data from the project (already enriched from DB).
    """
    filename = f"PLOT_{project.get('id', 'screen')}.dxf"
    return generate_dxf(project, filename)


def _get_eyelet_positions(length: float, edge_config: dict) -> list[float]:
    """
    Returns a list of positions along the edge length based on eyelet configuration.
    
    Args:
        length: The edge length in mm
        edge_config: Dict with eyeletMode ('spacing' or 'count') and eyeletValue
    
    Returns:
        List of positions along the edge (from 0 to length)
    """
    inset = 50.0  # Eyelets are inset 50mm from corners
    
    if length <= inset * 2:
        return [length / 2]
    
    available = length - 2 * inset
    
    mode = edge_config.get("eyeletMode", "spacing")
    value = float(edge_config.get("eyeletValue", 200) or 200)
    
    if mode == "count":
        # Fixed count mode: user specifies exact number of eyelets
        count = max(2, int(value))
        if count <= 1:
            return [length / 2]
        step = available / (count - 1)
        return [inset + i * step for i in range(count)]
    else:
        # Spacing mode (default): user specifies max spacing
        target_spacing = value if value > 0 else 200
        num_spaces = max(1, math.ceil(available / target_spacing))
        step = available / num_spaces
        return [inset + i * step for i in range(num_spaces + 1)]


def _compute_outline_points(width: float, height: float, pocket: float = 100.0) -> list[tuple[float, float]]:
    """
    Computes the cross-shaped outline points for a SCREEN panel.
    """
    return [
        (-pocket, 0),               # Bottom-Left of Left Pocket
        (-pocket, height),          # Top-Left of Left Pocket
        (0, height),                # Inner Corner (Top-Left of Central Rect)
        (0, height + pocket),       # Top-Left of Top Pocket
        (width, height + pocket),   # Top-Right of Top Pocket
        (width, height),            # Inner Corner (Top-Right of Central Rect)
        (width + pocket, height),   # Top-Right of Right Pocket
        (width + pocket, 0),        # Bottom-Right of Right Pocket
        (width, 0),                 # Inner Corner (Bottom-Right of Central Rect)
        (width, -pocket),           # Bottom-Right of Bottom Pocket
        (0, -pocket),               # Bottom-Left of Bottom Pocket
        (0, 0),                     # Inner Corner (Bottom-Left of Central Rect)
        (-pocket, 0)                # Close loop
    ]


def _compute_eyelet_positions(width: float, height: float, edges: dict) -> list[tuple[float, float]]:
    """
    Computes all eyelet center positions based on edge configurations.
    
    Args:
        width: Panel width in mm
        height: Panel height in mm
        edges: Dict with top/bottom/left/right edge configs
    
    Returns:
        List of (x, y) tuples for eyelet center positions
    """
    positions = []
    
    default_edge = {"finish": "none", "eyelet": "none", "eyeletMode": "spacing", "eyeletValue": 200}
    top_edge = {**default_edge, **edges.get("top", {})}
    bottom_edge = {**default_edge, **edges.get("bottom", {})}
    left_edge = {**default_edge, **edges.get("left", {})}
    right_edge = {**default_edge, **edges.get("right", {})}
    
    # Top edge (y = height - 50, eyelets inset 50mm from inner edge)
    if top_edge.get("eyelet", "none") != "none":
        y_pos = height - 50
        for x in _get_eyelet_positions(width, top_edge):
            positions.append((x, y_pos))
    
    # Bottom edge (y = 50)
    if bottom_edge.get("eyelet", "none") != "none":
        y_pos = 50
        for x in _get_eyelet_positions(width, bottom_edge):
            positions.append((x, y_pos))
    
    # Left edge (x = 50)
    if left_edge.get("eyelet", "none") != "none":
        x_pos = 50
        for y in _get_eyelet_positions(height, left_edge):
            positions.append((x_pos, y))
    
    # Right edge (x = width - 50)
    if right_edge.get("eyelet", "none") != "none":
        x_pos = width - 50
        for y in _get_eyelet_positions(height, right_edge):
            positions.append((x_pos, y))
    
    return positions


def generate_dxf(project: dict, download_name: str):
    """
    Generate DXF file for SCREEN product type.
    
    Uses pre-enriched project data - does not call calculations module directly.
    
    Expected structure:
      project = {
        "general": { "name": str, ... },
        "products": [ { "name": str, "productIndex": int, "attributes": { ... }, "calculated": { ... } }, ... ],
        ...
      }
    
    Args:
        project: Full project dict with products containing attributes
        download_name: Filename for the DXF download
    
    Returns:
        Flask send_file response with DXF file
    """
    doc, msp = new_doc_mm()
    
    products = project.get('products', [])
    
    # Fallback for legacy/testing structure
    if not products and 'width' in project:
        products = [{'attributes': project, 'calculated': {}, 'name': 'Screen'}]

    offset_x = 0
    GAP = 500.0  # mm between items
    POCKET = 100.0

    for i, item in enumerate(products):
        attrs = item.get('attributes', {})
        width = float(attrs.get('width', 0))
        height = float(attrs.get('height', 0))
        edges = attrs.get('edges', {})
        
        if width <= 0 or height <= 0:
            continue
        
        # Compute geometry directly from attributes
        points = _compute_outline_points(width, height, POCKET)
        eyelet_positions = _compute_eyelet_positions(width, height, edges)
        
        # Draw Outline (WHEEL layer)
        if points:
            shifted_points = [(p[0] + offset_x, p[1]) for p in points]
            msp.add_lwpolyline(shifted_points, dxfattribs={"layer": "WHEEL"})
        
        # Draw Eyelet markers
        _draw_eyelet_markers(msp, eyelet_positions, width, height, offset_x)
        
        # Add Label
        label = f"{width:.0f}mm x {height:.0f}mm"
        msp.add_text(
            label,
            dxfattribs={"layer": "PEN", "height": 50}
        ).set_placement((offset_x + 125, height - 100))

        # Update offset for next item
        offset_x += width + 200 + GAP

    # Save to temp file
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


def _draw_eyelet_markers(msp, eyelet_positions: list, width: float, height: float, offset_x: float):
    """
    Draw eyelet markers on the DXF.
    
    - Corner eyelets: diagonal lines
    - Interior eyelets: perpendicular lines (vertical for top/bottom, horizontal for left/right)
    """
    # Categorize positions by edge
    top_positions = sorted([p for p in eyelet_positions if abs(p[1] - (height - 50)) < 1], key=lambda v: v[0])
    bottom_positions = sorted([p for p in eyelet_positions if abs(p[1] - 50) < 1], key=lambda v: v[0])
    left_positions = sorted([p for p in eyelet_positions if abs(p[0] - 50) < 1], key=lambda v: v[1])
    right_positions = sorted([p for p in eyelet_positions if abs(p[0] - (width - 50)) < 1], key=lambda v: v[1])

    corners_drawn = set()
    
    def draw_corner(corner: str):
        if corner in corners_drawn:
            return
        corners_drawn.add(corner)
        if corner == 'bl':
            msp.add_line((25 + offset_x, 25), (75 + offset_x, 75), dxfattribs={"layer": "PEN"})
        elif corner == 'tl':
            msp.add_line((25 + offset_x, height - 25), (75 + offset_x, height - 75), dxfattribs={"layer": "PEN"})
        elif corner == 'tr':
            msp.add_line((width - 25 + offset_x, height - 25), (width - 75 + offset_x, height - 75), dxfattribs={"layer": "PEN"})
        elif corner == 'br':
            msp.add_line((width - 25 + offset_x, 25), (width - 75 + offset_x, 75), dxfattribs={"layer": "PEN"})

    # Top side
    for idx, (x, y) in enumerate(top_positions):
        if idx == 0 and abs(x - 50) < 1:
            draw_corner('tl')
        elif idx == len(top_positions) - 1 and abs(x - (width - 50)) < 1:
            draw_corner('tr')
        else:
            msp.add_line((x + offset_x, y - 25), (x + offset_x, y + 25), dxfattribs={"layer": "PEN"})

    # Bottom side
    for idx, (x, y) in enumerate(bottom_positions):
        if idx == 0 and abs(x - 50) < 1:
            draw_corner('bl')
        elif idx == len(bottom_positions) - 1 and abs(x - (width - 50)) < 1:
            draw_corner('br')
        else:
            msp.add_line((x + offset_x, y - 25), (x + offset_x, y + 25), dxfattribs={"layer": "PEN"})

    # Left side
    for idx, (x, y) in enumerate(left_positions):
        if idx == 0 and abs(y - 50) < 1:
            draw_corner('bl')
        elif idx == len(left_positions) - 1 and abs(y - (height - 50)) < 1:
            draw_corner('tl')
        else:
            msp.add_line((x + offset_x - 25, y), (x + offset_x + 25, y), dxfattribs={"layer": "PEN"})

    # Right side
    for idx, (x, y) in enumerate(right_positions):
        if idx == 0 and abs(y - 50) < 1:
            draw_corner('br')
        elif idx == len(right_positions) - 1 and abs(y - (height - 50)) < 1:
            draw_corner('tr')
        else:
            msp.add_line((x + offset_x - 25, y), (x + offset_x + 25, y), dxfattribs={"layer": "PEN"})

