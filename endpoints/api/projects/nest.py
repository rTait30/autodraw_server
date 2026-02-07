# endpoints/api/products/nest.py
from datetime import datetime
from typing import Dict, List, Tuple, Optional

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from rectpack import newPacker
from sqlalchemy.orm.attributes import flag_modified

from endpoints.api.auth.utils import current_user, role_required

nest_bp = Blueprint("nest_bp", __name__)


# ---------- Helpers ----------
def prepare_rectangles(data: dict) -> List[Tuple[int, int, str]]:
    """
    Build a list of (width, height, label) tuples for rectpack.
    - Enforces integers (mm).
    - Preserves original labels like "1_A", "2_B", etc.
    - Optional small-panel grouping to reduce fragmentation.
    """
    try:
        quantity = int(data["quantity"])
        assert quantity > 0
    except Exception:
        raise ValueError("quantity must be a positive integer")

    panels = data.get("panels")
    if not isinstance(panels, dict) or not panels:
        raise ValueError("panels must be a non-empty object")

    # Optional tuning knobs
    small_side_max = int(data.get("small_side_max", 500))   # mm
    group_row_max  = int(data.get("group_row_max", 2000))   # mm

    rectangles: List[Tuple[int, int, str]] = []

    # Build base rectangles
    for i in range(1, quantity + 1):
        for name, dims in panels.items():
            try:
                w = int(round(float(dims["width"])))
                h = int(round(float(dims["height"])))
            except Exception:
                raise ValueError(f"Panel '{name}' width/height must be numeric")
            if w <= 0 or h <= 0:
                raise ValueError(f"Panel '{name}' width/height must be > 0")

            label = f"{i}_{name}"
            rectangles.append((w, h, label))

    # Sort by larger side desc (helps packer)
    rectangles.sort(key=lambda r: max(r[0], r[1]), reverse=True)

    # Simple horizontal grouping for small panels (optional heuristic)
    small_panels = [r for r in rectangles if r[0] < small_side_max and r[1] < small_side_max]
    large_panels = [r for r in rectangles if r not in small_panels]

    grouped_rectangles: List[Tuple[int, int, str]] = []
    while small_panels:
        row_w = 0
        row_h = 0
        row = []
        # Greedy: keep adding until row width limit
        while small_panels and row_w + small_panels[0][0] <= group_row_max:
            w, h, lbl = small_panels.pop(0)
            row_w += w
            row_h = max(row_h, h)
            row.append((w, h, lbl))
        if row:
            grouped_rectangles.append((row_w, row_h, f"group_{len(grouped_rectangles)}"))

    grouped_rectangles.extend(large_panels)
    return grouped_rectangles


def can_fit(rectangles: List[Tuple[int, int, str]], bin_width: int, bin_height: int, allow_rotation: bool):
    packer = newPacker(rotation=allow_rotation)
    for w, h, lbl in rectangles:
        packer.add_rect(w, h, lbl)
    packer.add_bin(bin_width, bin_height)
    packer.pack()

    packed = packer.rect_list()  # list of tuples: (bin_index, x, y, w, h, rid)
    return len(packed) == len(rectangles), packer


def run_rectpack_with_fixed_height(
    rectangles: List[Tuple[int, int, str]],
    fabric_height: int,
    allow_rotation: bool = True,
    fabric_roll_length: int = None
):
    """
    Binary search minimal width to fit all rectangles into bins of height = fabric_height.
    If fabric_roll_length is provided, creates multiple bins (rolls) with max width = fabric_roll_length,
    optimizing to minimize total rolls and then minimize last roll length.
    Returns placements and bin information.
    """
    if fabric_height <= 0:
        raise ValueError("fabric_height must be a positive integer")

    # If roll length optimization requested, pack into multiple fixed-width bins
    if fabric_roll_length and fabric_roll_length > 0:
        return pack_into_multiple_rolls(rectangles, fabric_height, fabric_roll_length, allow_rotation)
    
    # Original single-bin behavior
    min_width = max(r[0] for r in rectangles)  # at least the widest
    max_width = sum(r[0] for r in rectangles)  # worst case: side by side
    best_packer = None
    best_width = None

    lo, hi = min_width, max_width
    while lo <= hi:
        mid = (lo + hi) // 2
        fits, packer = can_fit(rectangles, mid, fabric_height, allow_rotation)
        if fits:
            best_packer = packer
            best_width = mid
            hi = mid - 1
        else:
            lo = mid + 1

    # Safety: try final lo if we never found a fit during search
    if best_packer is None:
        fits, packer = can_fit(rectangles, lo, fabric_height, allow_rotation)
        if not fits:
            raise ValueError("Cannot fit panels in the given height.")
        best_packer = packer
        best_width = lo

    # Extract placements
    placements: Dict[str, Dict[str, int | bool]] = {}
    total_used_w = 0

    for (bin_idx, x, y, w, h, rid) in best_packer.rect_list():
        # Determine rotation by comparing to original tuple
        orig = next(r for r in rectangles if r[2] == rid)
        rotated = (w != orig[0] or h != orig[1])
        placements[rid] = {"x": x, "y": y, "rotated": rotated}
        total_used_w = max(total_used_w, x + w)

    return {
        "panels": placements,
        "total_width": total_used_w,  # actual used width
        "required_width": int(best_width),  # minimal bin width that fits
        "bin_height": int(fabric_height),
        "rotation": bool(allow_rotation),
    }


