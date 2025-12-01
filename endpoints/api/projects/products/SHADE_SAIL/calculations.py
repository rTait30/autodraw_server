"""SHADE_SAIL project calculations.

Ports core JavaScript layout, discrepancy, and pricing helpers into Python.

The incoming payload shape mirrors COVER:
{
    "products": [ { "attributes": { ... } }, ... ]
}

Each product's attributes are mutated in-place with derived fields.
Returns the full (mutated) data dict.
"""
from typing import Dict, Any, List, Tuple
import math


def _num(v):
    try:
        if v is None or v == "":
            return None
        return float(v)
    except (TypeError, ValueError):
        return None



# ---------------------------------------------------------------------------
# Main per-project calculation entry
# ---------------------------------------------------------------------------
def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    products = data.get("products") or []
    for sail in products:
        attributes = sail.get("attributes") or {}
        point_count = int(_num(attributes.get("pointCount")) or 0)
        # Perimeter (adjacent edges only)
        perimeter = _sum_edges(attributes.get("dimensions") or {}, point_count) if point_count else 0.0
        attributes["perimeter"] = perimeter
        # Edge meter rounding rule
        if perimeter % 1000 < 200:
            attributes["edgeMeter"] = int(math.floor(perimeter / 1000))
        else:
            attributes["edgeMeter"] = int(math.ceil(perimeter / 1000))
        # XY distances
        attributes["xyDistances"] = _build_xy_distances(attributes.get("dimensions") or {}, attributes.get("points") or {})
        # Planar positions
        attributes["positions"] = _compute_sail_positions_from_xy(point_count, attributes["xyDistances"])
        # Discrepancies & blame
        disc = _compute_discrepancies_and_blame(point_count, attributes["xyDistances"], sail)
        attributes["discrepancies"] = disc["discrepancies"]
        attributes["blame"] = disc["blame"]
        attributes["boxProblems"] = disc["boxProblems"]
        attributes["hasReflexAngle"] = bool(disc["reflex"])  # any reflex in quadrilaterals
        attributes["reflexAngleValues"] = disc["reflexAngleValues"]
        discrepancy_values = [abs(v) for v in attributes["discrepancies"].values() if v is not None and math.isfinite(v)]
        attributes["maxDiscrepancy"] = max(discrepancy_values) if discrepancy_values else 0
        attributes["discrepancyProblem"] = attributes["maxDiscrepancy"] > disc["discrepancyThreshold"]
        # Trace cables total length
        total_trace_length = 0.0
        for pt in attributes.get("traceCables", []) or []:
            total_trace_length += _num(pt.get("length")) or 0.0
        attributes["totalTraceLength"] = total_trace_length
        attributes["totalTraceLengthCeilMeters"] = int(math.ceil(total_trace_length / 1000.0)) if total_trace_length else None
        # Fabric pricing (minus trace length meters)
        fabric_type = attributes.get("fabricType")
        effective_edge_meter = attributes.get("edgeMeter", 0) - (attributes.get("totalTraceLengthCeilMeters") or 0)
        attributes["fabricPrice"] = _get_price_by_fabric(fabric_type, int(effective_edge_meter)) if fabric_type else 0.0
        # Fitting counts
        fitting_counts: Dict[str, int] = {}
        for point_key, pt in (attributes.get("points") or {}).items():
            fitting = pt.get("cornerFitting")
            if fitting:
                fitting_counts[fitting] = fitting_counts.get(fitting, 0) + 1
        attributes["fittingCounts"] = fitting_counts
        # Sail tracks aggregated length
        total_sail_length = 0.0
        dimensions = attributes.get("dimensions") or {}
        for edge in attributes.get("sailTracks", []) or []:
            dim_val = _num(dimensions.get(edge))
            if dim_val is None:
                continue
            total_sail_length += dim_val
        attributes["totalSailLength"] = total_sail_length
        attributes["totalSailLengthCeilMeters"] = int(math.ceil(total_sail_length / 1000.0)) if total_sail_length else None
        sail["attributes"] = attributes
    return data





