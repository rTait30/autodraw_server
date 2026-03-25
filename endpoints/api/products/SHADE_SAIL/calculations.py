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

from .shared import _get_dist_xy

# Workpoint algorithm modules
from .workpoints.workpoints_centroid import compute_workpoints_centroid
from .workpoints.workpoints_bisect import compute_workpoints_bisect
from .workpoints.workpoints_midpoint import compute_workpoints_midpoint
from .workpoints.workpoints_area_centroid import compute_workpoints_area_centroid
from .workpoints.workpoints_weighted import compute_workpoints_weighted
from .workpoints.workpoints_minimal import compute_workpoints_minimal
from .workpoints.workpoints_bisect_rotate import compute_workpoints_bisect_rotate
from .workpoints.workpoints_bisect_rotate_normalized import compute_workpoints_bisect_rotate_normalized
from .workpoints.workpoints_bisect_rotate_planar import compute_workpoints_bisect_rotate_planar
from .workpoints.workpoints_plane_resultant import compute_workpoints_plane_resultant

# Configuration: Enable/disable workpoint algorithms
# Set to True to compute and include in attributes
WORKPOINT_METHODS = {
    "centroid": False,
    "bisect": True,
    "midpoint": False,
    "area": False,              # Area centroid
    "weighted": False,
    "minimal": False,
    "bisect_rotate": True,
    "bisect_rotate_normalized": True, 
    "bisect_rotate_planar": True,
    "plane_resultant": True,
}

# Set which method should be aliased to the "workpoints" key
# Must be one of the enabled methods above
DEFAULT_WORKPOINT_METHOD = "bisect_rotate"  # Default method for "workpoints" key in attributes


def _num(v):
    try:
        if v is None or v == "":
            return None
        return float(v)
    except (TypeError, ValueError):
        return None


def _get_label(idx: int) -> str:
    """Generate A, B, C label from index."""
    return chr(65 + idx)


