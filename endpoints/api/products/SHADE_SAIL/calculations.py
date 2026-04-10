"""SHADE_SAIL project calculations.

The incoming payload shape mirrors COVER:
{
    "products": [{"attributes": {...}}, ...]
}

Each product's attributes are mutated in-place with derived fields.
Returns the full mutated data dict.
"""

from typing import Any, Dict, List
import copy
import math

from .geometry import (
    DEFAULT_WORKPOINT_METHOD,
    WORKPOINT_METHODS,
    _get_connection_records,
    compute_boxes,
    compute_2d_connections,
    compute_geometry,
    compute_workpoints,
    is_edge,
)


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
        calculated = copy.deepcopy(attributes)

        points = calculated.get("points") or []
        point_count = int(_num(calculated.get("pointCount")) or len(points))
        connections = _get_connection_records(calculated.get("connections"))

        perimeter = 0.0
        for connection in connections:
            u = connection.get("from")
            v = connection.get("to")
            if not isinstance(u, int) or not isinstance(v, int) or point_count <= 0 or not is_edge(u, v, point_count):
                continue
            perimeter += _num(connection.get("value")) or 0.0

        calculated["perimeter"] = perimeter
        if perimeter % 1000 < 200:
            calculated["edgeMeter"] = int(math.floor(perimeter / 1000))
        else:
            calculated["edgeMeter"] = int(math.ceil(perimeter / 1000))

        compute_2d_connections(calculated)
        compute_geometry(calculated)
        compute_workpoints(calculated, WORKPOINT_METHODS, DEFAULT_WORKPOINT_METHOD)

        box_data = compute_boxes(calculated)
        
        calculated["boxes"] = box_data["boxes"]
        calculated["hasReflexAngle"] = bool(box_data["reflex"])
        calculated["reflexAngleValues"] = box_data["reflexAngleValues"]

        discrepancy_values = [
            abs(box["discrepancy"])
            for box in calculated["boxes"].values()
            if box.get("discrepancy") is not None and math.isfinite(box["discrepancy"])
        ]
        calculated["maxDiscrepancy"] = max(discrepancy_values) if discrepancy_values else 0.0
        calculated["discrepancyProblem"] = calculated["maxDiscrepancy"] > box_data["discrepancyThreshold"]

        connection_blame = box_data.get("connectionBlame") or {}
        conns_obj = calculated.get("connections")
        if isinstance(conns_obj, dict):
            for conn_key, conn_val in conns_obj.items():
                if not isinstance(conn_val, dict):
                    continue
                blame_key = conn_key.replace(",", "-")
                if blame_key in connection_blame:
                    conn_val["blame"] = connection_blame[blame_key]

        total_trace_length = 0.0
        for tc in calculated.get("traceCables", []) or []:
            total_trace_length += _num(tc.get("length")) or 0.0
        calculated["totalTraceLength"] = total_trace_length
        calculated["totalTraceLengthCeilMeters"] = int(math.ceil(total_trace_length / 1000.0)) if total_trace_length else None

        total_sail_length = 0.0
        sail_tracks = calculated.get("sailTracks") or {}
        connections_obj = calculated.get("connections") or {}
        if isinstance(sail_tracks, dict) and isinstance(connections_obj, dict):
            for track_key in sail_tracks:
                conn = connections_obj.get(track_key)
                if conn and isinstance(conn, dict):
                    val = _num(conn.get("value"))
                    if val:
                        total_sail_length += val

        calculated["totalSailLength"] = total_sail_length
        calculated["totalSailLengthCeilMeters"] = int(math.ceil(total_sail_length / 1000.0)) if total_sail_length else None

        fabric_type = calculated.get("fabricType")
        effective_edge_meter = calculated.get("edgeMeter", 0) - (calculated.get("totalTraceLengthCeilMeters") or 0)
        calculated["fabricPrice"] = _get_price_by_fabric(fabric_type, int(effective_edge_meter)) if fabric_type else 0.0

        fitting_counts: Dict[str, int] = {}
        for pt in points:
            fitting = pt.get("cornerFitting")
            if fitting:
                fitting_counts[fitting] = fitting_counts.get(fitting, 0) + 1
        calculated["fittingCounts"] = fitting_counts

        sail["calculated"] = calculated

    return data



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
