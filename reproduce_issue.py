
import math
from typing import Dict, List, Any

# ---------------------------------------------------------------------------
# Copied from calculations.py (simplified for reproduction)
# ---------------------------------------------------------------------------

def _num(v):
    try:
        if v is None or v == "":
            return None
        return float(v)
    except (TypeError, ValueError):
        return None

def _law_cosine(a: float, b: float, c: float) -> float:
    if not (a and b and c):
        return 0.0
    cos_val = (a ** 2 + b ** 2 - c ** 2) / (2 * a * b)
    cos_val = max(-1.0, min(1.0, cos_val))
    return math.degrees(math.acos(cos_val))

def _rotate_ccw(x: float, y: float, angle_rad: float) -> Dict[str, float]:
    c = math.cos(angle_rad)
    s = math.sin(angle_rad)
    return {"x": x * c - y * s, "y": x * s + y * c}

def _place_quadrilateral(dAB, dAC, dAD, dBC, dBD, dCD) -> Dict[str, Dict[str, float]]:
    pos = {}
    pos["A"] = {"x": 0.0, "y": 0.0}
    pos["B"] = {"x": dAB, "y": 0.0}
    xC = (dAC ** 2 - dBC ** 2 + dAB ** 2) / (2 * dAB) if dAB else 0.0
    yC = math.sqrt(max(0.0, dAC ** 2 - xC ** 2)) if dAC else 0.0
    pos["C"] = {"x": xC, "y": yC}

    dx = xC
    dy = yC
    dAC_len = math.sqrt(dx * dx + dy * dy) or 1.0
    a = (dAD ** 2 - dCD ** 2 + dAC_len * dAC_len) / (2 * dAC_len) if dAC_len else 0.0
    h = math.sqrt(max(0.0, dAD ** 2 - a * a)) if dAD else 0.0
    xD = (a * dx) / dAC_len
    yD = (a * dy) / dAC_len
    rx = (-dy * h) / dAC_len if dAC_len else 0.0
    ry = (dx * h) / dAC_len if dAC_len else 0.0
    D1 = {"x": xD + rx, "y": yD + ry}
    D2 = {"x": xD - rx, "y": yD - ry}
    dist1 = math.hypot(D1["x"] - pos["B"]["x"], D1["y"] - pos["B"]["y"]) if dBD else 0.0
    dist2 = math.hypot(D2["x"] - pos["B"]["x"], D2["y"] - pos["B"]["y"]) if dBD else 0.0
    pos["D"] = D1 if abs(dist1 - dBD) < abs(dist2 - dBD) else D2
    return pos

def _get_dist_xy(a: str, b: str, xy_distances: Dict[str, float]) -> float:
    k = "".join(sorted([a, b]))
    return xy_distances.get(k, 0.0)

def _calculate_tr_angle_from_coords(tr: Dict[str, float], br: Dict[str, float], global_angle_rad: float) -> float:
    dx = br["x"] - tr["x"]
    dy = br["y"] - tr["y"]
    if math.hypot(dx, dy) < 1e-9:
        return 0.0
    ang_right = math.atan2(dy, dx)
    ang_top = global_angle_rad
    diff = ang_right - ang_top
    diff_deg = math.degrees(diff)
    diff_deg = (diff_deg + 180) % 360 - 180
    return 180.0 - abs(diff_deg)

def _generate_boxes(N: int) -> Dict[str, List[str]]:
    labels = [chr(65 + i) for i in range(N)]
    boxes: Dict[str, List[str]] = {}
    box_count = (N - 2) // 2
    for i in range(box_count):
        name = chr(65 + i)
        top_left = labels[i]
        top_right = labels[i + 1]
        bottom_right = labels[N - 1 - i - 1]
        bottom_left = labels[N - 1 - i]
        boxes[name] = [top_left, top_right, bottom_right, bottom_left]
    if N % 2 != 0:  # central triangle
        name = chr(65 + box_count)
        mid = N // 2
        boxes[name] = [labels[mid - 1], labels[mid], labels[mid + 1]]
    return boxes

def _draw_box_at(box_pts: List[str], xy: Dict[str, float], anchor: Dict[str, float], angle_rad: float) -> Dict[str, Dict[str, float]]:
    TL, TR, BR, BL = box_pts
    dAB = _get_dist_xy(TL, TR, xy)
    dAC = _get_dist_xy(TL, BR, xy)
    dAD = _get_dist_xy(TL, BL, xy)
    dBC = _get_dist_xy(TR, BR, xy)
    dBD = _get_dist_xy(TR, BL, xy)
    dCD = _get_dist_xy(BR, BL, xy)
    placed = _place_quadrilateral(dAB, dAC, dAD, dBC, dBD, dCD)
    for key, p in placed.items():
        rot = _rotate_ccw(p["x"], p["y"], angle_rad)
        placed[key] = {"x": rot["x"] + anchor["x"], "y": rot["y"] + anchor["y"]}
    return placed

