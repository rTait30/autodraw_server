from enum import Enum
from typing import List, Optional, Union, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone

# --- 1. GEOMETRY PRIMITIVES ---
class GeometryType(str, Enum):
    LINE = "line"
    CIRCLE = "circle"
    POLYLINE = "polyline"

class BaseEntity(BaseModel):
    id: str
    role: str  # <--- THE MAGIC TAG (e.g., "boundary", "post", "raft")
    layer: str # Original AutoCAD layer (for reference)
    color: Optional[str] = None

class LineEntity(BaseEntity):
    type: Literal[GeometryType.LINE] = GeometryType.LINE
    start: List[float] # [x, y, z]
    end: List[float]   # [x, y, z]

class CircleEntity(BaseEntity):
    type: Literal[GeometryType.CIRCLE] = GeometryType.CIRCLE
    center: List[float]
    radius: float
    normal: List[float] = [0, 0, 1]

# Union type for the list
AutoDrawEntity = Union[LineEntity, CircleEntity]

# --- 2. HIERARCHY ---
class SubStepRecord(BaseModel):
    status: str
    label: str # Useful to store label in record for easy UI display
    geometry_data: List[Dict[str, Any]] = [] # Empty list for Pydantic/C# objects
    metadata: Dict[str, Any] = {}

class StepRecord(BaseModel):
    status: str
    label: str
    substeps: Dict[str, SubStepRecord] = {}

class ProductRecord(BaseModel):
    product_id: str
    product_type: str
    created_at: datetime
    # The record is keyed by the Step KEY (e.g., "structure", not "Structure")
    steps: Dict[str, StepRecord] = {}
