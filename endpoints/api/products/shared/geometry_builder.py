import uuid
from typing import Dict, List, Any, Optional

class GeometryBuilder:
    def __init__(self, existing_geometry: List[Dict[str, Any]] = None, next_id: int = None):
        self.data = []
        
        if next_id is not None:
            self.next_id = next_id
        else:
            self.next_id = 1
            if existing_geometry:
                for item in existing_geometry:
                    try:
                        # Check if ID is an integer (or string representation of one)
                        # We handle string IDs (like "100") if they are numeric
                        current_id = int(item.get("id", 0))
                        if current_id >= self.next_id:
                            self.next_id = current_id + 1
                    except (ValueError, TypeError):
                        # Ignore non-integer IDs (e.g. UUID strings)
                        pass

    def add(self, type_name: str, ad_layer: str, attributes: Dict, key: str = None, tags: List[str] = None, product_index: int = None):
        if tags is None:
            tags = []
        
        # Use the next available integer ID
        new_id = self.next_id
        self.next_id += 1
        
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
