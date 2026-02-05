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
        # 3D Geometry (Centroid, Workpoints)
        _compute_3d_geometry(attributes)
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


def _calculate_tr_angle_from_coords(tr: Dict[str, float], br: Dict[str, float], global_angle_rad: float) -> float:
    # Vector for Right edge (TR -> BR)
    dx = br["x"] - tr["x"]
    dy = br["y"] - tr["y"]
    # If edge length is effectively 0, fallback to 0 degrees
    if math.hypot(dx, dy) < 1e-9:
        return 0.0
    
    ang_right = math.atan2(dy, dx)
    ang_top = global_angle_rad
    
    diff = ang_right - ang_top
    diff_deg = math.degrees(diff)
    # Normalize to -180..180
    diff_deg = (diff_deg + 180) % 360 - 180
    
    # Internal angle is 180 - abs(diff)
    return 180.0 - abs(diff_deg)


def _compute_positions_for_many_sided(N: int, xy_distances: Dict[str, float]) -> Dict[str, Dict[str, float]]:
    positions: Dict[str, Dict[str, float]] = {}
    boxes = _generate_boxes(N)
    current_anchor = {"x": 0.0, "y": 0.0}
    global_angle = 0.0
    prev_TR_angle = 0.0
    first_box = False
    tolerance = 1e-3
    
    # Keep track of the "previous" points to help with orientation (e.g. D in D-E-G-H)
    # For the first box, there are no previous points.
    # For subsequent boxes/triangles, we can use points from the last processed box.
    last_box_points = []

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
            
            last_box_points = [TL, TR, BR, BL]

        elif len(pts) == 3:  # triangle terminal
            A, B, C = pts
            # A and C should already be in positions (connected to previous box)
            # B is the new point (tip)
            if A in positions and C in positions:
                pA = positions[A]
                pC = positions[C]
                dAB = _get_dist_xy(A, B, xy_distances)
                dBC = _get_dist_xy(B, C, xy_distances)
                dAC = _get_dist_xy(A, C, xy_distances)
                
                # Angle at A (BAC)
                angle_A = _law_cosine(dAB, dAC, dBC)
                angle_A_rad = math.radians(angle_A)
                
                # Angle of vector A->C
                dx = pC["x"] - pA["x"]
                dy = pC["y"] - pA["y"]
                angle_AC = math.atan2(dy, dx)
                
                # Two candidates for B
                ang1 = angle_AC + angle_A_rad
                ang2 = angle_AC - angle_A_rad
                
                B1 = {"x": pA["x"] + dAB * math.cos(ang1), "y": pA["y"] + dAB * math.sin(ang1)}
                B2 = {"x": pA["x"] + dAB * math.cos(ang2), "y": pA["y"] + dAB * math.sin(ang2)}
                
                # 1. Check diagonals to any existing points
                best_B = None
                best_err = float('inf')
                
                # Gather all diagonals involving B
                diagonals = []
                for P_label, P_pos in positions.items():
                    if P_label in (A, C): continue
                    dist = _get_dist_xy(B, P_label, xy_distances)
                    if dist > 0:
                        diagonals.append((P_pos, dist))
                
                if diagonals:
                    # Evaluate B1
                    err1 = 0.0
                    for P_pos, dist in diagonals:
                        d = math.hypot(B1["x"] - P_pos["x"], B1["y"] - P_pos["y"])
                        err1 += abs(d - dist)
                    
                    # Evaluate B2
                    err2 = 0.0
                    for P_pos, dist in diagonals:
                        d = math.hypot(B2["x"] - P_pos["x"], B2["y"] - P_pos["y"])
                        err2 += abs(d - dist)
                        
                    best_B = B1 if err1 < err2 else B2
                
                # 2. Fallback: Orientation check relative to previous box
                if best_B is None:
                    # Find a reference point from the previous box (not A or C)
                    # A and C are likely TR and BR of previous box.
                    # So TL or BL of previous box are good references.
                    ref_point = None
                    for p_label in last_box_points:
                        if p_label not in (A, C) and p_label in positions:
                            ref_point = positions[p_label]
                            break
                    
                    if ref_point:
                        # Check which side of line AC the ref_point is on
                        # Cross product (C-A) x (Ref-A)
                        vACx = pC["x"] - pA["x"]
                        vACy = pC["y"] - pA["y"]
                        vRefx = ref_point["x"] - pA["x"]
                        vRefy = ref_point["y"] - pA["y"]
                        cp_ref = vACx * vRefy - vACy * vRefx
                        
                        # Check B1
                        vB1x = B1["x"] - pA["x"]
                        vB1y = B1["y"] - pA["y"]
                        cp_B1 = vACx * vB1y - vACy * vB1x
                        
                        # We want B to be on the OPPOSITE side of AC as Ref
                        # So cp_B1 and cp_ref should have opposite signs
                        if (cp_B1 > 0) != (cp_ref > 0):
                            best_B = B1
                        else:
                            best_B = B2
                    else:
                        # No reference? Default to B1 (arbitrary)
                        best_B = B1

                positions[B] = best_B
                
                # Update anchor/angle if needed (though triangle is usually terminal)
                current_anchor = positions[B]
                # prev_TR_angle update is ambiguous for triangle tip, but usually not needed after terminal
            else:
                # Fallback to old logic if A/C not found (shouldn't happen in strip)
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
            positions[C] = {"x": Cx, "y": -Cy}
        return positions
    if point_count == 4:
        dAB = xy_distances.get("AB", 0.0)
        dAC = xy_distances.get("AC", 0.0)
        dAD = xy_distances.get("AD", 0.0)
        dBC = xy_distances.get("BC", 0.0)
        dBD = xy_distances.get("BD", 0.0)
        dCD = xy_distances.get("CD", 0.0)
        quad = _place_quadrilateral(dAB, dAC, dAD, dBC, dBD, dCD)
        # Flip Y to ensure Clockwise winding (standard for this product)
        # _place_quadrilateral produces CCW (C at +y). We want CW (C at -y).
        return {
            "A": {"x": quad["A"]["x"], "y": -quad["A"]["y"]},
            "B": {"x": quad["B"]["x"], "y": -quad["B"]["y"]},
            "C": {"x": quad["C"]["x"], "y": -quad["C"]["y"]},
            "D": {"x": quad["D"]["x"], "y": -quad["D"]["y"]}
        }
    
    # For >4 points, we also need to flip the result
    positions = _compute_positions_for_many_sided(point_count, xy_distances)
    for k, p in positions.items():
        positions[k] = {"x": p["x"], "y": -p["y"]}
    return positions