def pack_into_multiple_rolls(
    rectangles: List[Tuple[int, int, str]],
    fabric_height: int,
    fabric_roll_length: int,
    allow_rotation: bool = True
):
    """
    Pack rectangles into multiple bins (rolls), each with max width = fabric_roll_length.
    Uses rectpack to automatically distribute across bins (rolls).
    Returns bins with their placements.
    """
    import rectpack
    
    #print(f"[DEBUG] pack_into_multiple_rolls called with:")
    print(f"  fabric_height (bin height): {fabric_height}")
    print(f"  fabric_roll_length (bin width): {fabric_roll_length}")
    print(f"  allow_rotation: {allow_rotation}")
    print(f"  num rectangles: {len(rectangles)}")
    
    # Sort rectangles by area (largest first) for better packing
    sorted_rects = sorted(rectangles, key=lambda r: r[0] * r[1], reverse=True)
    
    # Estimate number of bins needed (generous overestimate)
    total_area = sum(r[0] * r[1] for r in sorted_rects)
    bin_area = fabric_roll_length * fabric_height
    estimated_bins = max(3, int((total_area / bin_area) * 1.5) + 2)
    
    #print(f"[DEBUG] Creating packer with {estimated_bins} bins")
    
    # Create single packer with multiple bins
    packer = rectpack.newPacker(rotation=allow_rotation, pack_algo=rectpack.MaxRectsBssf)
    
    # Add multiple bins (rolls)
    for i in range(estimated_bins):
        packer.add_bin(fabric_roll_length, fabric_height)
    
    # Add all rectangles
    for w, h, label in sorted_rects:
        #print(f"[DEBUG] Adding rectangle {label} ({w}x{h})")
        packer.add_rect(w, h, label)
    
    # Pack!
    #print(f"[DEBUG] Packing rectangles...")
    packer.pack()
    
    # Extract placements per bin
    all_placements = {}
    rolls = []
    bins_used = {}
    
    #print(f"[DEBUG] Extracting placements...")
    for bin_idx, x, y, w, h, rid in packer.rect_list():
        #print(f"[DEBUG] Panel {rid} placed in bin {bin_idx} at ({x}, {y}) size {w}x{h}")
        
        # Determine rotation
        orig = next(r for r in rectangles if r[2] == rid)
        rotated = (w != orig[0] or h != orig[1])
        
        if bin_idx not in bins_used:
            bins_used[bin_idx] = {
                'placements': {},
                'max_x': 0,
                'max_y': 0
            }
        
        bins_used[bin_idx]['placements'][rid] = {
            "x": x,
            "y": y,
            "rotated": rotated,
            "bin": bin_idx
        }
        bins_used[bin_idx]['max_x'] = max(bins_used[bin_idx]['max_x'], x + w)
        bins_used[bin_idx]['max_y'] = max(bins_used[bin_idx]['max_y'], y + h)
        
        all_placements[rid] = {
            "x": x,
            "y": y,
            "rotated": rotated,
            "bin": bin_idx
        }
    
    # Build rolls list from actually used bins
    for bin_idx in sorted(bins_used.keys()):
        bin_data = bins_used[bin_idx]
        rolls.append({
            "roll_number": len(rolls) + 1,
            "width": bin_data['max_x'],
            "max_width": fabric_roll_length,
            "height": fabric_height,
            "panels": bin_data['placements'],
            "is_last": False
        })
    
    if rolls:
        rolls[-1]['is_last'] = True
    
    total_fabric = sum(r['width'] for r in rolls)
    
    #print(f"[DEBUG] Packing complete: {len(rolls)} rolls used")
    
    result = {
        "panels": all_placements,
        "total_width": total_fabric,
        "required_width": fabric_roll_length,
        "bin_height": int(fabric_height),
        "rotation": bool(allow_rotation),
        "fabric_roll_length": fabric_roll_length,
        "num_rolls": len(rolls),
        "last_roll_length": rolls[-1]['width'] if rolls else 0,
        "rolls": rolls
    }
    
    return result


