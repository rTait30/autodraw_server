"""
Shared Detail Manager

Provides utilities to retrieve detail diagrams and specifications for any product generator.
"""

import os

# Base directory for shared details
DETAILS_DIR = os.path.join(os.path.dirname(__file__), "details")

def get_detail_image(detail_id: str) -> str:
    """
    Get the file path for a detail diagram/image.
    
    Search order:
    1. details/{detail_id}/diagram.svg
    2. details/{detail_id}/{detail_id}.svg
    3. details/{detail_id}/diagram.png
    4. details/{detail_id}/{detail_id}.png
    5. details/{detail_id}/diagram.jpg
    6. details/{detail_id}/{detail_id}.jpg
    7. details/{detail_id}.svg
    8. details/{detail_id}.png
    9. details/{detail_id}.jpg
    
    Args:
        detail_id: Identifier for the detail (e.g., 'cable_4', 'corner_prorig')
        
    Returns:
        Absolute path to the image file, or None if not found.
    """
    if not detail_id:
        return None
        
    detail_id = str(detail_id).lower().replace(" ", "_")
    
    # Define search candidates
    candidates = []
    
    # Folder-based candidates
    folder_path = os.path.join(DETAILS_DIR, detail_id)
    if os.path.isdir(folder_path):
        # Check for standard names inside the folder
        for name in ["diagram", "image", detail_id]:
            for ext in [".svg", ".png", ".jpg", ".jpeg", ".pdf"]:
                candidates.append(os.path.join(folder_path, name + ext))
    
    # Flat file candidates
    for ext in [".svg", ".png", ".jpg", ".jpeg", ".pdf"]:
        candidates.append(os.path.join(DETAILS_DIR, detail_id + ext))
        
    # Check existence
    for path in candidates:
        if os.path.exists(path):
            return path
            
    return None


def get_detail_specs(detail_id: str) -> list:
    """
    Get default specifications for a detail.
    
    Args:
        detail_id: Identifier for the detail
        
    Returns:
        List of (label, value) tuples.
    """
    detail_id = str(detail_id).lower().replace(" ", "_")
    
    # Cable specs
    if detail_id.startswith("cable_"):
        try:
            size = int(detail_id.split('_')[-1])
            return _get_cable_specs(size)
        except ValueError:
            pass
            
    # Add other default specs here as needed
    
    return [("ID", detail_id), ("Notes", "No specs available")]


def _get_cable_specs(size: int) -> list:
    """Helper to generate cable specs."""
    common_specs = [
        ("Construction", "Stranded stainless"),
        ("Break Load", "TBD"),
        ("Coating", "Galvanised"),
    ]
    
    return [("Size", f"{size}mm")] + common_specs
