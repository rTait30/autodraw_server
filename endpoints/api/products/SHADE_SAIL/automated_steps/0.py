from typing import Dict, List, Any
# Assuming this helper exists in your common folder

def generate_structure_geometry(attributes: Dict[str, Any]) -> Dict[str, Any]:
    """
    Step 0: Structure Generation.
    
    Input:  Project Attributes (The 'Backpack')
    Output: Dictionary of updates to add to the Backpack
            (specifically the 'canvas_items' for the plugin to draw)
    """
    
    # 1. Reuse existing extraction logic
    # We pass the full attributes dict, assuming it contains the raw user inputs
    
    
    # Unpack geometry for cleaner code
    positions = attributes.get('positions', {})
    edges = attributes.get('edges', [])
    points_data = attributes.get('points_data', {})
    centroid = attributes.get('centroid', (0, 0, 0))

    canvas_items = []

    # --- A. Posts & Corners ---
    for label, pos in positions.items():
        x, y, z = pos
        
        # 1. Post Circle (Top)
        canvas_items.append({
            "type": "geo_circle",
            "layer": "AD_STRUCTURE",
            "geometry": {
                "center": [x, y, z], 
                "radius": 50.0
            }
        })
        
        # 2. Vertical Line (if height > 0)
        if z > 0:
            canvas_items.append({
                "type": "geo_line",
                "layer": "AD_STRUCTURE",
                "geometry": {
                    "start": [x, y, 0], 
                    "end": [x, y, z]
                }
            })

        # 3. Text Info
        info_text = _format_label_text(label, points_data.get(label, {}), z)
        
        # Calculate Offset Vector (away from centroid)
        cx, cy, _ = centroid
        dx, dy = x - cx, y - cy
        mag = (dx**2 + dy**2)**0.5 or 1.0
        
        # Position text 1200mm away from the corner
        text_pos = [x + (dx/mag) * 1200, y + (dy/mag) * 1200, z]

        canvas_items.append({
            "type": "geo_text",
            "layer": "AD_INFO",
            "geometry": {
                "location": text_pos, 
                "text": info_text, 
                "attachment_point": 8 # "Bottom Center" usually
            },
            "props": {"height": 100}
        })

    # --- B. Perimeter Edges ---
    for ((a, b), length) in edges:
        if a in positions and b in positions:
            start = positions[a]
            end = positions[b]
            
            # 1. Visual Line
            canvas_items.append({
                "type": "geo_line",
                "layer": "AD_STRUCTURE",
                "geometry": {
                    "start": list(start), 
                    "end": list(end)
                }
            })
            
            # 2. Edge Label
            mid = [
                (start[0] + end[0]) / 2, 
                (start[1] + end[1]) / 2, 
                (start[2] + end[2]) / 2
            ]
            
            label_txt = f"{a}-{b}\n{int(length)}mm"
            
            canvas_items.append({
                "type": "geo_text",
                "layer": "AD_PEN",
                "geometry": {
                    "location": mid, 
                    "text": label_txt, 
                    "attachment_point": 5 // "Middle Center"
                },
                "props": {
                    "height": 80, 
                    "bg_fill": True
                }
            })

    # --- RETURN ---
    # We pack the result into a specific key (e.g., 'step_0_output')
    # so the Plugin knows exactly where to look for Step 0 geometry.
    return {
        "step_0_output": {
            "status": "complete",
            "generated_by": "server_auto",
            "config": {
                "perimeter": attributes.get("perimeter"),
                "area": attributes.get("area")
            },
            "canvas": canvas_items
        }
    }

# --- Internal Helper (Private to this file) ---
def _format_label_text(label: str, p_data: dict, z: float) -> str:
    fitting = p_data.get("cornerFitting", "")
    hardware = p_data.get("tensionHardware", "")
    return f"{label}\nH: {int(z)}mm\nFitting: {fitting}\nHardware: {hardware}"