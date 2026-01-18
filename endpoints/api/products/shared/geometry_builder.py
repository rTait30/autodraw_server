import uuid
from typing import Dict, List, Any, Optional

class GeometryBuilder:
    def __init__(self):
        self.data = []

    def add(self, type_name: str, ad_layer: str, attributes: Dict, key: str = None, tags: List[str] = None, product_index: int = None):
        if tags is None:
            tags = []
        
        new_id = str(uuid.uuid4())
        
        obj = {
            "id": new_id,
            "type": type_name,
            "ad_layer": ad_layer,
            "attributes": attributes,
            "tags": tags
        }
        
        if key:
            obj["key"] = key
        
        if product_index is not None:
            obj["product_index"] = product_index
            
        self.data.append(obj)

    def get_output(self):
        return {
            "new_geometry": self.data
            # Tags are now embedded in the objects, so no separate "tags" output
        }