# ---------- Generic helpers ----------
def prepare_arbitrary_rectangles(data: dict) -> List[Tuple[int, int, str]]:
    """
    Accepts an object like:
    {
      "rectangles": [
        {"width": 100, "height": 200, "label": "A", "quantity": 2},
        {"width": 150, "height": 150}  # label auto-assigned, quantity default 1
      ],
      "group_small": false,            # optional
      "small_side_max": 500,           # optional if grouping
      "group_row_max": 2000            # optional if grouping
    }

    Returns a list of (w, h, label) tuples. If grouping is enabled, small panels are grouped heuristically
    into rows similar to prepare_rectangles.
    """
    rects = data.get("rectangles")
    if not isinstance(rects, list) or not rects:
        raise ValueError("rectangles must be a non-empty array")

    tuples: List[Tuple[int, int, str]] = []
    auto_index = 1
    for item in rects:
        if not isinstance(item, dict):
            raise ValueError("Each rectangle must be an object")
        try:
            w = int(round(float(item["width"])))
            h = int(round(float(item["height"])))
        except Exception:
            raise ValueError("Rectangle width/height must be numeric")
        if w <= 0 or h <= 0:
            raise ValueError("Rectangle width/height must be > 0")
        qty = int(item.get("quantity", 1))
        if qty <= 0:
            raise ValueError("quantity must be positive")
        label_base = str(item.get("label") or f"R{auto_index}")
        for i in range(1, qty + 1):
            label = label_base if qty == 1 else f"{label_base}_{i}"
            tuples.append((w, h, label))
        auto_index += 1

    # Optional heuristic grouping, if requested
    if bool(data.get("group_small", False)):
        small_side_max = int(data.get("small_side_max", 500))
        group_row_max = int(data.get("group_row_max", 2000))
        tuples.sort(key=lambda r: max(r[0], r[1]), reverse=True)
        small_panels = [r for r in tuples if r[0] < small_side_max and r[1] < small_side_max]
        large_panels = [r for r in tuples if r not in small_panels]
        grouped: List[Tuple[int, int, str]] = []
        while small_panels:
            row_w = 0
            row_h = 0
            row = []
            while small_panels and row_w + small_panels[0][0] <= group_row_max:
                w, h, lbl = small_panels.pop(0)
                row_w += w
                row_h = max(row_h, h)
                row.append((w, h, lbl))
            if row:
                grouped.append((row_w, row_h, f"group_{len(grouped)}"))
        grouped.extend(large_panels)
        return grouped

    return tuples


def pack_into_fixed_bin(
    rectangles: List[Tuple[int, int, str]],
    bin_width: int,
    bin_height: int,
    allow_rotation: bool = True,
):
    """
    Pack rectangles into a single fixed-size bin. Raises ValueError if they cannot all fit.
    Returns placements and used dimensions.
    """
    if bin_width <= 0 or bin_height <= 0:
        raise ValueError("bin_width and bin_height must be positive integers")

    fits, packer = can_fit(rectangles, bin_width, bin_height, allow_rotation)
    if not fits:
        raise ValueError("Cannot fit rectangles into the fixed bin size")

    placements: Dict[str, Dict[str, int | bool]] = {}
    used_w = 0
    used_h = 0
    for (bin_idx, x, y, w, h, rid) in packer.rect_list():
        placements[rid] = {"x": x, "y": y, "rotated": (w, h) != next(r[:2] for r in rectangles if r[2] == rid)}
        used_w = max(used_w, x + w)
        used_h = max(used_h, y + h)

    return {
        "panels": placements,
        "used_width": int(used_w),
        "used_height": int(used_h),
        "bin_width": int(bin_width),
        "bin_height": int(bin_height),
        "rotation": bool(allow_rotation),
    }


