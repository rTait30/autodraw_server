from typing import Dict, List, Any
import uuid
from endpoints.api.products.shared.geometry_builder import GeometryBuilder

def run(geometry = [], project_attributes = {}, product_attributes = [], next_geometry_id: int = 1):
    """
    Step 0.2b Draw workpoints: Work Model Generation (bisect method).
    
    """
    
    gb = GeometryBuilder(existing_geometry=geometry, next_id=next_geometry_id)

    for idx, sail in enumerate(product_attributes):

        print (f"Generating work model (Bisect) for Sail #{idx}...")

        # Unpack geometry for cleaner code
        positions = sail.get('positions', {})
        points = sail.get('points', {})
        workpoints = sail.get('workpoints_bisect', {})
        
        # --- Workpoints & Connections ---
        # Sort labels to ensure consistent Edge naming (A->B, B->C)
        sorted_labels = sorted(positions.keys())
        post_map = {}
        wp_map = {}

        # 1. Map Points (Post vs Workpoint) & Draw Connection
        for label in sorted_labels:
            # -- Post (P) --
            pos = positions.get(label, {})
            x = pos.get('x', 0)
            y = pos.get('y', 0)
            try:
                z = int(float(points.get(label, {}).get("height", 0)))
            except (ValueError, TypeError):
                z = 0
            post_pt = [x, y, z]
            post_map[label] = post_pt
            
            # -- Workpoint (W) --
            wp_data = workpoints.get(label)
            if wp_data:
                # Handle potentially different formats (dict or list)
                if isinstance(wp_data, dict):
                    wp_x = wp_data.get('x', 0)
                    wp_y = wp_data.get('y', 0)
                    wp_z = wp_data.get('z', 0)
                elif isinstance(wp_data, (list, tuple)) and len(wp_data) >= 3:
                    wp_x, wp_y, wp_z = wp_data[0], wp_data[1], wp_data[2]
                else:
                    # Fallback to post if WP is missing/malformed? 
                    wp_x, wp_y, wp_z = x, y, z

                wp_pt = [wp_x, wp_y, wp_z]
                wp_map[label] = wp_pt

                # Draw Connection: Post -> Workpoint
                gb.add(
                    type_name="geo_line",
                    ad_layer="WORKMODEL",
                    attributes={
                        "start": post_pt, 
                        "end": wp_pt
                    },
                    key=f"conn_{label}",
                    tags=["connection"],
                    product_index=idx
                )

        # 2. Workpoint Perimeter (Closed Loop)
        num_points = len(sorted_labels)
        for i in range(num_points):
            label_start = sorted_labels[i]
            label_end = sorted_labels[(i + 1) % num_points]
            
            # Ensure we accept both points
            if label_start in wp_map and label_end in wp_map:
                start = wp_map[label_start]
                end = wp_map[label_end]
                
                gb.add(
                    type_name="geo_line",
                    ad_layer="WORKMODEL",
                    attributes={
                        "start": start, 
                        "end": end
                    },
                    key=f"wp_edge_{label_start}{label_end}",
                    tags=["workline"],
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