# ---------------------------------------------------------------------------
# Main per-project calculation entry
# ---------------------------------------------------------------------------
def calculate(data: Dict[str, Any]) -> Dict[str, Any]:
    products = data.get("products") or []
    for sail in products:
        attributes = sail.get("attributes") or {}
        point_count = int(_num(attributes.get("pointCount")) or 0)
        
        points_list = attributes.get("points") or []
        connections_data = attributes.get("connections")

        # Build map for fast lookup: (u, v) -> value
        # Stores measured lengths
        dim_map = {}
        
        # Support both new Dict format (recommended) and old List format
        connections_is_dict = isinstance(connections_data, dict)
        
        if connections_is_dict:
            for key, valObj in connections_data.items():
                if not valObj: continue
                try:
                    parts = key.split("-")
                    if len(parts) == 2:
                        u, v = int(parts[0]), int(parts[1])
                        key_tup = tuple(sorted((u, v)))
                        dim_map[key_tup] = _num(valObj.get("value"))
                except ValueError:
                    pass
        elif isinstance(connections_data, list):
            for conn in connections_data:
                u = int(conn.get("from", 0))
                v = int(conn.get("to", 0))
                key_tup = tuple(sorted((u, v)))
                dim_map[key_tup] = _num(conn.get("value"))

        # Perimeter (adjacent edges only)
        perimeter = 0.0
        if point_count:
            for i in range(point_count):
                key = tuple(sorted((i, (i + 1) % point_count)))
                perimeter += dim_map.get(key) or 0.0
        
        attributes["perimeter"] = perimeter
        
        # Edge meter rounding rule
        if perimeter % 1000 < 200:
            attributes["edgeMeter"] = int(math.floor(perimeter / 1000))
        else:
            attributes["edgeMeter"] = int(math.ceil(perimeter / 1000))

        # XY distances
        # Returns dict with keys like "0-1" -> float
        attributes["xyDistances"] = _build_xy_distances(dim_map, points_list)
        
        # Planar positions: returns dict { 0: {x,y}, 1: {x,y} }
        positions_map = _compute_sail_positions_from_xy(point_count, attributes["xyDistances"])
        attributes["positions"] = positions_map

        # Update point objects with calculated 2D positions
        for i, pt in enumerate(points_list):
            if i < point_count and i in positions_map:
                pt["x"] = positions_map[i]["x"]
                pt["y"] = positions_map[i]["y"]
                # z is height
                pt["z"] = float(_num(pt.get("height")) or 0.0)
        
        # Enrich connections with calculated 2D length and Blame
        # We need to compute blame first to inject it.
        
        # 3D Geometry (Centroid, Workpoints)
        _compute_3d_geometry(attributes, points_list)
        
        # Discrepancies
        disc = _compute_discrepancies_and_blame(point_count, attributes["xyDistances"], dim_map, points_list, sail)
        attributes["discrepancies"] = disc["discrepancies"]
        attributes["blame"] = disc["blame"]
        attributes["boxProblems"] = disc["boxProblems"]
        attributes["hasReflexAngle"] = bool(disc["reflex"])
        attributes["reflexAngleValues"] = disc["reflexAngleValues"]
        
        discrepancy_values = [abs(v) for v in attributes["discrepancies"].values() if v is not None and math.isfinite(v)]
        attributes["maxDiscrepancy"] = max(discrepancy_values) if discrepancy_values else 0
        attributes["discrepancyProblem"] = attributes["maxDiscrepancy"] > disc["discrepancyThreshold"]

        # Inject derived data (length2d, blame) back into connections structure
        if connections_is_dict:
             for key, valObj in connections_data.items():
                 # key is "0-1" or similar
                 # Calculated xy len
                 xy_len = attributes["xyDistances"].get(key)
                 if xy_len is not None and valObj:
                     valObj["length2d"] = xy_len
                 
                 # Blame
                 if key in attributes["blame"] and valObj:
                     valObj["blame"] = attributes["blame"][key]
                     
        elif isinstance(connections_data, list):
             for conn in connections_data:
                u = int(conn.get("from", 0))
                v = int(conn.get("to", 0))
                k_xy = f"{min(u,v)}-{max(u,v)}"
                xy_len = attributes["xyDistances"].get(k_xy)
                if xy_len is not None:
                    conn["length2d"] = xy_len
                if k_xy in attributes["blame"]:
                    conn["blame"] = attributes["blame"][k_xy]

        # Trace cables total length
        total_trace_length = 0.0
        for tc in attributes.get("traceCables", []) or []:
            total_trace_length += _num(tc.get("length")) or 0.0
        attributes["totalTraceLength"] = total_trace_length
        attributes["totalTraceLengthCeilMeters"] = int(math.ceil(total_trace_length / 1000.0)) if total_trace_length else None

        # Fabric pricing
        fabric_type = attributes.get("fabricType")
        effective_edge_meter = attributes.get("edgeMeter", 0) - (attributes.get("totalTraceLengthCeilMeters") or 0)
        attributes["fabricPrice"] = _get_price_by_fabric(fabric_type, int(effective_edge_meter)) if fabric_type else 0.0

        # Fitting counts
        fitting_counts: Dict[str, int] = {}
        for pt in points_list:
            fitting = pt.get("cornerFitting")
            if fitting:
                fitting_counts[fitting] = fitting_counts.get(fitting, 0) + 1
        attributes["fittingCounts"] = fitting_counts

        # Sail tracks aggregated length
        total_sail_length = 0.0
        # Check explicit sailTracks list (legacy/parallel) AND connections usage
        # We try to use the boolean on connections first
        by_conn = False
        
        # Helper to iterate connections regardless of format
        connections_iterator = []
        if isinstance(connections_data, dict):
            connections_iterator = connections_data.values()
        elif isinstance(connections_data, list):
            connections_iterator = connections_data
            
        for conn in connections_iterator:
            if not conn: continue
            if conn.get("sailTrack"):
                by_conn = True
                val = _num(conn.get("value"))
                if val:
                    total_sail_length += val
        
        if not by_conn:
            # Fallback to legacy string list if needed, but matched against dim_map keys?
            # Or just assume this refactor is complete switch.
            # If Form.jsx is updated, it will write to attributes.connections.
            pass

        attributes["totalSailLength"] = total_sail_length
        attributes["totalSailLengthCeilMeters"] = int(math.ceil(total_sail_length / 1000.0)) if total_sail_length else None
        
        sail["attributes"] = attributes
    return data






# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _project_to_xy(length: float, z1: float, z2: float) -> float:
    dz = (z2 or 0.0) - (z1 or 0.0)
    if length is None:
        return 0.0
    return math.sqrt(max(0.0, length ** 2 - dz ** 2))


def _build_xy_distances(dim_map: Dict[Tuple[int, int], float], points_list: List[Dict]) -> Dict[str, float]:
    """Returns dict keyed by 'min-max' indices string."""
    xy = {}
    for (u, v), length in dim_map.items():
        if u >= len(points_list) or v >= len(points_list):
            continue
        z1 = _num(points_list[u].get("height")) or 0.0
        z2 = _num(points_list[v].get("height")) or 0.0
        length = _num(length) or 0.0
        k = f"{min(u,v)}-{max(u,v)}"
        xy[k] = _project_to_xy(length, z1, z2)
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