# ---------------------------------------------------------------------------
# Geometry helpers (ported from Steps.js)
# ---------------------------------------------------------------------------
def _sum_edges(dimensions: Dict[str, Any], point_count: int) -> float:
    total = 0.0
    for i in range(point_count):
        a = chr(65 + i)
        b = chr(65 + ((i + 1) % point_count))
        key = f"{a}{b}"
        total += _num(dimensions.get(key)) or 0.0
    return total


def _project_to_xy(length: float, z1: float, z2: float) -> float:
    dz = (z2 or 0.0) - (z1 or 0.0)
    if length is None:
        return 0.0
    return math.sqrt(max(0.0, length ** 2 - dz ** 2))


def _build_xy_distances(dimensions: Dict[str, Any], points: Dict[str, Any]) -> Dict[str, float]:
    xy = {}
    for key, raw_len in (dimensions or {}).items():
        if len(key) != 2:
            continue
        p1, p2 = sorted(list(key))
        z1 = _num((points.get(p1) or {}).get("height")) or 0.0
        z2 = _num((points.get(p2) or {}).get("height")) or 0.0
        length = _num(raw_len) or 0.0
        norm_key = f"{p1}{p2}"
        xy[norm_key] = _project_to_xy(length, z1, z2)
    return xy


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
                prev_TR_angle = angle_TR
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
                prev_TR_angle = angle_TR

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


def _compute_sail_positions_from_xy(point_count: int, xy_distances: Dict[str, float]) -> Dict[str, Dict[str, float]]:
    positions: Dict[str, Dict[str, float]] = {}
    if not point_count:
        return positions
    if point_count == 3:
        A, B, C = "A", "B", "C"
        AB = xy_distances.get("AB", 0.0)
        BC = xy_distances.get("BC", 0.0)
        AC = xy_distances.get("AC", 0.0)
        positions[A] = {"x": 0.0, "y": 0.0}
        positions[B] = {"x": AB, "y": 0.0}
        if AB and AC:
            Cx = (AC ** 2 - BC ** 2 + AB ** 2) / (2 * AB)
            Cy = math.sqrt(max(0.0, AC ** 2 - Cx ** 2))
            positions[C] = {"x": Cx, "y": Cy}
        return positions
    if point_count == 4:
        dAB = xy_distances.get("AB", 0.0)
        dAC = xy_distances.get("AC", 0.0)
        dAD = xy_distances.get("AD", 0.0)
        dBC = xy_distances.get("BC", 0.0)
        dBD = xy_distances.get("BD", 0.0)
        dCD = xy_distances.get("CD", 0.0)
        quad = _place_quadrilateral(dAB, dAC, dAD, dBC, dBD, dCD)
        return {"A": quad["A"], "B": quad["B"], "C": quad["C"], "D": quad["D"]}
    return _compute_positions_for_many_sided(point_count, xy_distances)


# ---------------------------------------------------------------------------
# Discrepancy & blame logic (ported)
# ---------------------------------------------------------------------------
def _get_four_point_combos_with_dims(N: int, xy: Dict[str, float]) -> List[Dict[str, Any]]:
    labels = [chr(65 + i) for i in range(N)]
    combos: List[List[str]] = []

    def helper(start: int, combo: List[str]):
        if len(combo) == 4:
            combos.append(combo.copy())
            return
        for i in range(start, len(labels)):
            combo.append(labels[i])
            helper(i + 1, combo)
            combo.pop()

    helper(0, [])
    results = []
    for combo in combos:
        a, b, c, d = combo
        pairs = [(a, b), (a, c), (a, d), (b, c), (b, d), (c, d)]
        dims = {}
        for p1, p2 in pairs:
            alpha_key = "".join(sorted([p1, p2]))
            dims[alpha_key] = xy.get(alpha_key)
        results.append({"combo": "".join(combo), "dims": dims})
    return results


