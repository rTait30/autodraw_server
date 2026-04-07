"""SHADE_SAIL project calculations.

The incoming payload shape mirrors COVER:
{
    "products": [{"attributes": {...}}, ...]
}

Each product's attributes are mutated in-place with derived fields.
Returns the full mutated data dict.
"""

from typing import Any, Dict, List
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
        points = attributes.get("points") or []
        point_count = int(_num(attributes.get("pointCount")) or len(points))
        connections = _get_connection_records(attributes.get("connections"))

        perimeter = 0.0
        for connection in connections:
            u = connection.get("from")
            v = connection.get("to")
            if not isinstance(u, int) or not isinstance(v, int) or point_count <= 0 or not is_edge(u, v, point_count):
                continue
            perimeter += _num(connection.get("value")) or 0.0

        attributes["perimeter"] = perimeter
        if perimeter % 1000 < 200:
            attributes["edgeMeter"] = int(math.floor(perimeter / 1000))
        else:
            attributes["edgeMeter"] = int(math.ceil(perimeter / 1000))

        compute_2d_connections(attributes)
        compute_geometry(attributes)
        compute_workpoints(attributes, WORKPOINT_METHODS, DEFAULT_WORKPOINT_METHOD)

        box_data = compute_boxes(attributes)

        
        attributes["discrepancies"] = box_data["discrepancies"]
        attributes["blame"] = box_data["blame"]
        attributes["boxProblems"] = box_data["boxProblems"]
        attributes["hasReflexAngle"] = bool(box_data["reflex"])
        attributes["reflexAngleValues"] = box_data["reflexAngleValues"]

        discrepancy_values = [
            abs(value)
            for value in attributes["discrepancies"].values()
            if value is not None and math.isfinite(value)
        ]
        attributes["maxDiscrepancy"] = max(discrepancy_values) if discrepancy_values else 0.0
        attributes["discrepancyProblem"] = attributes["maxDiscrepancy"] > box_data["discrepancyThreshold"]

        xy_distances = attributes.get("xyDistances") or {}
        blame = attributes.get("blame") or {}
        for connection in connections:
            u = connection.get("from")
            v = connection.get("to")
            if not isinstance(u, int) or not isinstance(v, int):
                continue
            key = f"{min(u, v)}-{max(u, v)}"
            if key in xy_distances:
                connection["length2d"] = xy_distances[key]
            if key in blame:
                connection["blame"] = blame[key]

        total_trace_length = 0.0
        for tc in attributes.get("traceCables", []) or []:
            total_trace_length += _num(tc.get("length")) or 0.0
        attributes["totalTraceLength"] = total_trace_length
        attributes["totalTraceLengthCeilMeters"] = int(math.ceil(total_trace_length / 1000.0)) if total_trace_length else None

        fabric_type = attributes.get("fabricType")
        effective_edge_meter = attributes.get("edgeMeter", 0) - (attributes.get("totalTraceLengthCeilMeters") or 0)
        attributes["fabricPrice"] = _get_price_by_fabric(fabric_type, int(effective_edge_meter)) if fabric_type else 0.0

        fitting_counts: Dict[str, int] = {}
        for pt in points:
            fitting = pt.get("cornerFitting")
            if fitting:
                fitting_counts[fitting] = fitting_counts.get(fitting, 0) + 1
        attributes["fittingCounts"] = fitting_counts

        total_sail_length = 0.0
        for conn in connections:
            if conn.get("sailTrack"):
                val = _num(conn.get("value"))
                if val:
                    total_sail_length += val

        attributes["totalSailLength"] = total_sail_length
        attributes["totalSailLengthCeilMeters"] = int(math.ceil(total_sail_length / 1000.0)) if total_sail_length else None
        sail["attributes"] = attributes

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