def _place_quadrilateral(dAB: float, dAC: float, dAD: float, dBC: float, dBD: float, dCD: float) -> Dict[str, Dict[str, float]]:
    # Returns 0, 1, 2, 3 as A, B, C, D
    # A=0, B=1, C=2, D=3 relative to the quad
    # Coordinates built from A=(0,0)
    pos = {}
    pos[0] = {"x": 0.0, "y": 0.0}
    pos[1] = {"x": dAB, "y": 0.0}
    
    # Place C using AB, BC, AC
    # Using law of cosines on Triangle ABC
    if dAB > 0.0 and dAC > 0.0:
        xC = (dAC ** 2 - dBC ** 2 + dAB ** 2) / (2 * dAB)
        yC_sq = dAC ** 2 - xC ** 2
        yC = math.sqrt(max(0.0, yC_sq))
        pos[2] = {"x": xC, "y": -yC}
    else:
        # Degenerate case fallback
        pos[2] = {"x": dAB, "y": dBC} # Rough guess

    # Place D relative to A(0,0) and computed C
    # Triangle ADC, base AC.
    dx = pos[2]["x"] - pos[0]["x"]
    dy = pos[2]["y"] - pos[0]["y"]
    dAC_calc = math.sqrt(dx*dx + dy*dy)
    
    # We must use the calculated AC distance for the base of the triangle to ensure closure 
    # even if there's a slight discrepancy between dAC input and calculated position of C?
    # No, C is placed exactly at distance dAC from A (since xC^2 + yC^2 = dAC^2).
    # Verification: xC = b cosA, yC = b sinA. xC^2+yC^2 = b^2(cos^2+sin^2) = b^2 = dAC^2.
    # So dAC_calc should match dAC. Use dAC_calc to be safe with float precision.

    if dAC_calc > 0.001 and dAD > 0.0 and dCD > 0.0:
        angle_AC = math.atan2(dy, dx)
        
        # Law of cosines for Angle CAD in triangle ADC (sides AD, CD, AC)
        # cos(CAD) = (AD^2 + AC^2 - CD^2) / (2 * AD * AC)
        num = dAD**2 + dAC_calc**2 - dCD**2
        den = 2 * dAD * dAC_calc
        cos_CAD = max(-1.0, min(1.0, num / den))
        angle_CAD = math.acos(cos_CAD)
        
        a1 = angle_AC + angle_CAD
        a2 = angle_AC - angle_CAD
        
        # Candidate positions for D
        D1 = {"x": dAD * math.cos(a1), "y": dAD * math.sin(a1)}
        D2 = {"x": dAD * math.cos(a2), "y": dAD * math.sin(a2)}
        
        dist1 = math.hypot(D1["x"] - pos[1]["x"], D1["y"] - pos[1]["y"])
        dist2 = math.hypot(D2["x"] - pos[1]["x"], D2["y"] - pos[1]["y"])
        
        # Choose the one closer to measured BD
        # If both are equally bad, just pick one (the one that matches winding?)
        if abs(dist1 - dBD) < abs(dist2 - dBD):
            pos[3] = D1
        else:
            pos[3] = D2
    else:
        # Fallback for degenerate triangles
        pos[3] = {"x": 0.0, "y": dAD}

    return pos


def _signed_area(positions: Dict[int, Dict[str, float]], order: List[int]) -> float:
    n = len(order)
    area = 0.0
    for i in range(n):
        p1 = positions[order[i]]
        p2 = positions[order[(i + 1) % n]]
        area += p1['x'] * p2['y'] - p2['x'] * p1['y']
    return area / 2


def _calculate_tr_angle_from_coords(tr: Dict[str, float], br: Dict[str, float], global_angle_rad: float) -> float:
    dx = br["x"] - tr["x"]
    dy = br["y"] - tr["y"]
    if math.hypot(dx, dy) < 1e-9:
        return 0.0
    ang_right = math.atan2(dy, dx)
    diff = ang_right - global_angle_rad
    diff_deg = math.degrees(diff)
    diff_deg = (diff_deg + 180) % 360 - 180
    return diff_deg


