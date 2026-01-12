from typing import List

from design_manifest_objects import (
    CanvasItem, GeoLine, GeoCircle, GeoText, GeoPoint, 
    StageData, ManifestMeta, DesignManifest
)

from shared import extract_sail_geometry

class StructureStep:
    def __init__(self, product_data: dict):
        self.product = product_data
        # Reuse your existing extraction logic from the previous step
        self.geo = extract_sail_geometry(product_data) 

    def run(self) -> StageData:
        """
        Executes Step 0.
        Returns a strict StageData object ready for the Manifest.
        """
        canvas_items: List[CanvasItem] = []

        # Unpack geometry
        positions = self.geo['positions']
        edges = self.geo['edges']
        diagonals = self.geo['diagonals']
        points_data = self.geo['points_data']
        centroid = self.geo['centroid'] # tuple (x,y,z)

        # --- A. Posts & Corners ---
        for label, pos in positions.items():
            x, y, z = pos
            
            # 1. Post Circle (Top)
            canvas_items.append(CanvasItem(
                type="geo_circle",
                layer="AD_STRUCTURE",
                geometry=GeoCircle(center=[x, y, z], radius=50.0)
            ))
            
            # 2. Vertical Line
            if z > 0:
                canvas_items.append(CanvasItem(
                    type="geo_line",
                    layer="AD_STRUCTURE",
                    geometry=GeoLine(start=[x, y, 0], end=[x, y, z])
                ))

            # 3. Text Info
            info_text = self._format_label_text(label, points_data.get(label, {}), z)
            # Simple vector offset logic for text placement
            cx, cy, _ = centroid
            dx, dy = x - cx, y - cy
            mag = (dx**2 + dy**2)**0.5 or 1.0
            text_pos = [x + (dx/mag) * 1200, y + (dy/mag) * 1200, z]

            canvas_items.append(CanvasItem(
                type="geo_text",
                layer="AD_INFO",
                geometry=GeoText(location=text_pos, text=info_text, attachment_point=8),
                props={"height": 100} # height handled in props or geometry depending on your pref
            ))

        # --- B. Perimeter Edges ---
        for ((a, b), length) in edges:
            if a in positions and b in positions:
                start, end = positions[a], positions[b]
                
                # Visual Line
                canvas_items.append(CanvasItem(
                    type="geo_line",
                    layer="AD_STRUCTURE",
                    geometry=GeoLine(start=list(start), end=list(end))
                ))
                
                # Label
                mid = [(start[0]+end[0])/2, (start[1]+end[1])/2, (start[2]+end[2])/2]
                label_txt = f"{a}-{b}\n{int(length)}mm"
                canvas_items.append(CanvasItem(
                    type="geo_text",
                    layer="AD_PEN",
                    geometry=GeoText(location=mid, text=label_txt, attachment_point=5),
                    props={"height": 80, "bg_fill": True}
                ))

        # --- Return the Step Data ---
        return StageData(
            step_index=0,
            name="0_structure",
            status="complete",
            generated_by="server_auto",
            config={
                "perimeter": self.geo.get("perimeter"),
                "area": self.geo.get("area")
            },
            canvas=canvas_items
        )
    
    def _format_label_text(self, label, p_data, z):
        fitting = p_data.get("cornerFitting", "")
        hardware = p_data.get("tensionHardware", "")
        return f"{label}\nH: {int(z)}mm\nFitting: {fitting}\nHardware: {hardware}"
