"""
Shared sail drawing utilities for SHADE_SAIL generators.

Provides common drawing functions that can be used by both DXF and PDF generators.
"""

import math


def _safe_num(v):
    """Safely convert a value to a float."""
    if v in (None, "", " "):
        return None
    try:
        return float(str(v).strip())
    except (ValueError, TypeError):
        return None


def extract_sail_geometry(sail: dict) -> dict:
    """
    Extract and compute sail geometry from sail attributes.
    
    Args:
        sail: Sail product dictionary with attributes
        
    Returns:
        Dictionary containing:
            - positions: dict of {label: (x, y, z)} for each corner
            - workpoints: dict of {label: (x, y, z)} for each workpoint
            - edges: list of ((label_a, label_b), length) for perimeter edges
            - diagonals: list of ((label_a, label_b), length) for diagonal lines
            - centroid: (cx, cy, cz) tuple
            - bbox: (min_x, min_y, max_x, max_y) tuple
            - point_order: list of corner labels in order (e.g., ['A', 'B', 'C', ...])
            - points_data: dict of point details (height, fitting, hardware, etc.)
    """
    attrs = sail.get("attributes", {})
    positions_raw = attrs.get("positions", {})
    points_raw = attrs.get("points", {})
    dimensions = attrs.get("dimensions", {})
    workpoints_raw = attrs.get("workpoints", {})
    point_count = attrs.get("pointCount") or len(positions_raw)
    
    # Build positions with Z from points
    positions = {}
    xs = []
    ys = []
    
    for label, pos in positions_raw.items():
        x = _safe_num(pos.get("x")) or 0.0
        y = _safe_num(pos.get("y")) or 0.0
        z = _safe_num((points_raw.get(label) or {}).get("height")) or 0.0
        positions[label] = (x, y, z)
        xs.append(x)
        ys.append(y)
    
    # Bounding box
    min_x = min(xs) if xs else 0.0
    max_x = max(xs) if xs else 0.0
    min_y = min(ys) if ys else 0.0
    max_y = max(ys) if ys else 0.0
    
    # Centroid
    centroid_raw = attrs.get("centroid", {})
    centroid = (
        _safe_num(centroid_raw.get("x")) or 0.0,
        _safe_num(centroid_raw.get("y")) or 0.0,
        _safe_num(centroid_raw.get("z")) or 0.0,
    )
    
    # Point order (A, B, C, ...)
    point_order = [chr(65 + i) for i in range(point_count)]
    
    # Perimeter edges
    edges = []
    for i in range(point_count):
        a = point_order[i]
        b = point_order[(i + 1) % point_count]
        edge_key = f"{a}{b}"
        length = _safe_num(dimensions.get(edge_key))
        if length and a in positions and b in positions:
            edges.append(((a, b), length))
    
    # Diagonals
    diagonals = []
    for i in range(point_count):
        for j in range(i + 2, point_count):
            if j == (i + 1) % point_count or i == (j + 1) % point_count:
                continue
            a = point_order[i]
            b = point_order[j]
            diag_key_ab = f"{a}{b}"
            diag_key_ba = f"{b}{a}"
            length = _safe_num(dimensions.get(diag_key_ab)) or _safe_num(dimensions.get(diag_key_ba))
            if length and a in positions and b in positions:
                diagonals.append(((a, b), length))
    
    # Workpoints
    workpoints = {}
    for label, wp in workpoints_raw.items():
        wx = _safe_num(wp.get("x")) or 0.0
        wy = _safe_num(wp.get("y")) or 0.0
        wz = _safe_num(wp.get("z")) or 0.0
        workpoints[label] = (wx, wy, wz)
    
    # Points data (fitting, hardware, etc.)
    points_data = {}
    for label, point in points_raw.items():
        points_data[label] = {
            #"height": _safe_num(point.get("height")) or 0.0,
            #"cornerFitting": point.get("cornerFitting", ""),
            #"tensionHardware": point.get("tensionHardware", ""),
            #"tensionAllowance": _safe_num(point.get("tensionAllowance")) or 0.0,
            #"x": _safe_num(positions_raw.get(label, {}).get("x")) or 0.0,
            #"y": _safe_num(positions_raw.get(label, {}).get("y")) or 0.0,
        }
    
    return {
        "positions": positions,
        "workpoints": workpoints,
        "edges": edges,
        "diagonals": diagonals,
        "centroid": centroid,
        "bbox": (min_x, min_y, max_x, max_y),
        "point_order": point_order,
        "points_data": points_data,
        "point_count": point_count,
        "exit_point": attrs.get("exitPoint"),
        "logo_point": attrs.get("logoPoint"),
        "perimeter": attrs.get("perimeter", 0),
        "edge_meter": attrs.get("edgeMeter", 0),
        "fabric_type": attrs.get("fabricType", ""),
        "colour": attrs.get("colour", ""),
        "pocket_size": attrs.get("pocketSize", 0),
        "fold_side": attrs.get("foldSide", ""),
        "area": attrs.get("area", 0),
        "catenary": attrs.get("catenary", 10),  # Default 10%
    }


