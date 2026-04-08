
def _compute_screen(attrs: dict) -> dict:
    """Compute geometry for a single SCREEN product from its attributes."""
    import copy
    calculated = copy.deepcopy(attrs)

    width = float(calculated.get("width", 0))
    height = float(calculated.get("height", 0))
    edges = calculated.get("edges", {})

    default_edge = {"finish": "none", "eyelet": "none"}
    top_edge = edges.get("top", default_edge)
    bottom_edge = edges.get("bottom", default_edge)
    left_edge = edges.get("left", default_edge)
    right_edge = edges.get("right", default_edge)

    POCKET = 100.0

    # 1. Outline Points (Cross shape)
    points = [
        (-POCKET, 0),
        (-POCKET, height),
        (0, height),
        (0, height + POCKET),
        (width, height + POCKET),
        (width, height),
        (width + POCKET, height),
        (width + POCKET, 0),
        (width, 0),
        (width, -POCKET),
        (0, -POCKET),
        (0, 0),
        (-POCKET, 0)
    ]

    # 2. Eyelet Positions
    eyelet_positions = []

    def get_eyelet_positions(length):
        inset = 50.0
        if length <= inset * 2:
            return [length / 2]
        available = length - 2 * inset
        num_spaces = max(1, round(available / 200))
        step = available / num_spaces
        return [inset + i * step for i in range(num_spaces + 1)]

    if top_edge.get("eyelet", "none") != "none":
        y_pos = height - 50
        for x in get_eyelet_positions(width):
            eyelet_positions.append((x, y_pos))

    if bottom_edge.get("eyelet", "none") != "none":
        y_pos = 50
        for x in get_eyelet_positions(width):
            eyelet_positions.append((x, y_pos))

    if left_edge.get("eyelet", "none") != "none":
        x_pos = 50
        for y in get_eyelet_positions(height):
            eyelet_positions.append((x_pos, y))

    if right_edge.get("eyelet", "none") != "none":
        x_pos = width - 50
        for y in get_eyelet_positions(height):
            eyelet_positions.append((x_pos, y))

    calculated['outline_points'] = points
    calculated['eyelet_positions'] = eyelet_positions
    calculated['area'] = (width * height) + (2 * POCKET * width) + (2 * POCKET * height)
    calculated['perimeter'] = 2 * (width + height) + 8 * POCKET

    return calculated


def calculate(data: dict) -> dict:
    """
    Calculates geometry for SCREEN products.
    Iterates over data['products'], enriches each into product['calculated'].
    """
    products = data.get("products") or []

    for product in products:
        attrs = product.get("attributes") or {}
        if not isinstance(attrs, dict):
            continue
        product["calculated"] = _compute_screen(attrs)

    return data