def _compute_positions_for_many_sided(N: int, xy_distances: Dict[str, float]) -> Dict[int, Dict[str, float]]:
    positions: Dict[int, Dict[str, float]] = {}
    boxes = _generate_boxes(N)
    current_anchor = {"x": 0.0, "y": 0.0}
    global_angle = 0.0
    prev_TR_angle = 0.0
    first_box = False
    tolerance = 1e-3
    last_box_points = []
    
    # Sort boxes by name assuming 'box_i' convention or just iterate if _generate_boxes preserves order
    # _generate_boxes returns dict, Python 3.7+ preserves insertion order.
    
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

            if not first_box:
                quad_pos = _place_quadrilateral(top, diag_right, left, right, diag_left, bottom)
                # Local: 0->TL, 1->TR, 2->BR, 3->BL
                mapped = {TL: quad_pos[0], TR: quad_pos[1], BR: quad_pos[2], BL: quad_pos[3]}
                for k, v in mapped.items():
                    positions[k] = v
                current_anchor = mapped[TR]
                prev_TR_angle = _calculate_tr_angle_from_coords(mapped[TR], mapped[BR], global_angle)
                first_box = True
            else:
                hinge_deg = prev_TR_angle + angle_TL
                hinge_rad = math.radians(hinge_deg)
                global_angle += hinge_rad
                placed = _draw_box_at(pts, xy_distances, current_anchor, global_angle)
                for k, p in placed.items():
                    old = positions.get(k)
                    if old:
                        diff = math.hypot(p["x"] - old["x"], p["y"] - old["y"])
                        if diff <= tolerance:
                            continue
                    positions[k] = p
                current_anchor = placed[TR]
                prev_TR_angle = _calculate_tr_angle_from_coords(placed[TR], placed[BR], global_angle)
            
            last_box_points = [TL, TR, BR, BL]

        elif len(pts) == 3:
            A, B, C = pts # A=Left, B=Top(Tip), C=Right  (relative to hull walk)
            if A in positions and C in positions:
                pA = positions[A]
                pC = positions[C]
                dAB = _get_dist_xy(A, B, xy_distances)
                dBC = _get_dist_xy(B, C, xy_distances)
                dAC = _get_dist_xy(A, C, xy_distances)
                
                angle_A = _law_cosine(dAB, dAC, dBC)
                angle_A_rad = math.radians(angle_A)
                
                dx = pC["x"] - pA["x"]
                dy = pC["y"] - pA["y"]
                angle_AC = math.atan2(dy, dx)
                
                ang1 = angle_AC + angle_A_rad
                ang2 = angle_AC - angle_A_rad
                
                B1 = {"x": pA["x"] + dAB * math.cos(ang1), "y": pA["y"] + dAB * math.sin(ang1)}
                B2 = {"x": pA["x"] + dAB * math.cos(ang2), "y": pA["y"] + dAB * math.sin(ang2)}
                
                best_B = None
                best_err = float('inf')
                
                diagonals = []
                for P_idx, P_pos in positions.items():
                    if P_idx in (A, C): continue
                    dist = _get_dist_xy(B, P_idx, xy_distances)
                    if dist > 0:
                        diagonals.append((P_pos, dist))
                
                if diagonals:
                    err1 = 0.0
                    for P_pos, dist in diagonals:
                        err1 += abs(math.hypot(B1["x"] - P_pos["x"], B1["y"] - P_pos["y"]) - dist)
                    err2 = 0.0
                    for P_pos, dist in diagonals:
                        err2 += abs(math.hypot(B2["x"] - P_pos["x"], B2["y"] - P_pos["y"]) - dist)
                    best_B = B1 if err1 < err2 else B2
                
                if best_B is None:
                    ref_point = None
                    for p_idx in last_box_points:
                        if p_idx not in (A, C) and p_idx in positions:
                            ref_point = positions[p_idx]
                            break
                    if ref_point:
                        vACx = pC["x"] - pA["x"]
                        vACy = pC["y"] - pA["y"]
                        vRefx = ref_point["x"] - pA["x"]
                        vRefy = ref_point["y"] - pA["y"]
                        cp_ref = vACx * vRefy - vACy * vRefx
                        vB1x = B1["x"] - pA["x"]
                        vB1y = B1["y"] - pA["y"]
                        cp_B1 = vACx * vB1y - vACy * vB1x
                        if (cp_B1 > 0) != (cp_ref > 0):
                            best_B = B1
                        else:
                            best_B = B2
                    else:
                        best_B = B1
                
                positions[B] = best_B
                current_anchor = positions[B]

    return positions


def _generate_boxes(N: int) -> Dict[str, List[int]]:
    boxes: Dict[str, List[int]] = {}
    box_count = (N - 2) // 2
    for i in range(box_count):
        name = f"box_{i}"
        top_left = i
        top_right = i + 1
        bottom_right = N - 1 - i - 1
        bottom_left = N - 1 - i
        boxes[name] = [top_left, top_right, bottom_right, bottom_left]
    if N % 2 != 0:
        name = f"box_{box_count}"
        mid = N // 2
        boxes[name] = [mid - 1, mid, mid + 1]
    return boxes