def get_corner_info_text(label: str, geometry: dict) -> list:
    """
    Get corner information text lines matching the DXF work model format.
    
    Args:
        label: Corner label (e.g., 'A', 'B', etc.)
        geometry: Geometry dict from extract_sail_geometry
        
    Returns:
        List of text lines for this corner's info
    """
    points_data = geometry.get("points_data", {})
    point_info = points_data.get(label, {})
    
    height = point_info.get("height", 0)
    fitting = point_info.get("cornerFitting", "")
    hardware = point_info.get("tensionHardware", "")
    allowance = point_info.get("tensionAllowance", 0)
    raw_x = point_info.get("x", 0)
    raw_y = point_info.get("y", 0)
    
    # Build extra tags (Exit, Logo)
    extra = []
    if label == geometry.get("exit_point"):
        extra.append("Exit")
    if label == geometry.get("logo_point"):
        extra.append("Logo")
    extra_str = " (" + ", ".join(extra) + ")" if extra else ""
    
    # Format matching DXF work model:
    # {extra_str}
    # H: {height}mm
    # Fitting: {fitting}
    # Hardware: {hardware}
    # Allowance: {allowance}mm
    # X:{x} Y:{y} Z:{z}
    lines = []
    if extra_str:
        lines.append(extra_str)
    #lines.append(f"H: {int(round(height))}mm")
    lines.append(f"Fitting: {fitting}")
    lines.append(f"Hardware: {hardware}")
    #lines.append(f"Allowance: {int(allowance)}mm")
    #lines.append(f"X:{round(raw_x, 2)} Y:{round(raw_y, 2)} Z:{round(height, 2)}")
    
    return lines


def get_detail_list(sail: dict) -> list:
    """
    Extract a list of unique detail items from a sail for the hardware page.
    Only includes corner fittings (not tension hardware) and pocket sizes.
    
    Args:
        sail: Sail product dictionary
        
    Returns:
        List of detail dictionaries with 'type' and 'id' keys
        e.g., [{'type': 'corner_fitting', 'id': 'prorig'}, {'type': 'pocket', 'id': 'pocket_150'}]
    """
    attrs = sail.get("attributes", {})
    points = attrs.get("points", {})
    
    details = []
    seen_ids = set()
    
    # Collect unique corner fittings
    for label, point in points.items():
        corner_fitting = point.get("cornerFitting", "")
        if corner_fitting:
            fitting_id = corner_fitting.lower().replace(" ", "_")
            if fitting_id not in seen_ids:
                seen_ids.add(fitting_id)
                details.append({
                    "type": "corner_fitting",
                    "id": fitting_id,
                    "name": corner_fitting,
                })
    
    # Add pocket detail(s): treat cable and pocket as the same concept.
    # If cables are present, emit pocket details named like "4mm cable pocket" with ids `pocket_4`.
    pocket_size = attrs.get("pocketSize", 0)
    cable_based_pockets_added = False

    # Add cable details if present in attributes (support single cableSize or list 'cables')
    cables = []
    if isinstance(attrs.get('cables'), (list, tuple)):
        cables = attrs.get('cables')
    elif attrs.get('cableSize'):
        cables = [attrs.get('cableSize')]

    for c in cables:
        try:
            cnum = int(c)
        except Exception:
            continue
        if cnum in (4, 5, 6, 8):
            pid = f"pocket_{cnum}"
            if pid not in seen_ids:
                seen_ids.add(pid)
                details.append({
                    "type": "pocket",
                    "id": pid,
                    "name": f"{cnum}mm cable pocket",
                    "size": cnum,
                })
                cable_based_pockets_added = True

    # If cable-based pockets exist, skip explicit pocketSize to avoid duplicates.
    if not cable_based_pockets_added and pocket_size:
        pocket_id = f"pocket_{int(pocket_size)}"
        if pocket_id not in seen_ids:
            seen_ids.add(pocket_id)
            details.append({
                "type": "pocket",
                "id": pocket_id,
                "name": f"Pocket {int(pocket_size)}mm",
                "size": pocket_size,
            })
    
    # Always add seam detail - almost always used
    if "seam" not in seen_ids:
        seen_ids.add("seam")
        details.append({
            "type": "seam",
            "id": "seam",
            "name": "Seam Detail",
        })
    
    # Limit to 6 details max
    return details[:6]


