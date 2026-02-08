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
    Generates a DXF plot file for the COVER product.
    """
    filename = f"PLOT_{project.get('id', 'project')}.dxf"
    return generate_dxf(project, filename)

def _safe_num(v):
    """Convert value to float, returning None if invalid."""
    if v in (None, "", " "):
        return None
    try:
        return float(str(v).strip())
    except (ValueError, TypeError):
        return None


def _basename(panel_key: str) -> str:
    """Extract the base panel name from product-prefixed labels.
    
    Examples:
        "P1_MAIN_Q1" -> "MAIN"
        "P1_SIDE_L_Q1" -> "SIDE_L"
    """
    parts = panel_key.split("_")
    if len(parts) >= 2:
        # Skip first part (P1, P2, etc) and last part (Q1, Q2, etc)
        # Join middle parts
        return "_".join(parts[1:-1]) if len(parts) > 2 else parts[1]
    return panel_key


def _dims_map_from_raw(nested_panels: dict) -> dict:
    """Build dimensions map keyed by the FULL panel label.
    
    Maps panel labels from nest['panels'] keys to (width, height, hasSeam, productIndex).
    Example key: "P1_MAIN_Q1" or "P2_MAIN_TOP_Q1" → (width, height, hasSeam, productIndex)
    """
    out = {}
    for name, rec in (nested_panels or {}).items():
        key = str(name)
        try:
            w = float(rec.get("width") or 0)
            h = float(rec.get("height") or 0)
            seams = rec.get("hasSeam") or "no"
            prod_idx = rec.get("productIndex", 0)
        except (TypeError, ValueError):
            w = h = 0.0
            seams = "no"
            prod_idx = 0
        if w > 0 and h > 0:
            out[key] = (w, h, seams, prod_idx)
    # print("[DXF] dims map keys (sample):", sorted(list(out.keys()))[:10], "... total:", len(out))
    return out


def _draw_stayput_points(msp, x, y, panel_w, panel_h, height, original_width, seam_flag, panel_name, rotated=False):
    """Draw stayput points on the fold line for MAIN panels.
    
    For non-rotated: on the left fold line (at x + height), points along y.
    For rotated: on the bottom fold line (at y + height), points along x.
    Accounts for split panel offsets and 25mm weld allowances.
    
    Note: width attribute becomes panel_h when plotted; length attribute becomes panel_w
    """
    if not rotated:
        # Left fold line x-coordinate
        fold_x = x + height
        
        # Calculate mark positions based on original width only (no seam added)
        # This is the width attribute without any seam allowances
        original_panel_height = original_width
        
        # Marks at 1/4 and 3/4 of original width only
        mark_pos_1 = original_panel_height * 0.25
        mark_pos_2 = original_panel_height * 0.75
        
        # Seam offset - all panels have 20mm seam at bottom
        seam_offset = 20.0  # mm offset from bottom edge where actual drawing starts
        
        # Determine offset for split panels
        offset = 0.0
        weld_allowance = 25.0  # Standard weld allowance added to split panels
        
        if "_TOP" in panel_name or "_BOTTOM" in panel_name:
            # This is a split panel
            if seam_flag == "top":
                # TOP = Main large piece - starts at offset 0 in original coordinates
                offset = 0.0
            elif seam_flag == "bottom":
                # BOTTOM = Small strip piece at the end
                # The current panel_h includes the 25mm weld allowance
                # We need to find where this piece starts in the original panel (without seams)
                actual_piece_height = panel_h - weld_allowance - (2 * seam_offset)  # Remove weld and both seams
                offset = original_panel_height - actual_piece_height
        
        # Calculate actual Y positions in the current panel's coordinate system
        # Start with mark positions relative to original panel, subtract offset for split panels,
        # then add seam_offset to account for the 20mm bottom seam in the actual drawn panel
        actual_y_1 = y + seam_offset + (mark_pos_1 - offset)
        actual_y_2 = y + seam_offset + (mark_pos_2 - offset)
        
        # Only draw points that fall within this panel's bounds
        # Check against the position before seam offset is added
        if 0 <= (mark_pos_1 - offset) <= (panel_h - 2 * seam_offset):
            msp.add_point((fold_x, actual_y_1), dxfattribs={"layer": "PEN"})
        
        if 0 <= (mark_pos_2 - offset) <= (panel_h - 2 * seam_offset):
            msp.add_point((fold_x, actual_y_2), dxfattribs={"layer": "PEN"})
    else:
        # Rotated: fold line at y + height, points along x
        fold_y = y + height
        
        # Marks at 1/4 and 3/4 of original width
        mark_pos_1 = original_width * 0.25
        mark_pos_2 = original_width * 0.75
        
        seam_offset = 20.0
        
        offset = 0.0
        weld_allowance = 25.0
        
        if "_TOP" in panel_name or "_BOTTOM" in panel_name:
            if seam_flag == "top":
                offset = 0.0
            elif seam_flag == "bottom":
                actual_piece_width = panel_w - weld_allowance - (2 * seam_offset)
                offset = original_width - actual_piece_width
        
        actual_x_1 = x + seam_offset + (mark_pos_1 - offset)
        actual_x_2 = x + seam_offset + (mark_pos_2 - offset)
        
        if 0 <= (mark_pos_1 - offset) <= (panel_w - 2 * seam_offset):
            msp.add_point((actual_x_1, fold_y), dxfattribs={"layer": "PEN"})
        
        if 0 <= (mark_pos_2 - offset) <= (panel_w - 2 * seam_offset):
            msp.add_point((actual_x_2, fold_y), dxfattribs={"layer": "PEN"})


def generate_dxf(project, download_name: str):
    """Generate DXF file for COVER product type.
    
    Accepts a standalone plain project dict and draws nested panels.
    
    Expected structure:
      project = {
        "general": { "name": str, ... },
        "products": [ { "name": str, "productIndex": int, "attributes": { ... }, "calculated": { ... } }, ... ],
        "project_attributes": { "nest": {...}, "nested_panels": {...}, ... },
        "project_calculated": { ... }
      }
    
    Args:
        project: Full project dict with general, products, project_attributes, project_calculated
        download_name: Filename for the DXF download
    
    Returns:
        Flask send_file response with DXF file
    """
    doc, msp = new_doc_mm()
    
    # Validate project structure
    if not isinstance(project, dict):
        msp.add_text("COVER DXF: Invalid project structure", dxfattribs={"layer": "PEN", "height": 60}).set_placement((100, 200))
        tmp = tempfile.NamedTemporaryFile(suffix=".dxf", delete=False)
        tmp_path = tmp.name
        tmp.close()
        doc.saveas(tmp_path)
        return send_file(tmp_path, mimetype="application/octet-stream", as_attachment=True, download_name=download_name,
                         max_age=0, etag=False, conditional=False, last_modified=None)
    
    # Extract data from project structure
    project_attrs = project.get("project_attributes") or {}
    nest = project_attrs.get("nest") or {}
    nested_panels = project_attrs.get("nested_panels") or {}
    products_list = project.get("products") or []
    
    # Build product_dims map from products
    product_dims = {}
    for prod in products_list:
        prod_idx = prod.get("productIndex", 0)
        attrs = prod.get("attributes") or {}
        product_dims[prod_idx] = {
            "length": _safe_num(attrs.get("length")) or 0,
            "width": _safe_num(attrs.get("width")) or 0,
            "height": _safe_num(attrs.get("height")) or 0,
            "stayputs": attrs.get("stayputs", False),
        }
    
    # print("[DXF] COVER project structure:", type(project))
    # print("[DXF] Products count:", len(products_list))
    # print("[DXF] Nest panels count:", len(nest.get("panels") or {}))
    
    dims = _dims_map_from_raw(nested_panels)
    panels = nest.get("panels") or {}
    bin_h = float(nest.get("bin_height") or nest.get("fabric_height") or 0)
    total_w = float(nest.get("total_width") or nest.get("required_width") or 0)

    # Compute total width if not provided
    if bin_h > 0 and total_w <= 0:
        for name, pos in panels.items():
            if name not in dims:
                continue
            w, h, _, _ = dims[name]
            if pos.get("rotated"):
                w, h = h, w
            total_w = max(total_w, float(pos.get("x", 0)) + w)

    # --- Collect intervals ---
    # horizontals[y] -> list of (x1, x2)
    # verticals[x]   -> list of (y1, y2)
    horizontals = {}
    verticals = {}

    def add_h(y, x1, x2):
        y = _snap(y)
        a, b = sorted((_snap(x1), _snap(x2)))
        if a == b:
            return
        horizontals.setdefault(y, []).append((a, b))

    def add_v(x, y1, y2):
        x = _snap(x)
        a, b = sorted((_snap(y1), _snap(y2)))
        if a == b:
            return
        verticals.setdefault(x, []).append((a, b))

    # print("[DXF] panels count:", len(panels))

    # Panels + labels
    for name, pos in panels.items():
        base = _basename(str(name))
        if name not in dims:
            # print(f"[DXF] skip: name='{name}' (base='{base}') not in dims")
            continue

        w, h, seam_flag, prod_idx = dims[name]
        if pos.get("rotated"):
            w, h = h, w
        x = float(pos.get("x", 0))
        y = float(pos.get("y", 0))
        
        # Get this panel's product dimensions
        prod_dim = product_dims.get(prod_idx, {})
        length = prod_dim.get("length", 0) or 0
        width = prod_dim.get("width", 0) or 0
        height = prod_dim.get("height", 0) or 0
        has_stayputs = prod_dim.get("stayputs", False)
        has_zips = prod_dim.get("zips", False)
        
        # print(f"[DXF] panel: name='{name}' base='{base}' w={w} h={h} seams={seam_flag} x={x} y={y} rot={bool(pos.get('rotated'))} prod_idx={prod_idx} L={length} W={width} H={height}")

        # helpers to avoid duplication
        def _draw_top_marks(msp, x, y, height, width, length, rotated=False, has_zips=False,
                            half_tick=20, layer="PEN"):
            if not rotated:
                seam_offset = 20.0
                y_pos = y + h - seam_offset
                
                # Unrotated Top: Marks point DOWN (-Y)
                # Left Fold: Diagonal Left-Down
                msp.add_line((x + height,                     y_pos - half_tick),
                            (x + height - half_tick,         y_pos - 2 * half_tick),
                            dxfattribs={"layer": layer})

                # Right Fold: Diagonal Right-Down
                msp.add_line((x + height + length,             y_pos - half_tick),
                            (x + height + length + half_tick, y_pos - 2 * half_tick),
                            dxfattribs={"layer": layer})

                if has_zips:
                    msp.add_line((x,                                y + h -50),
                                (x + height,               y + h -50),
                                dxfattribs={"layer": layer})
            else:
                seam_offset = 20.0
                x_pos = x + w - seam_offset
                
                # Rotated Top (Right Edge): Marks point LEFT (-X)
                # Bottom Fold (Left Flap): Diagonal Bottom-Left
                msp.add_line((x_pos, y + height),
                            (x_pos - half_tick, y + height - half_tick),
                            dxfattribs={"layer": layer})
                
                # Top Fold (Right Flap): Diagonal Top-Left
                msp.add_line((x_pos, y + height + length),
                            (x_pos - half_tick, y + height + length + half_tick),
                            dxfattribs={"layer": layer})

                if has_zips:
                    msp.add_line((x + w - seam_offset -30, y + height),
                                (x + w - seam_offset -30, y + height + length),
                                dxfattribs={"layer": layer})

        def _draw_bottom_marks(msp, x, y, height, width, length, rotated=False, has_zips=False,
                            half_tick=20, layer="PEN"):
            if not rotated:
                seam_offset = 20.0
                y_pos = y + seam_offset
                
                # Unrotated Bottom: Marks point UP (+Y)
                # Left Fold: Diagonal Left-Up
                msp.add_line((x + height,                     y_pos + half_tick),
                            (x + height - half_tick,         y_pos + 2 * half_tick),
                            dxfattribs={"layer": layer})

                # Right Fold: Diagonal Right-Up
                msp.add_line((x + height + length,             y_pos + half_tick),
                            (x + height + length + half_tick, y_pos + 2 * half_tick),
                            dxfattribs={"layer": layer})

                if has_zips:
                    msp.add_line((x,                                y + 50),
                                (x + height,               y + 50),
                                dxfattribs={"layer": layer})
            else:
                seam_offset = 20.0
                x_pos = x + seam_offset
                
                # Rotated Bottom (Left Edge): Marks point RIGHT (+X)
                # Bottom Fold (Left Flap): Diagonal Bottom-Right
                msp.add_line((x_pos, y + height),
                            (x_pos + half_tick, y + height - half_tick),
                            dxfattribs={"layer": layer})

                # Top Fold (Right Flap): Diagonal Top-Right
                msp.add_line((x_pos, y + height + length),
                            (x_pos + half_tick, y + height + length + half_tick),
                            dxfattribs={"layer": layer})

                if has_zips:
                    msp.add_line((x + seam_offset +30, y + height),
                                (x + seam_offset +30, y + height + length),
                                dxfattribs={"layer": layer})

        # fold/seam lines
        if "MAIN" in base or "main" in base.lower():
            # semantics requested:
            # seams == "top"    -> only BOTTOM marks
            # seams == "bottom" -> only TOP marks
            # seams == "no"     -> both TOP and BOTTOM marks
            if seam_flag == "top":
                _draw_bottom_marks(msp, x, y, height, width, length, rotated=pos.get("rotated"), has_zips=has_zips)
            elif seam_flag == "bottom":
                _draw_top_marks(msp, x, y, height, width, length, rotated=pos.get("rotated"), has_zips=has_zips)
            elif seam_flag == "no":
                _draw_top_marks(msp, x, y, height, width, length, rotated=pos.get("rotated"), has_zips=has_zips)
                _draw_bottom_marks(msp, x, y, height, width, length, rotated=pos.get("rotated"), has_zips=has_zips)
            
            # Stayput points (if enabled for this product)
            if has_stayputs:
                _draw_stayput_points(msp, x, y, w, h, height, width, seam_flag, name, rotated=pos.get("rotated"))
        
        # Panel rectangle edges
        add_h(y, x, x + w)             # bottom
        add_h(y + h, x, x + w)         # top
        add_v(x, y, y + h)             # left
        add_v(x + w, y, y + h)         # right

        # Dimension label showing the whole cover's 3D dimensions (length x width x height)
        label = f"{int(round(length))} x {int(round(width))} x {int(round(height))}"
        label_margin = 25.0  # Increased from 5.0 for better spacing
        tx, ty = (x + w - label_margin, y + h - label_margin)
        t = msp.add_text(label, dxfattribs={"layer": "PEN", "height": 20})
        t.dxf.halign = 2  # Right
        t.dxf.valign = 3  # Top
        t.dxf.insert = (tx, ty)
        t.dxf.align_point = (tx, ty)

    # --- Draw merged segments once ---
    # print("[DXF] horizontals rows:", len(horizontals), "verticals cols:", len(verticals))
    # Horizontal segments
    for y, spans in horizontals.items():
        merged_h = merge_intervals(spans)
        if not merged_h:
            # print(f"[DXF] no merged horizontals at y={y}")
            pass
        for x1, x2 in merged_h:
            msp.add_line((x1, y), (x2, y), dxfattribs={"layer": "WHEEL"})

    # Vertical segments
    for x, spans in verticals.items():
        merged_v = merge_intervals(spans)
        if not merged_v:
            # print(f"[DXF] no merged verticals at x={x}")
            pass
        for y1, y2 in merged_v:
            msp.add_line((x, y1), (x, y2), dxfattribs={"layer": "WHEEL"})

    # --- Save to a temp file and return ---
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