def _draw_box_at(box_pts: List[int], xy: Dict[str, float], anchor: Dict[str, float], angle_rad: float) -> Dict[int, Dict[str, float]]:
    TL, TR, BR, BL = box_pts
    dAB = _get_dist_xy(TL, TR, xy)
    dAC = _get_dist_xy(TL, BR, xy)
    dAD = _get_dist_xy(TL, BL, xy)
    dBC = _get_dist_xy(TR, BR, xy)
    dBD = _get_dist_xy(TR, BL, xy)
    dCD = _get_dist_xy(BR, BL, xy)
    placed = _place_quadrilateral(dAB, dAC, dAD, dBC, dBD, dCD)
    mapping = {TL: placed[0], TR: placed[1], BR: placed[2], BL: placed[3]}
    result = {}
    for k, p in mapping.items():
        rot = _rotate_ccw(p["x"], p["y"], angle_rad)
        result[k] = {"x": rot["x"] + anchor["x"], "y": rot["y"] + anchor["y"]}
    return result


def _compute_sail_positions_from_xy(point_count: int, xy_distances: Dict[str, float]) -> Dict[int, Dict[str, float]]:
    positions: Dict[int, Dict[str, float]] = {}
    if not point_count:
        return positions
    if point_count == 3:
        A, B, C = 0, 1, 2
        AB = _get_dist_xy(A, B, xy_distances)
        BC = _get_dist_xy(B, C, xy_distances)
        AC = _get_dist_xy(A, C, xy_distances)
        positions[A] = {"x": 0.0, "y": 0.0}
        positions[B] = {"x": AB, "y": 0.0}
        if AB and AC:
            Cx = (AC ** 2 - BC ** 2 + AB ** 2) / (2 * AB)
            Cy = math.sqrt(max(0.0, AC ** 2 - Cx ** 2))
            positions[C] = {"x": Cx, "y": -Cy}
        # Ensure clockwise
        order = [0, 1, 2]
        if _signed_area(positions, order) > 0:
            for p in positions.values():
                p['y'] = -p['y']
        return positions

    if point_count == 4:
        # A=0, B=1, C=2, D=3
        # Edges: AB, BC, CD, DA (0-1, 1-2, 2-3, 3-0)
        # Diagonals: AC, BD (0-2, 1-3)
        dAB = _get_dist_xy(0, 1, xy_distances)
        dBC = _get_dist_xy(1, 2, xy_distances)
        dCD = _get_dist_xy(2, 3, xy_distances)
        dAD = _get_dist_xy(0, 3, xy_distances)
        dAC = _get_dist_xy(0, 2, xy_distances)
        dBD = _get_dist_xy(1, 3, xy_distances)
        
        # _place_quadrilateral arguments order: dAB, dAC, dAD, dBC, dBD, dCD
        # It builds ABC triangle, then ADC triangle.
        # It needs edges AB, BC, AC for ABC.
        # It needs edges AD, CD, AC for ADC.
        # It uses BD to flip D.
        quad = _place_quadrilateral(dAB, dAC, dAD, dBC, dBD, dCD)
        
        # It returns keys 0,1,2,3
        # But wait, python dict keys are integers here.
        # The result must be compatible with what Form/Display expects.
        # Display expects string keys "0", "1"... 
        # But _compute_sail_positions_from_xy returns Dict[int, ...]
        # Later we convert to JSON, which stringifies keys.
        
        # Apply Y-flip for screen coords (usually positive Y is down in SVG but up in math)
        # Display.js handles Y-flip itself using scaling/offset. 
        # But usually we return standard Cartesian (Y up).
        # Let's keep Y-flip consistent with other paths?
        # The previous code had `-quad[i]["y"]`. 
        
        pos_out = {}
        for i in range(4):
            # Ensure we don't crash if quad missing key
            if i in quad:
                pos_out[i] = {"x": quad[i]["x"], "y": quad[i]["y"]}
        # Ensure clockwise
        order = [0, 1, 2, 3]
        if _signed_area(pos_out, order) > 0:
            for p in pos_out.values():
                p['y'] = -p['y']
        return pos_out

    positions = _compute_positions_for_many_sided(point_count, xy_distances)
    if not isinstance(positions, dict):
        positions = {}
    # Ensure all positions are present. If we have point_count=5, we need 0..4
    # The _compute_positions_for_many_sided may return sparse map if logic fails.
    
    pos_out = {}
    for i in range(point_count):
        if i in positions:
            p = positions[i]
            pos_out[i] = {"x": p["x"], "y": p["y"]}
        else:
            # Fallback if position calculation failed for some point
            pos_out[i] = {"x": 0.0, "y": 0.0}
            
    # Ensure clockwise winding with positive Y up
    order = list(range(point_count))
    if _signed_area(pos_out, order) > 0:
        for p in pos_out.values():
            p['y'] = -p['y']
            
    return pos_out