# ---------- Route ----------
@nest_bp.route("/nest_panels", methods=["POST"])
@role_required("estimator", "designer", "client")
def nest_panels():
    """
    Body:
    {
      "quantity": 2,
      "panels": {
        "A": {"width": 1000, "height": 800},
        "B": {"width": 600, "height": 400}
      },
      "fabricWidth": 3200,               # required, mm (height of bin)
      "allowRotation": true,             # optional, default true
      "small_side_max": 500,             # optional
      "group_row_max": 2000              # optional
    }
    """
    # Ensure user is authenticated (and available if you need role checks later)
    user = current_user(required=True)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        data = request.get_json(force=True) or {}
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    # Validate fabric height (bin height)
    fabric_height = data.get("fabricWidth") or data.get("fabric_height")
    try:
        fabric_height = int(round(float(fabric_height)))
        if fabric_height <= 0:
            raise ValueError
    except Exception:
        return jsonify({"error": "fabricWidth must be a positive number"}), 400

    allow_rotation = bool(data.get("allowRotation", True))

    try:
        rectangles = prepare_rectangles(data)
        result = run_rectpack_with_fixed_height(rectangles, fabric_height, allow_rotation)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception:
        # Don’t leak internals in prod; log e if you have a logger
        return jsonify({"error": "Nesting failed"}), 500


@nest_bp.route("/nest_rectangles", methods=["POST"])
@role_required("estimator", "designer", "client")
def nest_rectangles():
    """
    Generic rectangle nesting.

    Body (two modes):

    1) Fixed height, minimize width (like fabric roll):
       {
         "rectangles": [ {"width": 100, "height": 200, "label": "A", "quantity": 2}, ... ],
         "fabricHeight": 3200,        # required in this mode (alias: fabric_height, bin_height)
         "allowRotation": true,       # optional
         "group_small": false,        # optional
         "small_side_max": 500,
         "group_row_max": 2000
       }

       Returns { panels, total_width, required_width, bin_height, rotation }

    2) Fixed-size bin:
       {
         "rectangles": [ ... ],
         "bin": { "width": 2000, "height": 3200 },
         "allowRotation": true
       }

       Returns { panels, used_width, used_height, bin_width, bin_height, rotation }
    """
    user = current_user(required=True)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        data = request.get_json(force=True) or {}
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    result = nest_rectangles_logic(
        rectangles=data.get("rectangles"),
        fabric_height=data.get("fabricHeight") or data.get("fabric_height") or data.get("bin_height"),
        allow_rotation=data.get("allowRotation", True),
        bin_obj=data.get("bin"),
        group_small=data.get("group_small", False),
        small_side_max=data.get("small_side_max", 500),
        group_row_max=data.get("group_row_max", 2000)
    )
    
    if "error" in result:
        return jsonify(result), 400 if "not found" not in result["error"].lower() else 500
    
    return jsonify(result), 200


def nest_rectangles_logic(
    rectangles,
    fabric_height=None,
    allow_rotation=True,
    bin_obj=None,
    group_small=False,
    small_side_max=500,
    group_row_max=2000,
    fabric_roll_length=None
):
    """
    Core nesting logic extracted for internal use without HTTP layer.
    
    Args:
        rectangles: List of rect dicts with width, height, label, quantity
        fabric_height: Fixed height for minimize-width mode
        allow_rotation: Whether to allow 90° rotation
        bin_obj: Dict with width/height for fixed-bin mode
        group_small: Whether to group small panels
        small_side_max: Max dimension for "small" panels
        group_row_max: Max row width when grouping
        fabric_roll_length: Maximum length per fabric roll for optimization
    
    Returns:
        Dict with nesting result or {"error": "message"}
    """
    try:
        data_wrapper = {
            "rectangles": rectangles,
            "group_small": group_small,
            "small_side_max": small_side_max,
            "group_row_max": group_row_max
        }
        rect_tuples = prepare_arbitrary_rectangles(data_wrapper)
    except ValueError as ve:
        return {"error": str(ve)}

    # Mode detection
    if bin_obj and isinstance(bin_obj, dict) and ("width" in bin_obj and "height" in bin_obj):
        # Fixed bin mode
        try:
            bw = int(round(float(bin_obj["width"])))
            bh = int(round(float(bin_obj["height"])))
        except Exception:
            return {"error": "bin width/height must be numeric"}
        try:
            return pack_into_fixed_bin(rect_tuples, bw, bh, allow_rotation)
        except ValueError as ve:
            return {"error": str(ve)}
        except Exception as e:
            return {"error": f"Nesting failed: {e}"}

    # Fixed-height minimize width mode
    if not fabric_height:
        return {"error": "fabricHeight is required when bin is not provided"}
    
    try:
        fabric_height = int(round(float(fabric_height)))
        if fabric_height <= 0:
            raise ValueError("fabricHeight must be positive")
    except Exception as e:
        return {"error": f"Invalid fabricHeight: {e}"}

    try:
        return run_rectpack_with_fixed_height(rect_tuples, fabric_height, allow_rotation, fabric_roll_length)
    except ValueError as ve:
        return {"error": str(ve)}
    except Exception as e:
        return {"error": f"Nesting failed: {e}"}