def _compute_positions_for_many_sided(N: int, xy_distances: Dict[str, float]) -> Dict[str, Dict[str, float]]:
    positions: Dict[str, Dict[str, float]] = {}
    boxes = _generate_boxes(N)
    current_anchor = {"x": 0.0, "y": 0.0}
    global_angle = 0.0
    prev_TR_angle = 0.0
    first_box = False
    tolerance = 1e-3

    for box_name, pts in boxes.items():
        if len(pts) == 4:
            TL, TR, BR, BL = pts
            top = _get_dist_xy(TL, TR, xy_distances)
            left = _get_dist_xy(TL, BL, xy_distances)
            right = _get_dist_xy(TR, BR, xy_distances)
            bottom = _get_dist_xy(BR, BL, xy_distances)
            diag_left = _get_dist_xy(TR, BL, xy_distances)
            diag_right = _get_dist_xy(TL, BR, xy_distances)

            angle_TL = _law_cosine(top, left, diag_left)
            angle_TR = _law_cosine(top, right, diag_right)

            if not first_box:
                quad_pos = _place_quadrilateral(top, diag_right, left, right, diag_left, bottom)
                mapped = {TL: quad_pos["A"], TR: quad_pos["B"], BR: quad_pos["C"], BL: quad_pos["D"]}
                for k, v in mapped.items():
                    positions[k] = v
                current_anchor = mapped[TR]
                prev_TR_angle = _calculate_tr_angle_from_coords(mapped[TR], mapped[BR], global_angle)
                first_box = True
            else:
                hinge_deg = 180.0 - (prev_TR_angle + angle_TL)
                hinge_rad = math.radians(hinge_deg)
                global_angle += hinge_rad
                placed = _draw_box_at(pts, xy_distances, current_anchor, global_angle)
                mapped = {TL: placed["A"], TR: placed["B"], BR: placed["C"], BL: placed["D"]}
                for k, p in mapped.items():
                    old = positions.get(k)
                    if old:
                        diff = math.hypot(p["x"] - old["x"], p["y"] - old["y"])
                        if diff <= tolerance:
                            continue
                    positions[k] = p
                current_anchor = mapped[TR]
                prev_TR_angle = _calculate_tr_angle_from_coords(mapped[TR], mapped[BR], global_angle)

        elif len(pts) == 3:  # triangle terminal
            A, B, C = pts
            AB = _get_dist_xy(A, B, xy_distances)
            BC = _get_dist_xy(B, C, xy_distances)
            AC = _get_dist_xy(A, C, xy_distances)
            tri = {"A": {"x": 0.0, "y": 0.0}, "B": {"x": AB, "y": 0.0}}
            if AB and AC:
                Cx = (AC ** 2 - BC ** 2 + AB ** 2) / (2 * AB)
                Cy = math.sqrt(max(0.0, AC ** 2 - Cx ** 2))
                tri["C"] = {"x": Cx, "y": Cy}
            angle_A = _law_cosine(AB, AC, BC)
            hinge_deg = 180.0 - (prev_TR_angle + angle_A)
            hinge_rad = math.radians(hinge_deg)
            global_angle += hinge_rad
            mapped = {}
            for label, p in tri.items():
                rotated = _rotate_ccw(p["x"], p.get("y", 0.0), global_angle)
                real_label = A if label == "A" else B if label == "B" else C
                mapped[real_label] = {"x": rotated["x"] + current_anchor["x"], "y": rotated["y"] + current_anchor["y"]}
            for k, v in mapped.items():
                positions[k] = v
            current_anchor = mapped[B]
            prev_TR_angle = angle_A

    return positions

# ---------------------------------------------------------------------------
# Test Data
# ---------------------------------------------------------------------------
dimensions = {
    "AB": 1866, "BC": 1409, "CD": 1260, "DE": 1070, "EF": 1915, "FG": 1500,
    "GH": 1227, "HI": 2011, "IJ": 1530, "JK": 1907, "KA": 1703,
    "AJ": 2611, "BI": 4393, "BJ": 4024, "BK": 2313, "CH": 4130,
    "CI": 4618, "CJ": 4524, "DG": 3392, "DH": 4533, "DI": 5380,
    "EG": 2461, "EH": 3560
}
points = {
    "A": {"height": 862}, "B": {"height": 184}, "C": {"height": 1046},
    "D": {"height": 421}, "E": {"height": 144}, "F": {"height": 1367},
    "G": {"height": 341}, "H": {"height": 504}, "I": {"height": 423},
    "J": {"height": 808}, "K": {"height": 104}
}

# Project to XY
xy = {}
for key, raw_len in dimensions.items():
    p1, p2 = sorted(list(key))
    z1 = points[p1]["height"]
    z2 = points[p2]["height"]
    length = raw_len
    dz = z2 - z1
    xy[f"{p1}{p2}"] = math.sqrt(max(0.0, length ** 2 - dz ** 2))

print("XY Distances:", xy)

positions = _compute_positions_for_many_sided(11, xy)
print("Positions:", positions)

# Check F relative to E-G
E = positions["E"]
G = positions["G"]
F = positions["F"]
D = positions["D"]

def cross_product(o, a, b):
    return (a["x"] - o["x"]) * (b["y"] - o["y"]) - (a["y"] - o["y"]) * (b["x"] - o["x"])

cp_EG_F = cross_product(E, G, F)
cp_EG_D = cross_product(E, G, D)

print(f"Cross Product E->G->F: {cp_EG_F}")
print(f"Cross Product E->G->D: {cp_EG_D}")

if (cp_EG_F > 0) == (cp_EG_D > 0):
    print("FAIL: F is on the same side of E-G as D (Inside/Overlap)")
else:
    print("PASS: F is on the opposite side of E-G as D (Outside)")