def _compute_3d_geometry(attributes: Dict[str, Any], points_list: List[Dict]):
    points_3d = []
    
    valid_points = []
    for i, pt in enumerate(points_list):
        if "x" in pt and "y" in pt:
            # FORCE VALIDATION: Use string index as label so sub-algos return keyed by index string
            label = str(i) 
            p3d = {
                "label": label,
                "x": pt["x"], "y": pt["y"], "z": pt["z"],
                "ta": float(_num(pt.get("tensionAllowance")) or 0.0)
            }
            valid_points.append(p3d)

    for pt in valid_points:
        pass  # Y is already flipped in positions_map

    if not valid_points:
        return
    
    points_3d = valid_points
    count = len(points_3d)
    
    sum_x = sum(p["x"] for p in points_3d)
    sum_y = sum(p["y"] for p in points_3d)
    sum_z = sum(p["z"] for p in points_3d)
    
    cx = sum_x / count
    cy = sum_y / count
    cz = sum_z / count
    
    attributes["centroid"] = {"x": cx, "y": cy, "z": cz}

    area_signed = 0.0
    cx_num = 0.0
    cy_num = 0.0
    for i in range(count):
        curr_p = points_3d[i]
        next_p = points_3d[(i + 1) % count]
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

    computed_workpoints = {}
    
    def persist_wp(method_name, result_dict):
        attr_key = f"workpoints_{method_name}"
        attributes[attr_key] = result_dict
        computed_workpoints[method_name] = result_dict

    if WORKPOINT_METHODS.get("centroid"):
        persist_wp("centroid", compute_workpoints_centroid(points_3d, cx, cy, cz))
    if WORKPOINT_METHODS.get("bisect"):
        persist_wp("bisect", compute_workpoints_bisect(points_3d, cx, cy, cz))
    if WORKPOINT_METHODS.get("midpoint"):
        persist_wp("midpoint", compute_workpoints_midpoint(points_3d, cx_area, cy_area, cz))
    if WORKPOINT_METHODS.get("area"):
        persist_wp("area", compute_workpoints_area_centroid(points_3d, cx_area, cy_area, cz))
    if WORKPOINT_METHODS.get("weighted"):
        persist_wp("weighted", compute_workpoints_weighted(points_3d, cx_area, cy_area))
    if WORKPOINT_METHODS.get("minimal"):
        persist_wp("minimal", compute_workpoints_minimal(points_3d))
    if WORKPOINT_METHODS.get("bisect_rotate"):
        persist_wp("bisect_rotate", compute_workpoints_bisect_rotate(points_3d, cx_area, cy_area, cz))
    if WORKPOINT_METHODS.get("bisect_rotate_normalized"):
        persist_wp("bisect_rotate_normalized", compute_workpoints_bisect_rotate_normalized(points_3d))
    if WORKPOINT_METHODS.get("bisect_rotate_planar"):
        persist_wp("bisect_rotate_planar", compute_workpoints_bisect_rotate_planar(points_3d, cx_area, cy_area))
    if WORKPOINT_METHODS.get("plane_resultant"):
        persist_wp("plane_resultant", compute_workpoints_plane_resultant(points_3d, cx, cy, cz))

    if DEFAULT_WORKPOINT_METHOD in computed_workpoints:
        wp_dict = computed_workpoints[DEFAULT_WORKPOINT_METHOD]
        for i, pt in enumerate(points_list):
            lbl = str(i)
            if lbl in wp_dict:
                pt["workpoint"] = wp_dict[lbl]


def _get_four_point_combos_with_dims(N: int, xy: Dict[str, float]) -> List[Dict[str, Any]]:
    # Returns combos of INDICES [0,1,2,3]
    indices = list(range(N))
    combos = []
    def helper(start, current):
        if len(current) == 4:
            combos.append(current.copy())
            return
        for i in range(start, N):
            current.append(i)
            helper(i+1, current)
            current.pop()
    helper(0, [])
    results = []
    import itertools
    for combo in combos:
        pairs = []
        for p1, p2 in itertools.combinations(combo, 2):
            pairs.append((p1, p2))
        dims = {}
        for p1, p2 in pairs:
            k = f"{min(p1,p2)}-{max(p1,p2)}"
            dims[k] = xy.get(k)
        
        a,b,c,d = combo
        # Order: ab, ac, ad, bc, bd, cd
        # Map global indices to local A,B,C,D for the standard discrepancy calc
        ordered_dims = {
            "AB": dims.get(f"{min(a,b)}-{max(a,b)}"),
            "AC": dims.get(f"{min(a,c)}-{max(a,c)}"),
            "AD": dims.get(f"{min(a,d)}-{max(a,d)}"),
            "BC": dims.get(f"{min(b,c)}-{max(b,c)}"),
            "BD": dims.get(f"{min(b,d)}-{max(b,d)}"),
            "CD": dims.get(f"{min(c,d)}-{max(c,d)}")
        }
        # e.g. "0-1-2-3"
        combo_str = "-".join([str(x) for x in combo])
        results.append({"combo": combo_str, "dims": ordered_dims, "indices": combo})
    return results


