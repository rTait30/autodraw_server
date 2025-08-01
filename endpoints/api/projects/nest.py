from flask import Blueprint, request, jsonify

from rectpack import newPacker

nest_bp = Blueprint('nest_bp', __name__)

def prepare_rectangles(data):
    quantity = int(data['quantity'])
    panels = data['panels']
    
    rectangles = []
    
    for i in range(1, quantity + 1):
        for name, dims in panels.items():
            label = f"{i}_{str(name)}"
            width = dims['width']
            height = dims['height']
            rectangles.append((width, height, label))
    
    # Sort rectangles by height (descending) to prioritize horizontal stacking
    rectangles.sort(key=lambda r: max(r[0], r[1]), reverse=True)
    
    # Group smaller panels for horizontal stacking
    grouped_rectangles = []
    small_panels = [r for r in rectangles if r[0] < 500 and r[1] < 500]  # Example threshold
    large_panels = [r for r in rectangles if r not in small_panels]

    # Combine small panels into horizontal groups
    while small_panels:
        group_width = 0
        group_height = 0
        group = []
        while small_panels and group_width + small_panels[0][0] <= 2000:  # Example max width
            panel = small_panels.pop(0)
            group_width += panel[0]
            group_height = max(group_height, panel[1])
            group.append(panel)
        if group:
            grouped_rectangles.append((group_width, group_height, f"group_{len(grouped_rectangles)}"))

    # Add large panels and grouped small panels
    grouped_rectangles.extend(large_panels)
    return grouped_rectangles

def can_fit(rectangles, bin_width, bin_height):
    from rectpack import newPacker

    packer = newPacker(rotation=True)

    # Add rectangles to the packer
    for width, height, label in rectangles:
        packer.add_rect(width, height, label)

    # Add a single bin with the given dimensions
    packer.add_bin(bin_width, bin_height)

    # Perform the packing
    packer.pack()

    # Extract packed rectangles
    packed_rectangles = packer.rect_list()

    # Check if all rectangles are packed
    all_packed = len(packed_rectangles) == len(rectangles)

    return all_packed, packer


def run_rectpack_with_fixed_height(rectangles, fabric_height):
    # Binary search bounds
    min_width = max(r[0] for r in rectangles)  # At least the widest panel
    max_width = sum(r[0] for r in rectangles)  # Worst case, all side by side
    best_result = None

    while min_width < max_width:
        mid_width = (min_width + max_width) // 2
        fits, packer = can_fit(rectangles, mid_width, fabric_height)

        if fits:
            max_width = mid_width
            best_result = packer
        else:
            min_width = mid_width + 1

    # Final successful pack at min_width
    if not best_result:
        # One last try in case min_width just became valid
        fits, best_result = can_fit(rectangles, min_width, fabric_height)
        if not fits:
            raise Exception("Cannot fit panels in given height.")

    # Extract placements
    placements = {}
    max_x = 0

    for rect in best_result.rect_list():
        bin_index, x, y, w, h, rid = rect
        orig = next(r for r in rectangles if r[2] == rid)
        rotated = (w != orig[0] or h != orig[1])
        placements[rid] = {
            "x": x,
            "y": y,
            "rotated": rotated
        }
        max_x = max(max_x, x + w)

    # Debugging output
    print(f"Packed rectangles: {placements}")
    print(f"Total width used: {max_x}")

    return {
        "panels": placements,
        "total_width": max_x,
        "used_bin_width": min_width
    }

@nest_bp.route('/copelands/nest_panels', methods=['POST'])
def nest_panels():
    try:
        data = request.get_json()
        if not data or 'quantity' not in data or 'panels' not in data:
            return jsonify({"error": "Invalid input"}), 400

        rectangles = prepare_rectangles(data)

        # Use fabricWidth from the request as the fixed height
        fabric_height = data.get('fabricWidth')

        # Run rectpack with fixed height
        nest_result = run_rectpack_with_fixed_height(rectangles, fabric_height)

        return jsonify(nest_result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
