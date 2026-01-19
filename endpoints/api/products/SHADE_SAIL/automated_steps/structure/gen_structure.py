from typing import Dict, List, Any
import uuid
from endpoints.api.products.shared.geometry_builder import GeometryBuilder

def run(geometry = [], project_attributes = {}, product_attributes = []):
    """
    Step 0: Structure Generation.
    
    Input:  Project Attributes (The 'Backpack')
    Output: Dictionary of updates to add to the Backpack
            (specifically the 'new_geometry' for the plugin to draw)
    """
    
    gb = GeometryBuilder()

    for idx, sail in enumerate(product_attributes):

        print (f"Generating structure for Sail #{idx}...")

        # Unpack geometry for cleaner code
        positions = sail.get('positions', {})
        points = sail.get('points', {})
        
        # --- A. Posts & Edges ---
        # Sort labels to ensure consistent Edge naming (A->B, B->C)
        sorted_labels = sorted(positions.keys())
        point_map = {}

        # 1. Posts & Point Map
        for label in sorted_labels:
            pos = positions[label]
            x = pos.get('x', 0)
            y = pos.get('y', 0)
            try:
                z = int(float(points.get(label, {}).get("height", 0)))
            except (ValueError, TypeError):
                z = 0
            current_point = [x, y, z]
            point_map[label] = current_point
            
            # Vertical Line (if height > 0)
            if z > 0:
                gb.add(
                    type_name="geo_line",
                    ad_layer="AD_STRUCTURE",
                    attributes={
                        "start": [x, y, 0], 
                        "end": current_point
                    },
                    key=f"post_{label}",
                    tags=["post"],
                    product_index=idx
                )

        # 2. Perimeter Edges (Closed Loop)
        num_points = len(sorted_labels)
        for i in range(num_points):
            label_start = sorted_labels[i]
            label_end = sorted_labels[(i + 1) % num_points]
            
            start = point_map[label_start]
            end = point_map[label_end]
            
            gb.add(
                type_name="geo_line",
                ad_layer="AD_STRUCTURE",
                attributes={
                    "start": start, 
                    "end": end
                },
                key=f"edge_{label_start}{label_end}",
                tags=["edge"],
                product_index=idx
            )

    output = gb.get_output()
    
    return {
        "new geometry": output["new_geometry"],
        "new_project_attributes": {},
        "new_product_attributes": []
    }

# --- Internal Helper (Private to this file) ---
def _format_label_text(label: str, p_data: dict, z: float) -> str:
    fitting = p_data.get("cornerFitting", "")
    hardware = p_data.get("tensionHardware", "")
    return f"{label}\nH: {int(z)}mm\nFitting: {fitting}\nHardware: {hardware}"