def _compute_discrepancy_xy(dims_map: Dict[str, float]) -> Dict[str, Any]:
    lengths = [dims_map.get(k) for k in ["AB","AC","AD","BC","BD","CD"]]
    if any(v in (None, 0) for v in lengths):
        return {"discrepancy": 0, "reflex": {}, "angles": {}, "reflexAngles": {}}
    AB, AC, AD, BC, BD, CD = lengths

    def safe_acos(x): return math.acos(max(-1.0, min(1.0, x)))
    A = {"x": 0.0, "y": 0.0}
    C = {"x": AC, "y": 0.0}
    cosA_ABC = (AB * AB + AC * AC - BC * BC) / (2 * AB * AC)
    angleA_ABC = safe_acos(cosA_ABC)
    B = {"x": AB * math.cos(angleA_ABC), "y": AB * math.sin(angleA_ABC)}
    cosA_ADC = (AD * AD + AC * AC - CD * CD) / (2 * AD * AC)
    angleA_ADC = safe_acos(cosA_ADC)
    D1 = {"x": AD * math.cos(angleA_ADC), "y": -AD * math.sin(angleA_ADC)}
    D2 = {"x": AD * math.cos(angleA_ADC), "y": AD * math.sin(angleA_ADC)}
    bd1 = math.hypot(B["x"] - D1["x"], B["y"] - D1["y"])
    bd2 = math.hypot(B["x"] - D2["x"], B["y"] - D2["y"])
    if abs(bd2 - BD) < abs(bd1 - BD):
        D = D2
        BD_theory = bd2
    else:
        D = D1
        BD_theory = bd1
    discrepancy = abs(BD_theory - BD)
    
    pts = [A, B, C, D]
    area = 0.0
    for i in range(4):
        p1, p2 = pts[i], pts[(i+1)%4]
        area += (p1["x"] * p2["y"] - p2["x"] * p1["y"])
    is_ccw = area > 0
    
    def is_reflex(P, Q, R):
        cross = (Q["x"]-P["x"])*(R["y"]-Q["y"]) - (Q["y"]-P["y"])*(R["x"]-Q["x"])
        is_left = cross > 0
        return not is_left if is_ccw else is_left
        
    def angle_at(P, Q, R):
        v1 = (P["x"] - Q["x"], P["y"] - Q["y"])
        v2 = (R["x"] - Q["x"], R["y"] - Q["y"])
        m1 = math.hypot(*v1)
        m2 = math.hypot(*v2)
        if not (m1 and m2): return 0.0
        return math.acos(max(-1.0, min(1.0, (v1[0]*v2[0] + v1[1]*v2[1])/(m1*m2))))

    refA = is_reflex(D, A, B)
    refB = is_reflex(A, B, C)
    refC = is_reflex(B, C, D)
    refD = is_reflex(C, D, A)
    
    Aang = angle_at(D, A, B)
    Bang = angle_at(A, B, C)
    Cang = angle_at(B, C, D)
    Dang = angle_at(C, D, A)
    
    if refA: Aang = 2*math.pi - Aang
    if refB: Bang = 2*math.pi - Bang
    if refC: Cang = 2*math.pi - Cang
    if refD: Dang = 2*math.pi - Dang
    
    return {
        "discrepancy": discrepancy,
        "reflex": {"A": refA, "B": refB, "C": refC, "D": refD},
        "angles": {"A": math.degrees(Aang), "B": math.degrees(Bang), "C": math.degrees(Cang), "D": math.degrees(Dang)},
        "reflexAngles": {}
    }