def get_hardware_list(sail: dict) -> list:
    """
    Extract a list of unique hardware items from a sail.
    DEPRECATED: Use get_detail_list instead for the fabrication workbook.
    
    Args:
        sail: Sail product dictionary
        
    Returns:
        List of unique hardware identifiers (e.g., ['prorig', 'snap_hook', ...])
    """
    attrs = sail.get("attributes", {})
    points = attrs.get("points", {})
    
    hardware_set = set()
    
    for label, point in points.items():
        corner_fitting = point.get("cornerFitting", "")
        tension_hardware = point.get("tensionHardware", "")
        
        if corner_fitting:
            hardware_set.add(corner_fitting.lower().replace(" ", "_"))
        if tension_hardware:
            hardware_set.add(tension_hardware.lower().replace(" ", "_"))
    
    return sorted(list(hardware_set))


def transform_point_to_canvas(point: tuple, geometry: dict, 
                               canvas_x: float, canvas_y: float,
                               canvas_width: float, canvas_height: float,
                               padding: float = 0.1) -> tuple:
    """
    Transform a sail coordinate to canvas/PDF coordinates.
    
    Args:
        point: (x, y, z) tuple in sail coordinates
        geometry: Geometry dict from extract_sail_geometry
        canvas_x: Left edge of canvas drawing area
        canvas_y: Bottom edge of canvas drawing area
        canvas_width: Width of canvas drawing area
        canvas_height: Height of canvas drawing area
        padding: Padding ratio (0.1 = 10% padding on each side)
        
    Returns:
        (canvas_x, canvas_y) tuple
    """
    min_x, min_y, max_x, max_y = geometry["bbox"]
    
    sail_width = max_x - min_x
    sail_height = max_y - min_y
    
    if sail_width == 0:
        sail_width = 1
    if sail_height == 0:
        sail_height = 1
    
    # Apply padding
    padded_width = canvas_width * (1 - 2 * padding)
    padded_height = canvas_height * (1 - 2 * padding)
    pad_x = canvas_width * padding
    pad_y = canvas_height * padding
    
    # Calculate scale to fit
    scale_x = padded_width / sail_width
    scale_y = padded_height / sail_height
    scale = min(scale_x, scale_y)
    
    # Center the drawing
    scaled_width = sail_width * scale
    scaled_height = sail_height * scale
    offset_x = canvas_x + pad_x + (padded_width - scaled_width) / 2
    offset_y = canvas_y + pad_y + (padded_height - scaled_height) / 2
    
    # Transform point
    px = offset_x + (point[0] - min_x) * scale
    py = offset_y + (point[1] - min_y) * scale
    
    return (px, py)


def get_transform_params(geometry: dict, 
                          canvas_x: float, canvas_y: float,
                          canvas_width: float, canvas_height: float,
                          padding: float = 0.1) -> dict:
    """
    Get transformation parameters for drawing a sail on a canvas.
    
    Returns dict with scale, offset_x, offset_y, min_x, min_y for manual transformations.
    """
    min_x, min_y, max_x, max_y = geometry["bbox"]
    
    sail_width = max_x - min_x
    sail_height = max_y - min_y
    
    if sail_width == 0:
        sail_width = 1
    if sail_height == 0:
        sail_height = 1
    
    # Apply padding
    padded_width = canvas_width * (1 - 2 * padding)
    padded_height = canvas_height * (1 - 2 * padding)
    pad_x = canvas_width * padding
    pad_y = canvas_height * padding
    
    # Calculate scale to fit
    scale_x = padded_width / sail_width
    scale_y = padded_height / sail_height
    scale = min(scale_x, scale_y)
    
    # Center the drawing
    scaled_width = sail_width * scale
    scaled_height = sail_height * scale
    offset_x = canvas_x + pad_x + (padded_width - scaled_width) / 2
    offset_y = canvas_y + pad_y + (padded_height - scaled_height) / 2
    
    return {
        "scale": scale,
        "offset_x": offset_x,
        "offset_y": offset_y,
        "min_x": min_x,
        "min_y": min_y,
    }