def _compute_3d_geometry(attributes: Dict[str, Any]):
    positions = attributes.get("positions") or {}
    points_data = attributes.get("points") or {}
    
    if not positions:
        return

    # Prepare 3D points list sorted by label (A, B, C...)
    # This ensures we can determine connectivity (prev/next) for bisect method.
    sorted_labels = sorted(positions.keys())
    points_3d = []
    
    # 1. Calculate Centroid & Prepare Data
    sum_x, sum_y, sum_z = 0.0, 0.0, 0.0
    count = 0
    
    for label in sorted_labels:
        pos = positions[label]
        x = pos.get("x", 0.0)
        y = pos.get("y", 0.0)
        z = float(_num((points_data.get(label) or {}).get("height")) or 0.0)
        ta = float(_num((points_data.get(label) or {}).get("tensionAllowance")) or 0.0)
        
        points_3d.append({
            "label": label, 
            "x": x, "y": y, "z": z, 
            "ta": ta
        })
        
        sum_x += x
        sum_y += y
        sum_z += z
        count += 1
        
    if count == 0:
        return

    cx = sum_x / count
    cy = sum_y / count
    cz = sum_z / count
    
    attributes["centroid"] = {"x": cx, "y": cy, "z": cz}

    # 1.5 Calculate Area Centroid (Polygon Center of Mass)
    # Solves the issue where clustered points pull the center towards them.
    area_signed = 0.0
    cx_num = 0.0
    cy_num = 0.0
    
    for i in range(count):
        curr_p = points_3d[i]
        next_p = points_3d[(i + 1) % count]
        
        # Cross product (x1*y2 - x2*y1)
        cross = curr_p["x"] * next_p["y"] - next_p["x"] * curr_p["y"]
        area_signed += cross
        
        cx_num += (curr_p["x"] + next_p["x"]) * cross
        cy_num += (curr_p["y"] + next_p["y"]) * cross
        
    area = area_signed * 0.5
    
    if abs(area) > 1e-9:
        cx_area = cx_num / (6.0 * area)
        cy_area = cy_num / (6.0 * area)
    else:
        cx_area = cx
        cy_area = cy
        
    attributes["centroid_area"] = {"x": cx_area, "y": cy_area, "z": cz}

    # 1.5 Calculate Area Centroid (Polygon Center of Mass)
    # Solves the issue where clustered points pull the center towards them.
    area_signed = 0.0
    cx_num = 0.0
    cy_num = 0.0
    
    for i in range(count):
        curr_p = points_3d[i]
        next_p = points_3d[(i + 1) % count]
        
        # Cross product (x1*y2 - x2*y1)
        cross = curr_p["x"] * next_p["y"] - next_p["x"] * curr_p["y"]
        area_signed += cross
        
        cx_num += (curr_p["x"] + next_p["x"]) * cross
        cy_num += (curr_p["y"] + next_p["y"]) * cross
        
    area = area_signed * 0.5
    
    if abs(area) > 1e-9:
        cx_area = cx_num / (6.0 * area)
        cy_area = cy_num / (6.0 * area)
    else:
        cx_area = cx
        cy_area = cy
        
    attributes["centroid_area"] = {"x": cx_area, "y": cy_area, "z": cz}
    
    # 2. Calculate Workpoints (Centroid Method)
    # Projects the workpoint inwards towards the centroid.
    workpoints_centroid = {}
    
    for p in points_3d:
        label = p["label"]
        x, y, z, ta = p["x"], p["y"], p["z"], p["ta"]
        
        # Vector from point to centroid
        dx = cx - x
        dy = cy - y
        dz = cz - z
        
        mag = math.sqrt(dx*dx + dy*dy + dz*dz) or 1.0
        
        # Unit vector (Direction: Post -> Centroid)
        ux = dx / mag
        uy = dy / mag
        uz = dz / mag
        
        # Workpoint = Post + (Direction * Allowance) 
        # Moves point INWARDS from the corner definition
        wx = x + ux * ta
        wy = y + uy * ta
        wz = z + uz * ta
        
        workpoints_centroid[label] = {"x": wx, "y": wy, "z": wz}
        
    attributes["workpoints_centroid"] = workpoints_centroid
    # Maintain "workpoints" key as a fallback/alias to centroid method for now
    attributes["workpoints"] = workpoints_centroid 

    # 3. Calculate Workpoints (Bisect Method)
    # Projects the workpoint inwards along the angle bisector of adjacent edges.
    workpoints_bisect = {}
    
    for i in range(count):
        curr_p = points_3d[i]
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]
        
        # Vectors from Current -> Prev, Current -> Next
        v_prev = (prev_p["x"] - curr_p["x"], prev_p["y"] - curr_p["y"], prev_p["z"] - curr_p["z"])
        v_next = (next_p["x"] - curr_p["x"], next_p["y"] - curr_p["y"], next_p["z"] - curr_p["z"])
        
        # Normalize
        len_prev = math.sqrt(sum(k*k for k in v_prev)) or 1.0
        len_next = math.sqrt(sum(k*k for k in v_next)) or 1.0
        
        u_prev = [k / len_prev for k in v_prev]
        u_next = [k / len_next for k in v_next]
        
        # Bisector direction = Sum of normalized edge vectors
        # For a standard convex corner, this points INWARDS.
        bisect = [u_prev[k] + u_next[k] for k in range(3)]
        len_bisect = math.sqrt(sum(k*k for k in bisect))
        
        if len_bisect < 1e-9:
             # Edges are collinear (180 deg) or degenerate.
             # Fallback to Centroid direction to avoid error
             dx = cx - curr_p["x"]
             dy = cy - curr_p["y"]
             dz = cz - curr_p["z"]
             mag_c = math.sqrt(dx*dx + dy*dy + dz*dz) or 1.0
             u_bisect = [dx/mag_c, dy/mag_c, dz/mag_c]
        else:
             u_bisect = [c / len_bisect for c in bisect]
        
        ta = curr_p["ta"]
        wx = curr_p["x"] + u_bisect[0] * ta
        wy = curr_p["y"] + u_bisect[1] * ta
        wz = curr_p["z"] + u_bisect[2] * ta
        
        workpoints_bisect[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}
        
    attributes["workpoints_bisect"] = workpoints_bisect

    # 4. Calculate Workpoints (Planar Midpoint Method)
    # Addresses "vertical corner" distortion and "reflex angle" stability.
    # Uses 2D Median (Vector to midpoint of neighbors), corrected for reflex, 
    # with Z projected onto the local corner plane.
    # IMPROVED: When neighbors are too close, extend to further neighbors or use centroid blend.
    workpoints_midpoint = {} 
    
    # Minimum distance threshold - if neighbors are closer than this, extend search
    MIN_NEIGHBOR_DIST = 500.0  # 500mm minimum meaningful distance
    
    for i in range(count):
        curr_p = points_3d[i]
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]
        
        # Check if neighbors are too close to the current point
        dist_to_prev = math.hypot(prev_p["x"] - curr_p["x"], prev_p["y"] - curr_p["y"])
        dist_to_next = math.hypot(next_p["x"] - curr_p["x"], next_p["y"] - curr_p["y"])
        
        # If both neighbors are very close, use extended neighbors
        if dist_to_prev < MIN_NEIGHBOR_DIST and dist_to_next < MIN_NEIGHBOR_DIST:
            # Look further - use 2nd neighbors
            prev_p = points_3d[(i - 2 + count) % count]
            next_p = points_3d[(i + 2) % count]
        elif dist_to_prev < MIN_NEIGHBOR_DIST:
            # Just prev is close, extend prev
            prev_p = points_3d[(i - 2 + count) % count]
        elif dist_to_next < MIN_NEIGHBOR_DIST:
            # Just next is close, extend next
            next_p = points_3d[(i + 2) % count]
        
        # 1. Planar Midpoint of Neighbors
        mx = (prev_p["x"] + next_p["x"]) / 2.0
        my = (prev_p["y"] + next_p["y"]) / 2.0
        
        # Vector from Corner to Midpoint
        dx = mx - curr_p["x"]
        dy = my - curr_p["y"]
        
        # 2. Reflex Check (Assuming Clockwise Winding)
        # Use original immediate neighbors for reflex check
        orig_prev = points_3d[(i - 1 + count) % count]
        orig_next = points_3d[(i + 1) % count]
        v_in_x = curr_p["x"] - orig_prev["x"]
        v_in_y = curr_p["y"] - orig_prev["y"]
        v_out_x = orig_next["x"] - curr_p["x"]
        v_out_y = orig_next["y"] - curr_p["y"]
        
        # Cross Product (2D)
        # Positive = Right Turn (Convex in CW)
        # Negative = Left Turn (Reflex in CW)
        cross_z = v_in_x * v_out_y - v_in_y * v_out_x
        
        is_reflex = cross_z < -1e-9
        
        if is_reflex:
            # For reflex, the median points "Inwards" (into the fabric).
            # We want to pull "Outwards". Flip the vector.
            dx = -dx
            dy = -dy
            
        dist_2d = math.hypot(dx, dy)
        if dist_2d < MIN_NEIGHBOR_DIST / 2.0:
            # Still too close - blend with area centroid direction
            centroid_dx = cx_area - curr_p["x"]
            centroid_dy = cy_area - curr_p["y"]
            # Blend: 50% midpoint, 50% centroid
            dx = dx + centroid_dx
            dy = dy + centroid_dy
            dist_2d = math.hypot(dx, dy) or 1.0

        # Normalize 2D Direction
        ux = dx / dist_2d
        uy = dy / dist_2d
        
        ta = curr_p["ta"]
        
        # 3. Calculate Workpoint X/Y
        wx = curr_p["x"] + ux * ta
        wy = curr_p["y"] + uy * ta
        
        # 4. Calculate Workpoint Z (Project onto Local Plane P-C-N)
        # Normal N = (P-C) x (N-C)
        v1x, v1y, v1z = prev_p["x"] - curr_p["x"], prev_p["y"] - curr_p["y"], prev_p["z"] - curr_p["z"]
        v2x, v2y, v2z = next_p["x"] - curr_p["x"], next_p["y"] - curr_p["y"], next_p["z"] - curr_p["z"]
        
        nx = v1y * v2z - v1z * v2y
        ny = v1z * v2x - v1x * v2z
        nz = v1x * v2y - v1y * v2x # This is effectively cross_z
        
        # Plane Eq: nx(x-cx) + ny(y-cy) + nz(z-cz) = 0
        # We know wx, wy. Solve for wz.
        # nz(wz - cz) = -nx(wx - cx) - ny(wy - cy)
        # wz = cz - (nx*dx_w + ny*dy_w) / nz
        
        # Use a soft threshold for nz to avoid divide by zero (vertical planes or straight lines)
        if abs(nz) > 1e-6:
            dx_w = wx - curr_p["x"]
            dy_w = wy - curr_p["y"]
            wz = curr_p["z"] - (nx * dx_w + ny * dy_w) / nz
        else:
            # Fallback for vertical/degenerate conditions:
            # Use average Z slope of neighbors
            # dist_prev = hypot(v1x, v1y)
            # dist_next = hypot(v2x, v2y)
            # if dist_prev > 1e-6 and dist_next > 1e-6:
            #    slope = ((v1z/dist_prev) + (v2z/dist_next)) / 2.0
            #    wz = curr_p["z"] + slope * ta
            # else:
            wz = curr_p["z"]

        workpoints_midpoint[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}
        
    attributes["workpoints_midpoint"] = workpoints_midpoint

    # 5. Calculate Workpoints (Area Centroid Method - Restored)
    workpoints_area_centroid = {}
    
    for p in points_3d:
        label = p["label"]
        x, y, z, ta = p["x"], p["y"], p["z"], p["ta"]
        
        dx = cx_area - x
        dy = cy_area - y
        dz = cz - z
        
        mag = math.sqrt(dx*dx + dy*dy + dz*dz) or 1.0
        
        ux = dx / mag
        uy = dy / mag
        uz = dz / mag
        
        wx = x + ux * ta
        wy = y + uy * ta
        wz = z + uz * ta
        
        workpoints_area_centroid[label] = {"x": wx, "y": wy, "z": wz}
        
    attributes["workpoints_area"] = workpoints_area_centroid

    # 6. Calculate Workpoints (Edge-Tension Weighted Method)
    # IMPROVED: Instead of point-to-point, compute tension toward EDGES.
    # Each corner is pulled toward the "opposite" edges of the sail.
    # Closer edges have less weight (they're already connected), distant edges pull more.
    # This gives E and D more vertical pull toward the A-B edge.
    workpoints_weighted = {}
    
    # Build list of edges as line segments (each edge connects two adjacent points)
    edges_list = []
    for j in range(count):
        p1 = points_3d[j]
        p2 = points_3d[(j + 1) % count]
        edges_list.append((p1, p2, j, (j + 1) % count))
    
    for i in range(count):
        curr_p = points_3d[i]
        
        weighted_sum_x = 0.0
        weighted_sum_y = 0.0
        total_weight = 0.0
        
        # For each edge, compute distance and direction from current point to edge midpoint
        for (ep1, ep2, idx1, idx2) in edges_list:
            # Skip edges that include this corner (adjacent edges)
            if idx1 == i or idx2 == i:
                continue
            
            # Edge midpoint
            emx = (ep1["x"] + ep2["x"]) / 2.0
            emy = (ep1["y"] + ep2["y"]) / 2.0
            
            # Vector from corner to edge midpoint
            dx = emx - curr_p["x"]
            dy = emy - curr_p["y"]
            dist_2d = math.hypot(dx, dy)
            
            # Edge length (longer edges have more "pull" - more membrane area)
            edge_len = math.hypot(ep2["x"] - ep1["x"], ep2["y"] - ep1["y"])
            
            # Weight: (edge_length) / distance^1.5
            # The 1.5 power gives moderate distance falloff
            # Longer edges contribute more pull (more membrane attached)
            if dist_2d > 100.0:
                weight = edge_len / (dist_2d ** 1.5)
            else:
                weight = edge_len / (100.0 ** 1.5)
            
            weighted_sum_x += dx * weight
            weighted_sum_y += dy * weight
            total_weight += weight
        
        if total_weight > 1e-9:
            avg_dx = weighted_sum_x / total_weight
            avg_dy = weighted_sum_y / total_weight
        else:
            # Fallback to area centroid
            avg_dx = cx_area - curr_p["x"]
            avg_dy = cy_area - curr_p["y"]
        
        mag_2d = math.hypot(avg_dx, avg_dy)
        if mag_2d < 1e-9:
            avg_dx = cx_area - curr_p["x"]
            avg_dy = cy_area - curr_p["y"]
            mag_2d = math.hypot(avg_dx, avg_dy) or 1.0
        
        ux = avg_dx / mag_2d
        uy = avg_dy / mag_2d
        
        ta = curr_p["ta"]
        wx = curr_p["x"] + ux * ta
        wy = curr_p["y"] + uy * ta
        
        # Z: Project onto local plane
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]
        v1x, v1y, v1z = prev_p["x"] - curr_p["x"], prev_p["y"] - curr_p["y"], prev_p["z"] - curr_p["z"]
        v2x, v2y, v2z = next_p["x"] - curr_p["x"], next_p["y"] - curr_p["y"], next_p["z"] - curr_p["z"]
        
        nx = v1y * v2z - v1z * v2y
        ny = v1z * v2x - v1x * v2z
        nz = v1x * v2y - v1y * v2x
        
        if abs(nz) > 1e-6:
            dx_w = wx - curr_p["x"]
            dy_w = wy - curr_p["y"]
            wz = curr_p["z"] - (nx * dx_w + ny * dy_w) / nz
        else:
            wz = curr_p["z"]
        
        workpoints_weighted[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}
        
    attributes["workpoints_weighted"] = workpoints_weighted

    # 7. Calculate Workpoints (Minimal Surface Method)
    # Simulates membrane tension using Laplacian smoothing concept.
    # Each corner is pulled toward the average position of ALL other corners,
    # which approximates where a minimal surface would want to pull.
    # Then blend with the bisector direction for local angle consideration.
    workpoints_minimal = {}
    
    for i in range(count):
        curr_p = points_3d[i]
        
        # Compute average position of all OTHER corners (Laplacian target)
        avg_x = 0.0
        avg_y = 0.0
        for j in range(count):
            if i == j:
                continue
            avg_x += points_3d[j]["x"]
            avg_y += points_3d[j]["y"]
        avg_x /= (count - 1)
        avg_y /= (count - 1)
        
        # Direction to Laplacian center
        lap_dx = avg_x - curr_p["x"]
        lap_dy = avg_y - curr_p["y"]
        lap_mag = math.hypot(lap_dx, lap_dy) or 1.0
        
        # Also compute bisector direction (local angle consideration)
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]
        
        v_in_x = curr_p["x"] - prev_p["x"]
        v_in_y = curr_p["y"] - prev_p["y"]
        v_in_mag = math.hypot(v_in_x, v_in_y) or 1.0
        
        v_out_x = next_p["x"] - curr_p["x"]
        v_out_y = next_p["y"] - curr_p["y"]
        v_out_mag = math.hypot(v_out_x, v_out_y) or 1.0
        
        # Normalize
        v_in_x /= v_in_mag
        v_in_y /= v_in_mag
        v_out_x /= v_out_mag
        v_out_y /= v_out_mag
        
        # Bisector (inward pointing)
        bis_x = -v_in_x + v_out_x
        bis_y = -v_in_y + v_out_y
        bis_mag = math.hypot(bis_x, bis_y)
        
        if bis_mag < 1e-9:
            # Straight line, use perpendicular
            bis_x = -v_in_y
            bis_y = v_in_x
            bis_mag = math.hypot(bis_x, bis_y) or 1.0
        
        bis_x /= bis_mag
        bis_y /= bis_mag
        
        # Reflex check
        cross_z = v_in_x * v_out_y - v_in_y * v_out_x
        if cross_z < -1e-9:  # Reflex in CW winding
            bis_x = -bis_x
            bis_y = -bis_y
        
        # Blend: 60% Laplacian (global surface), 40% Bisector (local angle)
        # This gives smooth global behavior with local angle respect
        blend_x = 0.6 * (lap_dx / lap_mag) + 0.4 * bis_x
        blend_y = 0.6 * (lap_dy / lap_mag) + 0.4 * bis_y
        blend_mag = math.hypot(blend_x, blend_y) or 1.0
        
        ux = blend_x / blend_mag
        uy = blend_y / blend_mag
        
        ta = curr_p["ta"]
        wx = curr_p["x"] + ux * ta
        wy = curr_p["y"] + uy * ta
        
        # Z: Project onto local plane
        v1x, v1y, v1z = prev_p["x"] - curr_p["x"], prev_p["y"] - curr_p["y"], prev_p["z"] - curr_p["z"]
        v2x, v2y, v2z = next_p["x"] - curr_p["x"], next_p["y"] - curr_p["y"], next_p["z"] - curr_p["z"]
        
        nx = v1y * v2z - v1z * v2y
        ny = v1z * v2x - v1x * v2z
        nz = v1x * v2y - v1y * v2x
        
        if abs(nz) > 1e-6:
            dx_w = wx - curr_p["x"]
            dy_w = wy - curr_p["y"]
            wz = curr_p["z"] - (nx * dx_w + ny * dy_w) / nz
        else:
            wz = curr_p["z"]
        
        workpoints_minimal[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}
        
    attributes["workpoints_minimal"] = workpoints_minimal

    # 8. Calculate Workpoints (Bisect-Rotate Method)
    # Manual technique simulation:
    # 1. Bisect the corner angle (like bisect algorithm) to get horizontal direction
    # 2. Create a vertical plane containing this bisector direction
    # 3. Project the area centroid onto this plane
    # 4. Workpoint direction goes toward the projected centroid
    # This constrains direction to the bisector's vertical slice while aiming at area centroid.
    workpoints_bisect_rotate = {}
    
    for i in range(count):
        curr_p = points_3d[i]
        prev_p = points_3d[(i - 1 + count) % count]
        next_p = points_3d[(i + 1) % count]
        
        # 1. Compute 2D bisector direction (XY plane only)
        # Vector from prev to curr (incoming edge)
        v_in_x = curr_p["x"] - prev_p["x"]
        v_in_y = curr_p["y"] - prev_p["y"]
        v_in_mag = math.hypot(v_in_x, v_in_y) or 1.0
        v_in_x /= v_in_mag
        v_in_y /= v_in_mag
        
        # Vector from curr to next (outgoing edge)
        v_out_x = next_p["x"] - curr_p["x"]
        v_out_y = next_p["y"] - curr_p["y"]
        v_out_mag = math.hypot(v_out_x, v_out_y) or 1.0
        v_out_x /= v_out_mag
        v_out_y /= v_out_mag
        
        # Bisector = sum of negated incoming and outgoing unit vectors
        bis_x = -v_in_x + v_out_x
        bis_y = -v_in_y + v_out_y
        bis_mag = math.hypot(bis_x, bis_y)
        
        if bis_mag < 1e-9:
            # Straight line - use perpendicular to edge
            bis_x = -v_in_y
            bis_y = v_in_x
            bis_mag = math.hypot(bis_x, bis_y) or 1.0
        
        bis_x /= bis_mag
        bis_y /= bis_mag
        
        # Reflex check - if reflex angle, flip bisector outward
        cross_z = v_in_x * v_out_y - v_in_y * v_out_x
        if cross_z < -1e-9:  # Reflex in CW winding
            bis_x = -bis_x
            bis_y = -bis_y
        
        # 2. Create vertical plane containing bisector
        # Plane passes through curr_p, with normal perpendicular to bisector (in XY) and perpendicular to Z
        # Plane normal: n = bisector × Z = (bis_x, bis_y, 0) × (0, 0, 1) = (bis_y, -bis_x, 0)
        plane_nx = bis_y
        plane_ny = -bis_x
        # plane_nz = 0 (horizontal normal = vertical plane)
        
        # 3. Project area centroid onto this plane
        # Plane equation: plane_nx*(x - curr_x) + plane_ny*(y - curr_y) = 0
        # Project point P onto plane: P_proj = P - ((P-curr) · n) * n
        # Vector from corner to area centroid
        to_centroid_x = cx_area - curr_p["x"]
        to_centroid_y = cy_area - curr_p["y"]
        to_centroid_z = cz - curr_p["z"]
        
        # Dot product with plane normal (only XY components since nz=0)
        dot = to_centroid_x * plane_nx + to_centroid_y * plane_ny
        
        # Projected point (relative to corner)
        proj_x = to_centroid_x - dot * plane_nx
        proj_y = to_centroid_y - dot * plane_ny
        proj_z = to_centroid_z  # Z unchanged by horizontal normal
        
        # 4. Direction from corner to projected centroid
        proj_mag = math.sqrt(proj_x*proj_x + proj_y*proj_y + proj_z*proj_z)
        
        if proj_mag < 1e-9:
            # Fallback to bisector direction with no Z tilt
            ux = bis_x
            uy = bis_y
            uz = 0.0
        else:
            ux = proj_x / proj_mag
            uy = proj_y / proj_mag
            uz = proj_z / proj_mag
        
        # Apply tension allowance
        ta = curr_p["ta"]
        wx = curr_p["x"] + ux * ta
        wy = curr_p["y"] + uy * ta
        wz = curr_p["z"] + uz * ta
        
        workpoints_bisect_rotate[curr_p["label"]] = {"x": wx, "y": wy, "z": wz}
        
    attributes["workpoints_bisect_rotate"] = workpoints_bisect_rotate


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
    
    # Try both positions for D (opposite side of AC as B, or same side)
    # B is at +y. D1 is -y (convex-ish), D2 is +y (reflex-ish/arrowhead)
    D1 = {"x": AD * math.cos(angleA_ADC), "y": -AD * math.sin(angleA_ADC)}
    D2 = {"x": AD * math.cos(angleA_ADC), "y": AD * math.sin(angleA_ADC)}
    
    bd1 = math.hypot(B["x"] - D1["x"], B["y"] - D1["y"]) if BD else 0.0
    bd2 = math.hypot(B["x"] - D2["x"], B["y"] - D2["y"]) if BD else 0.0
    
    if abs(bd2 - BD) < abs(bd1 - BD):
        D = D2
        BD_theory = bd2
    else:
        D = D1
        BD_theory = bd1

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

    # Determine winding of the constructed shape to correctly identify reflex angles
    pts = [A, B, C, D]
    area = 0.0
    for i in range(4):
        p1 = pts[i]
        p2 = pts[(i + 1) % 4]
        area += (p1["x"] * p2["y"] - p2["x"] * p1["y"])
    is_ccw = area > 0

    def is_reflex_vertex(P, Q, R, is_poly_ccw):
        # Cross product of PQ and QR
        v1x = Q["x"] - P["x"]
        v1y = Q["y"] - P["y"]
        v2x = R["x"] - Q["x"]
        v2y = R["y"] - Q["y"]
        cross = v1x * v2y - v1y * v2x
        is_left = cross > 0
        if is_poly_ccw:
            return not is_left # CCW: Right turn is reflex
        else:
            return is_left # CW: Left turn is reflex

    Aang = angle_at(D, A, B)
    Bang = angle_at(A, B, C)
    Cang = angle_at(B, C, D)
    Dang = angle_at(C, D, A)

    # Check reflex status
    refA = is_reflex_vertex(D, A, B, is_ccw)
    refB = is_reflex_vertex(A, B, C, is_ccw)
    refC = is_reflex_vertex(B, C, D, is_ccw)
    refD = is_reflex_vertex(C, D, A, is_ccw)

    # Adjust angles if reflex
    if refA: Aang = 2 * math.pi - Aang
    if refB: Bang = 2 * math.pi - Bang
    if refC: Cang = 2 * math.pi - Cang
    if refD: Dang = 2 * math.pi - Dang

    angles = {"A": math.degrees(Aang), "B": math.degrees(Bang), "C": math.degrees(Cang), "D": math.degrees(Dang)}
    reflex = {"A": refA, "B": refB, "C": refC, "D": refD}
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
        discrepancy_threshold = 40
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
    39: 1920, 40: 1990, 41: 2060, 42: 2135, 43: 2210, 44: 2285,
    45: 2365, 46: 2445, 47: 2525, 48: 2605, 49: 2685, 50: 2770
  },
  "Poly Fx": {
    15: 570, 16: 600, 17: 645, 18: 685, 19: 725, 20: 765,
    21: 825, 22: 875, 23: 925, 24: 975, 25: 1025, 26: 1085,
    27: 1145, 28: 1205, 29: 1265, 30: 1325, 31: 1385, 32: 1445,
    33: 1505, 34: 1565, 35: 1630, 36: 1695, 37: 1765, 38: 1835,
    39: 1905, 40: 1975, 41: 2045, 42: 2120, 43: 2195, 44: 2270,
    45: 2350, 46: 2430, 47: 2510, 48: 2590, 49: 2670, 50: 2755
  },
  "Extreme 32": {
    15: 650, 16: 690, 17: 740, 18: 795, 19: 840, 20: 895,
    21: 930, 22: 990, 23: 1055, 24: 1120, 25: 1170, 26: 1235,
    27: 1300, 28: 1360, 29: 1440, 30: 1510, 31: 1575, 32: 1640,
    33: 1720, 34: 1805, 35: 1895, 36: 1990, 37: 2085, 38: 2180,
    39: 2275, 40: 2345, 41: 2400, 42: 2505, 43: 2565, 44: 2670,
    45: 2720, 46: 2830, 47: 2935, 48: 3045, 49: 3165, 50: 3275
  },
  "Polyfab Xtra": {
    15: 740, 16: 790, 17: 830, 18: 885, 19: 935, 20: 990,
    21: 1065, 22: 1135, 23: 1190, 24: 1255, 25: 1305, 26: 1415,
    27: 1470, 28: 1540, 29: 1625, 30: 1695, 31: 1745, 32: 1815,
    33: 1900, 34: 1990, 35: 2075, 36: 2165, 37: 2255, 38: 2345,
    39: 2450, 40: 2500, 41: 2570, 42: 2670, 43: 2725, 44: 2830,
    45: 2925, 46: 3030, 47: 3140, 48: 3260, 49: 3365, 50: 3490
  },
  "Tensitech 480": {
    15: 670, 16: 720, 17: 755, 18: 805, 19: 855, 20: 915,
    21: 1045, 22: 1110, 23: 1165, 24: 1235, 25: 1285, 26: 1350,
    27: 1410, 28: 1480, 29: 1560, 30: 1635, 31: 1680, 32: 1760,
    33: 1840, 34: 1925, 35: 2010, 36: 2100, 37: 2185, 38: 2280,
    39: 2380, 40: 2440, 41: 2500, 42: 2595, 43: 2665, 44: 2760,
    45: 2810, 46: 2920, 47: 3020, 48: 3130, 49: 3235, 50: 3345
  },
  "Monotec 370": {
    15: 790, 16: 840, 17: 890, 18: 940, 19: 990, 20: 1050,
    21: 1135, 22: 1220, 23: 1280, 24: 1340, 25: 1400, 26: 1470,
    27: 1540, 28: 1610, 29: 1680, 30: 1750, 31: 1820, 32: 1890,
    33: 1960, 34: 2035, 35: 2115, 36: 2200, 37: 2315, 38: 2415,
    39: 2530, 40: 2600, 41: 2665, 42: 2780, 43: 2860, 44: 2975,
    45: 3015, 46: 3135, 47: 3265, 48: 3395, 49: 3515, 50: 3645
  },
  "Bochini": {
    12: 780, 13: 840, 14: 915, 15: 985, 16: 1070, 17: 1160, 18: 1255, 19: 1460, 20: 1535,
    21: 1555, 22: 1665, 23: 1775, 24: 1885, 25: 1975, 26: 2085, 27: 2215, 28: 2397, 29: 2490,
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
