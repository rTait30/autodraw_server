# endpoints/api/products/nest.py
from datetime import datetime
from typing import Dict, List, Tuple

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
    allow_rotation: bool = True
):
    """
    Binary search minimal width to fit all rectangles into a single bin of height = fabric_height.
    Returns placements and the minimal width achieved.
    """
    if fabric_height <= 0:
        raise ValueError("fabric_height must be a positive integer")

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
    except Exception as e:
        # Don’t leak internals in prod; log e if you have a logger
        return jsonify({"error": "Nesting failed"}), 500
