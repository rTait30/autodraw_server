# models/universal_geometry.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Union, Optional

# --- Pure Math ---
class GeoPoint(BaseModel):
    location: List[float] # [x, y, z]

class GeoLine(BaseModel):
    start: List[float]
    end: List[float]

class GeoPolyline(BaseModel):
    points: List[List[float]] # [[x,y,z], [x,y,z], ...]
    closed: bool = False

class GeoCircle(BaseModel):
    center: List[float]
    radius: float
    normal: List[float] = [0, 0, 1] # Defaults to Z-up

class GeoMesh(BaseModel):
    vertices: List[List[float]] 
    faces: List[List[int]] # Indices referring to vertices (Triangles/Quads)

class GeoText(BaseModel):
    location: List[float]
    text: str
    rotation: float = 0.0
    attachment_point: int = 1 # AutoCAD standard mapping

# --- The Wrapper ---
class CanvasItem(BaseModel):
    """
    The atom of your design. 
    'props' holds software-specifics like AutoCAD Color Index or layer names.
    """
    type: str # "line", "mesh", "text", etc.
    layer: str = "0"
    geometry: Union[GeoLine, GeoPoint, GeoCircle, GeoMesh, GeoPolyline, GeoText]
    props: Dict[str, Any] = {}

from datetime import datetime

class ManifestMeta(BaseModel):
    product_id: str
    project_id: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    # The "Recipe" ID that tells the server how to automate this
    product_type_id: str 

class StageData(BaseModel):
    """
    A single bucket of work.
    """
    step_index: int
    name: str 
    status: str = "pending" # "pending", "complete", "waiting_for_human"
    generated_by: Optional[str] = None # "server_enricher", "user_dave"
    
    # Configuration specific to this step (e.g. { "weld_width": 50 })
    config: Dict[str, Any] = {} 
    
    # The Geometry result of this step
    canvas: List[CanvasItem] = []

class DesignManifest(BaseModel):
    # Universal Metadata
    meta: ManifestMeta 
    
    # Domain Specific Specifications
    specifications: ShadeSpecs 
    
    # Domain Specific Pipeline
    # (Typed as ShadePipeline, but could be Union[ShadePipeline, ShedPipeline] later)
    pipeline: ShadePipeline
