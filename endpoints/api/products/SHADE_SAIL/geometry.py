"""Geometry helpers for SHADE_SAIL calculations."""

from itertools import combinations
from typing import Any, Dict, List, Tuple
import math

from .shared import _get_dist_xy
from .workpoints.workpoints_bisect import compute_workpoints_bisect
from .workpoints.workpoints_centroid import compute_workpoints_centroid


WORKPOINT_METHODS = {
    "centroid": True,
    "bisect": True,
    "midpoint": False,
    "area": False,
    "weighted": False,
    "minimal": False,
    "bisect_rotate": True,
    "bisect_rotate_normalized": False,
    "bisect_rotate_planar": False,
    "plane_resultant": False,
}

DEFAULT_WORKPOINT_METHOD = "centroid"


def _num(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _int_or_none(value):
    number = _num(value)
    if number is None:
        return None
    return int(number)


def _get_connection_records(connections: Any) -> List[Dict[str, Any]]:
    if isinstance(connections, list):
        return [connection for connection in connections if isinstance(connection, dict)]

    records: List[Dict[str, Any]] = []
    if not isinstance(connections, dict):
        return records

    for key, value in connections.items():
        if not isinstance(value, dict):
            continue

        u = _int_or_none(value.get("from"))
        v = _int_or_none(value.get("to"))
        if u is None or v is None:
            try:
                sep = "," if "," in str(key) else "-"
                from_part, to_part = str(key).split(sep, 1)
                u = int(from_part)
                v = int(to_part)
            except (TypeError, ValueError):
                continue

        record = {**value, "from": u, "to": v}
        records.append(record)

    return records


def _build_dim_map(connections: Any) -> Dict[Tuple[int, int], float]:
    dim_map: Dict[Tuple[int, int], float] = {}
    for connection in _get_connection_records(connections):
        u = _int_or_none(connection.get("from"))
        v = _int_or_none(connection.get("to"))
        value = _num(connection.get("value"))
        if u is None or v is None or value is None:
            continue
        dim_map[(min(u, v), max(u, v))] = value
    return dim_map


def is_edge(u: int, v: int, point_count: int) -> bool:
    return (v == (u + 1) % point_count) or (u == (v + 1) % point_count)


def _project_to_xy(length: float, z1: float, z2: float) -> float:
    dz = (z2 or 0.0) - (z1 or 0.0)
    if length is None:
        return 0.0
    return math.sqrt(max(0.0, length ** 2 - dz ** 2))


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


def _place_quadrilateral(
    dAB: float,
    dAC: float,
    dAD: float,
    dBC: float,
    dBD: float,
    dCD: float,
) -> Dict[int, Dict[str, float]]:
    pos: Dict[int, Dict[str, float]] = {
        0: {"x": 0.0, "y": 0.0},
        1: {"x": dAB, "y": 0.0},
    }

    if dAB > 0.0 and dAC > 0.0:
        x_c = (dAC ** 2 - dBC ** 2 + dAB ** 2) / (2 * dAB)
        y_c = math.sqrt(max(0.0, dAC ** 2 - x_c ** 2))
        pos[2] = {"x": x_c, "y": -y_c}
    else:
        pos[2] = {"x": dAB, "y": dBC}

    dx = pos[2]["x"] - pos[0]["x"]
    dy = pos[2]["y"] - pos[0]["y"]
    dAC_calc = math.sqrt(dx * dx + dy * dy)

    if dAC_calc > 0.001 and dAD > 0.0 and dCD > 0.0:
        angle_AC = math.atan2(dy, dx)
        num = dAD ** 2 + dAC_calc ** 2 - dCD ** 2
        den = 2 * dAD * dAC_calc
        cos_CAD = max(-1.0, min(1.0, num / den))
        angle_CAD = math.acos(cos_CAD)

        a1 = angle_AC + angle_CAD
        a2 = angle_AC - angle_CAD

        d1 = {"x": dAD * math.cos(a1), "y": dAD * math.sin(a1)}
        d2 = {"x": dAD * math.cos(a2), "y": dAD * math.sin(a2)}

        dist1 = math.hypot(d1["x"] - pos[1]["x"], d1["y"] - pos[1]["y"])
        dist2 = math.hypot(d2["x"] - pos[1]["x"], d2["y"] - pos[1]["y"])
        pos[3] = d1 if abs(dist1 - dBD) < abs(dist2 - dBD) else d2
    else:
        pos[3] = {"x": 0.0, "y": dAD}

    return pos


def _signed_area(positions: Dict[int, Dict[str, float]], order: List[int]) -> float:
    area = 0.0
    for index, point_index in enumerate(order):
        p1 = positions[point_index]
        p2 = positions[order[(index + 1) % len(order)]]
        area += p1["x"] * p2["y"] - p2["x"] * p1["y"]
    return area / 2


def _calculate_tr_angle_from_coords(
    tr: Dict[str, float],
    br: Dict[str, float],
    global_angle_rad: float,
) -> float:
    dx = br["x"] - tr["x"]
    dy = br["y"] - tr["y"]
    if math.hypot(dx, dy) < 1e-9:
        return 0.0
    ang_right = math.atan2(dy, dx)
    diff_deg = math.degrees(ang_right - global_angle_rad)
    return (diff_deg + 180) % 360 - 180


def _generate_boxes(point_count: int) -> Dict[str, List[int]]:
    boxes: Dict[str, List[int]] = {}
    box_count = (point_count - 2) // 2
    for index in range(box_count):
        boxes[f"box_{index}"] = [
            index,
            index + 1,
            point_count - 1 - index - 1,
            point_count - 1 - index,
        ]
    if point_count % 2 != 0:
        mid = point_count // 2
        boxes[f"box_{box_count}"] = [mid - 1, mid, mid + 1]
    return boxes


def _draw_box_at(
    box_points: List[int],
    xy_distances: Dict[str, float],
    anchor: Dict[str, float],
    angle_rad: float,
) -> Dict[int, Dict[str, float]]:
    tl, tr, br, bl = box_points
    placed = _place_quadrilateral(
        _get_dist_xy(tl, tr, xy_distances),
        _get_dist_xy(tl, br, xy_distances),
        _get_dist_xy(tl, bl, xy_distances),
        _get_dist_xy(tr, br, xy_distances),
        _get_dist_xy(tr, bl, xy_distances),
        _get_dist_xy(br, bl, xy_distances),
    )
    mapping = {tl: placed[0], tr: placed[1], br: placed[2], bl: placed[3]}
    result = {}
    for point_index, point in mapping.items():
        rotated = _rotate_ccw(point["x"], point["y"], angle_rad)
        result[point_index] = {
            "x": rotated["x"] + anchor["x"],
            "y": rotated["y"] + anchor["y"],
        }
    return result


def _compute_positions_for_many_sided(
    point_count: int,
    xy_distances: Dict[str, float],
) -> Dict[int, Dict[str, float]]:
    positions: Dict[int, Dict[str, float]] = {}
    current_anchor = {"x": 0.0, "y": 0.0}
    global_angle = 0.0
    prev_TR_angle = 0.0
    first_box = False
    tolerance = 1e-3
    last_box_points: List[int] = []

    for box_points in _generate_boxes(point_count).values():
        if len(box_points) == 4:
            tl, tr, br, bl = box_points
            top = _get_dist_xy(tl, tr, xy_distances)
            left = _get_dist_xy(tl, bl, xy_distances)
            right = _get_dist_xy(tr, br, xy_distances)
            bottom = _get_dist_xy(br, bl, xy_distances)
            diag_left = _get_dist_xy(tr, bl, xy_distances)
            diag_right = _get_dist_xy(tl, br, xy_distances)
            angle_TL = _law_cosine(top, left, diag_left)

            if not first_box:
                quad_pos = _place_quadrilateral(top, diag_right, left, right, diag_left, bottom)
                mapped = {tl: quad_pos[0], tr: quad_pos[1], br: quad_pos[2], bl: quad_pos[3]}
                positions.update(mapped)
                current_anchor = mapped[tr]
                prev_TR_angle = _calculate_tr_angle_from_coords(mapped[tr], mapped[br], global_angle)
                first_box = True
            else:
                global_angle += math.radians(prev_TR_angle + angle_TL)
                placed = _draw_box_at(box_points, xy_distances, current_anchor, global_angle)
                for point_index, point in placed.items():
                    old_point = positions.get(point_index)
                    if old_point and math.hypot(point["x"] - old_point["x"], point["y"] - old_point["y"]) <= tolerance:
                        continue
                    positions[point_index] = point
                current_anchor = placed[tr]
                prev_TR_angle = _calculate_tr_angle_from_coords(placed[tr], placed[br], global_angle)

            last_box_points = [tl, tr, br, bl]
            continue

        if len(box_points) != 3:
            continue

        left_idx, tip_idx, right_idx = box_points
        if left_idx not in positions or right_idx not in positions:
            continue

        pA = positions[left_idx]
        pC = positions[right_idx]
        dAB = _get_dist_xy(left_idx, tip_idx, xy_distances)
        dBC = _get_dist_xy(tip_idx, right_idx, xy_distances)
        dAC = _get_dist_xy(left_idx, right_idx, xy_distances)

        angle_A = math.radians(_law_cosine(dAB, dAC, dBC))
        angle_AC = math.atan2(pC["y"] - pA["y"], pC["x"] - pA["x"])
        b1 = {
            "x": pA["x"] + dAB * math.cos(angle_AC + angle_A),
            "y": pA["y"] + dAB * math.sin(angle_AC + angle_A),
        }
        b2 = {
            "x": pA["x"] + dAB * math.cos(angle_AC - angle_A),
            "y": pA["y"] + dAB * math.sin(angle_AC - angle_A),
        }

        diagonals = []
        for point_index, point in positions.items():
            if point_index in (left_idx, right_idx):
                continue
            distance = _get_dist_xy(tip_idx, point_index, xy_distances)
            if distance > 0:
                diagonals.append((point, distance))

        best_point = None
        if diagonals:
            err1 = sum(abs(math.hypot(b1["x"] - point["x"], b1["y"] - point["y"]) - dist) for point, dist in diagonals)
            err2 = sum(abs(math.hypot(b2["x"] - point["x"], b2["y"] - point["y"]) - dist) for point, dist in diagonals)
            best_point = b1 if err1 < err2 else b2

        if best_point is None:
            ref_point = next((positions[idx] for idx in last_box_points if idx not in (left_idx, right_idx) and idx in positions), None)
            if ref_point:
                vACx = pC["x"] - pA["x"]
                vACy = pC["y"] - pA["y"]
                cp_ref = vACx * (ref_point["y"] - pA["y"]) - vACy * (ref_point["x"] - pA["x"])
                cp_b1 = vACx * (b1["y"] - pA["y"]) - vACy * (b1["x"] - pA["x"])
                best_point = b1 if (cp_b1 > 0) != (cp_ref > 0) else b2
            else:
                best_point = b1

        positions[tip_idx] = best_point
        current_anchor = best_point

    return positions


def _build_xy_distances(connections: Any) -> Dict[str, float]:
    """Build {"min-max": length2d} lookup from connections that have length2d."""
    xy: Dict[str, float] = {}
    for rec in _get_connection_records(connections):
        u = _int_or_none(rec.get("from"))
        v = _int_or_none(rec.get("to"))
        val = _num(rec.get("length2d"))
        if u is None or v is None or val is None:
            continue
        xy[f"{min(u, v)}-{max(u, v)}"] = val
    return xy


def compute_2d_connections(attributes: Dict[str, Any]) -> None:
    points = attributes.get("points") or []
    connections = attributes.get("connections")

    if not isinstance(points, list):
        return

    for point in points:
        if isinstance(point, dict):
            point["z"] = _num(point.get("height")) or _num(point.get("z")) or 0.0

    if not isinstance(connections, dict):
        return

    for key, conn in connections.items():
        if not isinstance(conn, dict):
            continue
        try:
            sep = "," if "," in key else "-"
            parts = key.split(sep, 1)
            u, v = int(parts[0]), int(parts[1])
        except (TypeError, ValueError, IndexError):
            continue
        length_3d = _num(conn.get("value"))
        if u < 0 or v < 0 or u >= len(points) or v >= len(points) or length_3d is None:
            continue
        conn["length2d"] = _project_to_xy(length_3d, points[u].get("z"), points[v].get("z"))


def compute_geometry(attributes: Dict[str, Any]) -> Dict[str, Dict[str, float]]:

    points = attributes.get("points") or []
    point_count = int(_num(attributes.get("pointCount")) or len(points))
    point_count = min(point_count, len(points)) if isinstance(points, list) else 0

    if not point_count or not isinstance(points, list):
        attributes["positions"] = {}
        return {}

    xy_distances = _build_xy_distances(attributes.get("connections"))

    def finalize(positions):
        for index, point in enumerate(points):
            pos = positions.get(index, {"x": 0.0, "y": 0.0})
            point["x"] = pos["x"]
            point["y"] = pos["y"]
        attributes["positions"] = positions
        return positions

    if point_count == 3:
        positions = {
            0: {"x": 0.0, "y": 0.0},
            1: {"x": _get_dist_xy(0, 1, xy_distances), "y": 0.0},
        }
        ab = _get_dist_xy(0, 1, xy_distances)
        bc = _get_dist_xy(1, 2, xy_distances)
        ac = _get_dist_xy(0, 2, xy_distances)
        if ab and ac:
            cx = (ac ** 2 - bc ** 2 + ab ** 2) / (2 * ab)
            cy = math.sqrt(max(0.0, ac ** 2 - cx ** 2))
            positions[2] = {"x": cx, "y": -cy}
        else:
            positions[2] = {"x": 0.0, "y": 0.0}
        if _signed_area(positions, [0, 1, 2]) > 0:
            for position in positions.values():
                position["y"] = -position["y"]
        return finalize(positions)

    if point_count == 4:
        positions = {
            index: {
                "x": point["x"],
                "y": point["y"],
            }
            for index, point in _place_quadrilateral(
                _get_dist_xy(0, 1, xy_distances),
                _get_dist_xy(0, 2, xy_distances),
                _get_dist_xy(0, 3, xy_distances),
                _get_dist_xy(1, 2, xy_distances),
                _get_dist_xy(1, 3, xy_distances),
                _get_dist_xy(2, 3, xy_distances),
            ).items()
        }
        for index in range(point_count):
            positions.setdefault(index, {"x": 0.0, "y": 0.0})
        if _signed_area(positions, [0, 1, 2, 3]) > 0:
            for position in positions.values():
                position["y"] = -position["y"]
        return finalize(positions)

    positions = _compute_positions_for_many_sided(point_count, xy_distances)
    normalized_positions = {
        index: positions.get(index, {"x": 0.0, "y": 0.0})
        for index in range(point_count)
    }
    if _signed_area(normalized_positions, list(range(point_count))) > 0:
        for position in normalized_positions.values():
            position["y"] = -position["y"]
    return finalize(normalized_positions)


def compute_workpoints(
    attributes: Dict[str, Any],
    workpoint_methods: Dict[str, bool] | None = None,
    default_workpoint_method: str = DEFAULT_WORKPOINT_METHOD,
) -> None:
    points = attributes.get("points") or []
    if not isinstance(points, list) or not points:
        attributes["centroid"] = {}
        attributes["centroidArea"] = {}
        attributes["workpoints"] = {}
        attributes["haveWorkpoints"] = False
        return

    methods = workpoint_methods or WORKPOINT_METHODS
    for point in points:
        point.setdefault("workpoint_methods", {})
        if point.get("tensionAllowance") in (None, ""):
            point["tensionAllowance"] = 0.0

    count = len(points)
    cx = sum(point["x"] for point in points) / count
    cy = sum(point["y"] for point in points) / count
    cz = sum(point["z"] for point in points) / count
    attributes["centroid"] = {"x": cx, "y": cy, "z": cz}

    area_signed = 0.0
    cx_num = 0.0
    cy_num = 0.0
    for index in range(count):
        current_point = points[index]
        next_point = points[(index + 1) % count]
        cross = current_point["x"] * next_point["y"] - next_point["x"] * current_point["y"]
        area_signed += cross
        cx_num += (current_point["x"] + next_point["x"]) * cross
        cy_num += (current_point["y"] + next_point["y"]) * cross

    area = area_signed * 0.5
    if abs(area) > 1e-9:
        cx_area = cx_num / (6.0 * area)
        cy_area = cy_num / (6.0 * area)
    else:
        cx_area = cx
        cy_area = cy
    attributes["centroidArea"] = {"x": cx_area, "y": cy_area, "z": cz}

    if methods.get("centroid"):
        compute_workpoints_centroid(points, cx, cy, cz)
    if methods.get("bisect"):
        compute_workpoints_bisect(points, cx, cy, cz)

    method_maps: Dict[str, Dict[str, Dict[str, float]]] = {}
    for method_name, enabled in methods.items():
        if not enabled:
            continue
        method_map = {}
        for index, point in enumerate(points):
            workpoint = point.get("workpoint_methods", {}).get(method_name)
            if workpoint is not None:
                method_map[str(index)] = workpoint
        if method_map:
            method_maps[method_name] = method_map
            attributes[f"workpoints_{method_name}"] = method_map

    default_map = method_maps.get(default_workpoint_method, {})
    for index, point in enumerate(points):
        point["workpoint"] = default_map.get(str(index))

    attributes["workpoints"] = default_map
    attributes["haveWorkpoints"] = bool(default_map)


def get_four_point_combos_with_dims(
    point_count: int,
    xy_distances: Dict[str, float],
) -> List[Dict[str, Any]]:
    results = []
    for combo in combinations(range(point_count), 4):
        dims = {}
        for p1, p2 in combinations(combo, 2):
            key = f"{min(p1, p2)}-{max(p1, p2)}"
            dims[key] = xy_distances.get(key)
        a, b, c, d = combo
        ordered_dims = {
            "AB": dims.get(f"{min(a, b)}-{max(a, b)}"),
            "AC": dims.get(f"{min(a, c)}-{max(a, c)}"),
            "AD": dims.get(f"{min(a, d)}-{max(a, d)}"),
            "BC": dims.get(f"{min(b, c)}-{max(b, c)}"),
            "BD": dims.get(f"{min(b, d)}-{max(b, d)}"),
            "CD": dims.get(f"{min(c, d)}-{max(c, d)}"),
        }
        results.append({
            "combo": "-".join(str(value) for value in combo),
            "dims": ordered_dims,
            "indices": list(combo),
        })
    return results


def compute_discrepancy_xy(dims_map: Dict[str, float]) -> Dict[str, Any]:
    lengths = [dims_map.get(key) for key in ["AB", "AC", "AD", "BC", "BD", "CD"]]
    if any(value in (None, 0) for value in lengths):
        return {"discrepancy": 0, "reflex": {}, "angles": {}, "reflexAngles": {}}

    AB, AC, AD, BC, BD, CD = lengths

    def safe_acos(value: float) -> float:
        return math.acos(max(-1.0, min(1.0, value)))

    point_a = {"x": 0.0, "y": 0.0}
    point_c = {"x": AC, "y": 0.0}
    angleA_ABC = safe_acos((AB * AB + AC * AC - BC * BC) / (2 * AB * AC))
    point_b = {"x": AB * math.cos(angleA_ABC), "y": AB * math.sin(angleA_ABC)}
    angleA_ADC = safe_acos((AD * AD + AC * AC - CD * CD) / (2 * AD * AC))
    point_d1 = {"x": AD * math.cos(angleA_ADC), "y": -AD * math.sin(angleA_ADC)}
    point_d2 = {"x": AD * math.cos(angleA_ADC), "y": AD * math.sin(angleA_ADC)}

    bd1 = math.hypot(point_b["x"] - point_d1["x"], point_b["y"] - point_d1["y"])
    bd2 = math.hypot(point_b["x"] - point_d2["x"], point_b["y"] - point_d2["y"])
    if abs(bd2 - BD) < abs(bd1 - BD):
        point_d = point_d2
        bd_theory = bd2
    else:
        point_d = point_d1
        bd_theory = bd1
    discrepancy = abs(bd_theory - BD)

    points = [point_a, point_b, point_c, point_d]
    area = 0.0
    for index in range(4):
        p1, p2 = points[index], points[(index + 1) % 4]
        area += p1["x"] * p2["y"] - p2["x"] * p1["y"]
    is_ccw = area > 0

    def is_reflex(point_p, point_q, point_r):
        cross = (point_q["x"] - point_p["x"]) * (point_r["y"] - point_q["y"]) - (point_q["y"] - point_p["y"]) * (point_r["x"] - point_q["x"])
        is_left = cross > 0
        return not is_left if is_ccw else is_left

    def angle_at(point_p, point_q, point_r):
        v1 = (point_p["x"] - point_q["x"], point_p["y"] - point_q["y"])
        v2 = (point_r["x"] - point_q["x"], point_r["y"] - point_q["y"])
        m1 = math.hypot(*v1)
        m2 = math.hypot(*v2)
        if not (m1 and m2):
            return 0.0
        return math.acos(max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / (m1 * m2))))

    refA = is_reflex(point_d, point_a, point_b)
    refB = is_reflex(point_a, point_b, point_c)
    refC = is_reflex(point_b, point_c, point_d)
    refD = is_reflex(point_c, point_d, point_a)

    angle_a = angle_at(point_d, point_a, point_b)
    angle_b = angle_at(point_a, point_b, point_c)
    angle_c = angle_at(point_b, point_c, point_d)
    angle_d = angle_at(point_c, point_d, point_a)

    if refA:
        angle_a = 2 * math.pi - angle_a
    if refB:
        angle_b = 2 * math.pi - angle_b
    if refC:
        angle_c = 2 * math.pi - angle_c
    if refD:
        angle_d = 2 * math.pi - angle_d

    return {
        "discrepancy": discrepancy,
        "reflex": {"A": refA, "B": refB, "C": refC, "D": refD},
        "angles": {
            "A": math.degrees(angle_a),
            "B": math.degrees(angle_b),
            "C": math.degrees(angle_c),
            "D": math.degrees(angle_d),
        },
        "reflexAngles": {},
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


def compute_tip_connection_discrepancies(
    point_count: int,
    dim_map: Dict[Tuple[int, int], float],
    points_list: List[Dict[str, Any]],
) -> Dict[str, float]:
    tip_discrepancies: Dict[str, float] = {}

    if point_count < 5 or point_count % 2 == 0:
        return tip_discrepancies

    tip_idx = point_count // 2
    if tip_idx >= len(points_list):
        return tip_discrepancies

    for (u, v), measured_3d in dim_map.items():
        if measured_3d is None or tip_idx not in (u, v):
            continue
        if _is_adjacent_index(u, v, point_count):
            continue

        theoretical_3d = _get_point_3d_distance(points_list, u, v)
        key = f"{min(u, v)}-{max(u, v)}"
        tip_discrepancies[key] = abs(theoretical_3d - measured_3d)

    return tip_discrepancies


def compute_boxes(attributes: Dict[str, Any]) -> Dict[str, Any]:
    discrepancies: Dict[str, Any] = {}
    blame: Dict[str, float] = {}
    box_problems: Dict[str, bool] = {}
    reflex_flag = False
    reflex_angle_values: Dict[str, float] = {}
    points_list = attributes.get("points") or []
    xy = _build_xy_distances(attributes.get("connections"))
    dim_map = _build_dim_map(attributes.get("connections"))
    point_count = len(points_list)

    discrepancy_threshold = 100
    fabric_category = attributes.get("fabricCategory")
    if fabric_category == "PVC":
        discrepancy_threshold = 40
    elif fabric_category == "ShadeCloth":
        discrepancy_threshold = 70

    for key in xy:
        blame[key] = 0.0

    if point_count >= 4:
        combos = get_four_point_combos_with_dims(point_count, xy)
        for combo_data in combos:
            combo_str = combo_data["combo"]
            indices = combo_data["indices"]

            res = compute_discrepancy_xy(combo_data["dims"])
            disc = res["discrepancy"]
            discrepancies[combo_str] = disc

            if any(res["reflex"].values()):
                reflex_flag = True

            labels_map = {
                "A": str(indices[0]),
                "B": str(indices[1]),
                "C": str(indices[2]),
                "D": str(indices[3]),
            }
            for rel_key, is_ref in res["reflex"].items():
                if is_ref:
                    display_label = labels_map[rel_key]
                    angle = res["angles"][rel_key]
                    current = reflex_angle_values.get(display_label)
                    if current is None or angle > current:
                        reflex_angle_values[display_label] = angle

            if disc is not None and math.isfinite(disc) and disc > discrepancy_threshold:
                box_problems[combo_str] = True
                idx_set = set(indices)
                for blame_key in list(blame.keys()):
                    try:
                        parts = blame_key.split("-")
                        if len(parts) == 2:
                            u, v = int(parts[0]), int(parts[1])
                            if u in idx_set and v in idx_set:
                                blame[blame_key] += disc
                    except ValueError:
                        pass

    tip_discrepancies = compute_tip_connection_discrepancies(point_count, dim_map, points_list)
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

    


__all__ = [
    "DEFAULT_WORKPOINT_METHOD",
    "WORKPOINT_METHODS",
    "_build_dim_map",
    "_build_xy_distances",
    "_get_connection_records",
    "compute_boxes",
    "compute_2d_connections",
    "compute_discrepancy_xy",
    "compute_geometry",
    "compute_tip_connection_discrepancies",
    "compute_workpoints",
    "get_four_point_combos_with_dims",
    "is_edge",
]