def _compute_discrepancy_xy(dimensions: Dict[str, float]) -> Dict[str, Any]:
    lengths = list(dimensions.values())
    if len(lengths) < 6 or any(v in (None, 0) for v in lengths):
        return {"discrepancy": 0, "reflex": {}, "angles": {}, "reflexAngles": {}}
    AB, AC, AD, BC, BD, CD = lengths  # ordering preserved from JS

    def safe_acos(x: float) -> float:
        return math.acos(max(-1.0, min(1.0, x)))

    A = {"x": 0.0, "y": 0.0}
    C = {"x": AC, "y": 0.0}
    cosA_ABC = (AB * AB + AC * AC - BC * BC) / (2 * AB * AC)
    angleA_ABC = safe_acos(cosA_ABC) if AB and AC and BC else 0.0
    B = {"x": AB * math.cos(angleA_ABC), "y": AB * math.sin(angleA_ABC)}
    cosA_ADC = (AD * AD + AC * AC - CD * CD) / (2 * AD * AC) if AD and AC and CD else 0.0
    angleA_ADC = safe_acos(cosA_ADC) if AD and AC and CD else 0.0
    D = {"x": AD * math.cos(angleA_ADC), "y": -AD * math.sin(angleA_ADC)}
    BD_theory = math.hypot(B["x"] - D["x"], B["y"] - D["y"]) if BD else 0.0
    discrepancy = abs(BD_theory - BD)

    def angle_at(P: Dict[str, float], Q: Dict[str, float], R: Dict[str, float]) -> float:
        v1 = (P["x"] - Q["x"], P["y"] - Q["y"])
        v2 = (R["x"] - Q["x"], R["y"] - Q["y"])
        dot = v1[0] * v2[0] + v1[1] * v2[1]
        m1 = math.hypot(*v1)
        m2 = math.hypot(*v2)
        if not (m1 and m2):
            return 0.0
        ang = math.acos(max(-1.0, min(1.0, dot / (m1 * m2))))
        return ang

    Aang = angle_at(D, A, B)
    Bang = angle_at(A, B, C)
    Cang = angle_at(B, C, D)
    Dang = angle_at(C, D, A)

    def is_reflex(rad: float) -> bool:
        return rad > math.pi

    angles = {"A": math.degrees(Aang), "B": math.degrees(Bang), "C": math.degrees(Cang), "D": math.degrees(Dang)}
    reflex = {k: is_reflex(v) for k, v in zip(["A", "B", "C", "D"], [Aang, Bang, Cang, Dang])}
    reflex_angles = {k: v for k, v in angles.items() if reflex.get(k)}
    return {"discrepancy": discrepancy, "reflex": reflex, "angles": angles, "reflexAngles": reflex_angles}


def _compute_discrepancies_and_blame(N: int, xy_distances: Dict[str, float], sail: Dict[str, Any]) -> Dict[str, Any]:
    discrepancies: Dict[str, Any] = {}
    blame: Dict[str, float] = {}
    box_problems: Dict[str, bool] = {}
    reflex_flag = False
    reflex_angle_values: Dict[str, float] = {}

    # threshold by fabric category
    discrepancy_threshold = 100
    fabric_category = (sail.get("attributes") or {}).get("fabricCategory")
    if fabric_category == "PVC":
        discrepancy_threshold = 20
    elif fabric_category == "ShadeCloth":
        discrepancy_threshold = 70

    for k in xy_distances:
        blame[k] = 0.0
    for k in (sail.get("attributes", {}).get("points") or {}):
        blame[k] = 0.0

    if N >= 4:
        combos = _get_four_point_combos_with_dims(N, xy_distances)
        for combo in combos:
            dims = combo["dims"]
            result = _compute_discrepancy_xy(dims)
            discrepancy = result["discrepancy"]
            discrepancies[combo["combo"]] = discrepancy
            quad_has_reflex = any(v is True for v in result["reflex"].values())
            if quad_has_reflex:
                reflex_flag = True
            for label, angle_deg in result["reflexAngles"].items():
                if angle_deg is None:
                    continue
                current = reflex_angle_values.get(label)
                if current is None or angle_deg > current:
                    reflex_angle_values[label] = angle_deg
            is_problem = discrepancy is not None and math.isfinite(discrepancy) and discrepancy > discrepancy_threshold
            if is_problem:
                box_problems[combo["combo"]] = True
                for blame_key in list(blame.keys()):
                    if all(ch in combo["combo"] for ch in blame_key):
                        blame[blame_key] += discrepancy

    return {
        "discrepancies": discrepancies,
        "blame": blame,
        "boxProblems": box_problems,
        "discrepancyThreshold": discrepancy_threshold,
        "reflex": reflex_flag,
        "reflexAngleValues": reflex_angle_values,
    }