def _get_point_3d_distance(points_list: List[Dict[str, Any]], u: int, v: int) -> float:
    if u >= len(points_list) or v >= len(points_list):
        return 0.0
    p1 = points_list[u]
    p2 = points_list[v]
    dx = (p2.get("x") or 0.0) - (p1.get("x") or 0.0)
    dy = (p2.get("y") or 0.0) - (p1.get("y") or 0.0)
    dz = (p2.get("z") or 0.0) - (p1.get("z") or 0.0)
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def _is_adjacent_index(u: int, v: int, count: int) -> bool:
    return abs(u - v) == 1 or abs(u - v) == count - 1


def _compute_tip_connection_discrepancies(
    N: int,
    dim_map: Dict[Tuple[int, int], float],
    points_list: List[Dict[str, Any]],
) -> Dict[str, float]:
    tip_discrepancies: Dict[str, float] = {}

    if N < 5 or N % 2 == 0:
        return tip_discrepancies

    tip_idx = N // 2
    if tip_idx >= len(points_list):
        return tip_discrepancies

    for (u, v), measured_3d in dim_map.items():
        if measured_3d is None or tip_idx not in (u, v):
            continue
        if _is_adjacent_index(u, v, N):
            continue

        theoretical_3d = _get_point_3d_distance(points_list, u, v)
        key = f"{min(u, v)}-{max(u, v)}"
        tip_discrepancies[key] = abs(theoretical_3d - measured_3d)

    return tip_discrepancies


def _compute_discrepancies_and_blame(
    N: int,
    xy: Dict[str, float],
    dim_map: Dict[Tuple[int, int], float],
    points_list: List[Dict[str, Any]],
    sail: Dict[str, Any],
) -> Dict[str, Any]:
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

    for k in xy:
        blame[k] = 0.0
    # Also init per-vertex blame?
    # Actually blame is usually per edge for discrepancies.
    
    if N >= 4:
        combos = _get_four_point_combos_with_dims(N, xy)
        for cdict in combos:
            combo_str = cdict["combo"] 
            indices = cdict["indices"] # [0, 1, 2, 3] integers

            res = _compute_discrepancy_xy(cdict["dims"])
            disc = res["discrepancy"]
            discrepancies[combo_str] = disc
            
            has_reflex = any(res["reflex"].values())
            if has_reflex: reflex_flag = True
            
            # Map local A,B,C,D to global indices (str)
            labels_map = {'A': str(indices[0]), 'B': str(indices[1]), 'C': str(indices[2]), 'D': str(indices[3])}
            
            for rel_k, is_ref in res["reflex"].items():
                if is_ref:
                    display_lbl = labels_map[rel_k]
                    ang = res["angles"][rel_k]
                    current = reflex_angle_values.get(display_lbl)
                    if current is None or ang > current:
                        reflex_angle_values[display_lbl] = ang

            if disc is not None and math.isfinite(disc) and disc > discrepancy_threshold:
                box_problems[combo_str] = True
                
                # Assign blame to all edges contained in this box
                idx_set = set(indices)
                
                for blame_key in list(blame.keys()):
                    # blame_key is "u-v"
                    try:
                        parts = blame_key.split('-')
                        if len(parts) == 2:
                            u, v = int(parts[0]), int(parts[1])
                            if u in idx_set and v in idx_set:
                                blame[blame_key] += disc
                    except ValueError:
                        pass

    tip_discrepancies = _compute_tip_connection_discrepancies(N, dim_map, points_list)
    for key, disc in tip_discrepancies.items():
        discrepancies[key] = disc
        if disc is not None and math.isfinite(disc) and disc > discrepancy_threshold:
            box_problems[key] = True
            blame[key] = (blame.get(key) or 0.0) + disc

    return {
        "discrepancies": discrepancies,
        "blame": blame,
        "boxProblems": box_problems,
        "discrepancyThreshold": discrepancy_threshold,
        "reflex": reflex_flag,
        "reflexAngleValues": reflex_angle_values,
    }


# ---------------------------------------------------------------------------
# Pricing – DB-backed lookup
# ---------------------------------------------------------------------------
def _get_price_by_fabric(fabric: str, edge_meter: int) -> float:
    if not fabric:
        return 0.0
    from models import FabricType, ShadeSailMembranePriceList
    ft = FabricType.query.filter_by(name=fabric).first()
    if not ft:
        return 0.0
    row = ShadeSailMembranePriceList.query.filter_by(
        fabric_type_id=ft.id, edge_meter=edge_meter
    ).first()
    if row:
        return float(row.price)
    # Clamp to minimum available entry
    min_row = (ShadeSailMembranePriceList.query
        .filter_by(fabric_type_id=ft.id)
        .order_by(ShadeSailMembranePriceList.edge_meter.asc())
        .first())
    if min_row and edge_meter < min_row.edge_meter:
        return float(min_row.price)
    return 0.0




__all__ = ["calculate"]
