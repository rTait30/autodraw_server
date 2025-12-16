
def calculate(data: dict) -> dict:
    """
    Calculates geometry for SCREEN.
    Input fields expected: width, height, edges
    """
    results = {}
    
    # Extract inputs
    width = float(data.get("width", 0))
    height = float(data.get("height", 0))
    edges = data.get("edges", {})

    # Default edges if missing
    default_edge = {"finish": "none", "eyelet": "none"}
    top_edge = edges.get("top", default_edge)
    bottom_edge = edges.get("bottom", default_edge)
    left_edge = edges.get("left", default_edge)
    right_edge = edges.get("right", default_edge)

    POCKET = 100.0
    
    # 1. Outline Points (Cross shape)
    # Coordinates relative to (0,0) being the inner corner (Bottom-Left of Central Rect)
    # This matches the logic used previously.
    
    points = [
        (-POCKET, 0),               # Bottom-Left of Left Pocket
        (-POCKET, height),          # Top-Left of Left Pocket
        (0, height),                # Inner Corner (Top-Left of Central Rect)
        (0, height + POCKET),       # Top-Left of Top Pocket
        (width, height + POCKET),   # Top-Right of Top Pocket
        (width, height),            # Inner Corner (Top-Right of Central Rect)
        (width + POCKET, height),   # Top-Right of Right Pocket
        (width + POCKET, 0),        # Bottom-Right of Right Pocket
        (width, 0),                 # Inner Corner (Bottom-Right of Central Rect)
        (width, -POCKET),           # Bottom-Right of Bottom Pocket
        (0, -POCKET),               # Bottom-Left of Bottom Pocket
        (0, 0),                     # Inner Corner (Bottom-Left of Central Rect)
        (-POCKET, 0)                # Close loop
    ]
    
    # 2. Eyelet Positions (Center points)
    # We calculate the center point of where the eyelet line would have been.
    # The line was from (edge - 25) to (edge - 75). The center is (edge - 50).
    eyelet_positions = []

    def get_eyelet_positions(length):
        """Returns a list of positions along the edge length."""
        inset = 50.0
        if length <= inset * 2:
            return [length / 2]
        
        # Target spacing ~200mm
        available = length - 2 * inset
        num_spaces = max(1, round(available / 200))
        step = available / num_spaces
        
        return [inset + i * step for i in range(num_spaces + 1)]

    # Top (Inner edge at y=height)
    # Center is 50mm inside: y = height - 50
    if top_edge.get("eyelet", "none") != "none":
        y_pos = height - 50
        for x in get_eyelet_positions(width):
            eyelet_positions.append((x, y_pos))

    # Bottom (Inner edge at y=0)
    # Center is 50mm inside: y = 50
    if bottom_edge.get("eyelet", "none") != "none":
        y_pos = 50
        for x in get_eyelet_positions(width):
            eyelet_positions.append((x, y_pos))

    # Left (Inner edge at x=0)
    # Center is 50mm inside: x = 50
    if left_edge.get("eyelet", "none") != "none":
        x_pos = 50
        for y in get_eyelet_positions(height):
            eyelet_positions.append((x_pos, y))

    # Right (Inner edge at x=width)
    # Center is 50mm inside: x = width - 50
    if right_edge.get("eyelet", "none") != "none":
        x_pos = width - 50
        for y in get_eyelet_positions(height):
            eyelet_positions.append((x_pos, y))


    results['outline_points'] = points
    results['eyelet_positions'] = eyelet_positions
    
    # Basic stats
    results['area'] = (width * height) + (2 * POCKET * width) + (2 * POCKET * height)
    results['perimeter'] = 2 * (width + height) + 8 * POCKET

    return results