# ---------------------------------------------------------------------------
# Pricing (simplified subset price list)
# ---------------------------------------------------------------------------
_PRICE_LIST: Dict[str, Dict[int, int]] = {
  "Rainbow Z16": {
    15: 585, 16: 615, 17: 660, 18: 700, 19: 740, 20: 780,
    21: 840, 22: 890, 23: 940, 24: 990, 25: 1040, 26: 1100,
    27: 1160, 28: 1220, 29: 1280, 30: 1340, 31: 1400, 32: 1460,
    33: 1520, 34: 1580, 35: 1645, 36: 1710, 37: 1780, 38: 1850,
    39: 1910, 40: 1980, 41: 2060, 42: 2135, 43: 2210, 44: 2285,
    45: 2360, 46: 2435, 47: 2510, 48: 2585, 49: 2685, 50: 2770
  },
  "Poly Fx": {
    15: 570, 16: 600, 17: 645, 18: 685, 19: 725, 20: 765,
    21: 815, 22: 875, 23: 925, 24: 975, 25: 1025, 26: 1085,
    27: 1145, 28: 1195, 29: 1265, 30: 1325, 31: 1385, 32: 1445,
    33: 1505, 34: 1565, 35: 1630, 36: 1695, 37: 1765, 38: 1835,
    39: 1895, 40: 1965, 41: 2045, 42: 2120, 43: 2195, 44: 2270,
    45: 2345, 46: 2420, 47: 2495, 48: 2570, 49: 2670, 50: 2755
  },
  "Extreme 32": {
    15: 650, 16: 690, 17: 740, 18: 795, 19: 845, 20: 895,
    21: 955, 22: 990, 23: 1065, 24: 1120, 25: 1170, 26: 1235,
    27: 1300, 28: 1350, 29: 1430, 30: 1495, 31: 1575, 32: 1635,
    33: 1700, 34: 1795, 35: 1895, 36: 1980, 37: 2055, 38: 2135,
    39: 2210, 40: 2290, 41: 2365, 42: 2450, 43: 2565, 44: 2655,
    45: 2720, 46: 2810, 47: 2905, 48: 2995, 49: 3085, 50: 3275
  },
  "Polyfab Xtra": {
    15: 740, 16: 790, 17: 830, 18: 885, 19: 935, 20: 990,
    21: 1065, 22: 1135, 23: 1195, 24: 1255, 25: 1325, 26: 1415,
    27: 1470, 28: 1530, 29: 1615, 30: 1680, 31: 1745, 32: 1810,
    33: 1875, 34: 1970, 35: 2075, 36: 2165, 37: 2255, 38: 2345,
    39: 2435, 40: 2520, 41: 2605, 42: 2670, 43: 2755, 44: 2825,
    45: 2925, 46: 3010, 47: 3105, 48: 3190, 49: 3265, 50: 3490
  },
  "Tensitech 480": {
    15: 670, 16: 720, 17: 785, 18: 835, 19: 885, 20: 940,
    21: 1015, 22: 1110, 23: 1180, 24: 1235, 25: 1285, 26: 1350,
    27: 1410, 28: 1470, 29: 1540, 30: 1600, 31: 1660, 32: 1720,
    33: 1780, 34: 1905, 35: 2010, 36: 2100, 37: 2185, 38: 2280,
    39: 2340, 40: 2440, 41: 2515, 42: 2595, 43: 2665, 44: 2735,
    45: 2810, 46: 2890, 47: 2980, 48: 3060, 49: 3245, 50: 3345
  },
  "Monotec 370": {
    15: 790, 16: 890, 17: 940, 18: 990, 19: 1050, 20: 1100,
    21: 1180, 22: 1220, 23: 1280, 24: 1340, 25: 1400, 26: 1470,
    27: 1540, 28: 1590, 29: 1670, 30: 1730, 31: 1790, 32: 1850,
    33: 1920, 34: 2015, 35: 2130, 36: 2200, 37: 2290, 38: 2380,
    39: 2460, 40: 2560, 41: 2635, 42: 2715, 43: 2790, 44: 2870,
    45: 2950, 46: 3025, 47: 3120, 48: 3210, 49: 3345, 50: 3645
  },
  "DriZ": {
    15: 890, 16: 960, 17: 1030, 18: 1150, 19: 1180, 20: 1255,
    21: 1365, 22: 1450, 23: 1535, 24: 1620, 25: 1710, 26: 1800,
    27: 1890, 28: 1985, 29: 2080, 30: 2180, 31: 2280, 32: 2380,
    33: 2485, 34: 2595, 35: 2705, 36: 2815, 37: 2930, 38: 3045,
    39: 3160, 40: 3280
  },
  "Bochini": {
    12: 780, 13: 840, 14: 915, 15: 985, 16: 1070, 17: 1160, 18: 1255, 19: 1460, 20: 1535,
    21: 1555, 22: 1665, 23: 1775, 24: 1885, 25: 1975, 26: 2085, 27: 2185, 28: 2295, 29: 2490,
    30: 2585, 31: 2785, 32: 2975, 33: 3160, 34: 3360, 35: 3580, 36: 3760, 37: 4030, 38: 4280,
    39: 4550, 40: 4815
  },
  "Bochini Blockout": {
    12: 815, 13: 915, 14: 955, 15: 995, 16: 1140, 17: 1255, 18: 1355, 19: 1460, 20: 1555,
    21: 1670, 22: 1795, 23: 1925, 24: 2065, 25: 2165, 26: 2300, 27: 2445, 28: 2590, 29: 2765,
    30: 2850, 31: 3040, 32: 3235, 33: 3430, 34: 3660, 35: 3890, 36: 4090, 37: 4375, 38: 4635,
    39: 4900, 40: 5190
  },
  "Mehler FR580": {
    12: 985, 13: 1075, 14: 1170, 15: 1265, 16: 1390, 17: 1520, 18: 1640, 19: 1780, 20: 1915,
    21: 2065, 22: 2215, 23: 2365, 24: 2530, 25: 2725, 26: 2915, 27: 3070, 28: 3280, 29: 3475,
    30: 3665, 31: 3820, 32: 4035, 33: 4220, 34: 4480, 35: 4740, 36: 4950, 37: 5190, 38: 5525,
    39: 5790, 40: 6040
  },
  "Ferrari 502S2": {
    12: 955, 13: 1045, 14: 1135, 15: 1230, 16: 1355, 17: 1490, 18: 1625, 19: 1760, 20: 1910,
    21: 2045, 22: 2200, 23: 2355, 24: 2535, 25: 2715, 26: 2890, 27: 3045, 28: 3270, 29: 3470,
    30: 3645, 31: 3810, 32: 4030, 33: 4220, 34: 4475, 35: 4720, 36: 4950, 37: 5230, 38: 5495,
    39: 5760, 40: 6030
  },
  "Ferrari 502V3": {
    12: 1010, 13: 1115, 14: 1205, 15: 1305, 16: 1460, 17: 1590, 18: 1740, 19: 1905, 20: 2030,
    21: 2215, 22: 2380, 23: 2575, 24: 2745, 25: 2950, 26: 3145, 27: 3320, 28: 3540, 29: 3775,
    30: 3975, 31: 4140, 32: 4375, 33: 4580, 34: 4870, 35: 5145, 36: 5405, 37: 5700, 38: 5990,
    39: 6290, 40: 6575
  }
}


def _get_price_by_fabric(fabric: str, edge_meter: int) -> float:
    if not fabric or fabric not in _PRICE_LIST:
        return 0.0
    if edge_meter < 15:
        return float(_PRICE_LIST[fabric].get(15, 0))
    return float(_PRICE_LIST[fabric].get(edge_meter, 0.0))




__all__ = ["calculate"]
