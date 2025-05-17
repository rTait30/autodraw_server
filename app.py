from flask import Flask, render_template, request, send_from_directory, jsonify
import os
import json

from rectpack import newPacker

app = Flask(__name__, static_url_path='/copelands/static')

BASE_CONFIG_DIR = 'configs'

@app.route('/copelands/')
@app.route('/copelands')
def copelands_index():
    return render_template('index.html')

def prepare_rectangles(data):
    quantity = data['quantity']
    panels = data['panels']
    
    rectangles = []
    
    for i in range(1, quantity + 1):
        for name, dims in panels.items():
            label = f"{i}_{name}"
            width = dims['width']
            height = dims['height']
            rectangles.append((width, height, label))
    
    return rectangles

def can_fit(rectangles, bin_width, bin_height):
    from rectpack import newPacker

    packer = newPacker(rotation=True)

    for width, height, label in rectangles:
        packer.add_rect(width, height, label)
    packer.add_bin(bin_width, bin_height)

    packer.pack()
    return len(packer.rect_list()) == len(rectangles), packer


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

    return {
        "panels": placements,
        "total_width": max_x,
        "used_bin_width": min_width
    }

@app.route('/copelands/nest_panels', methods=['POST'])
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


@app.route('/copelands/save_config', methods=['POST'])
def save_config():
    data = request.get_json()
    category = data.get('category')
    job_name = data.get('name', 'unnamed_job').replace(' ', '_')

    if not category or not job_name:
        return jsonify({"error": "Missing category or job name"}), 400

    save_dir = os.path.join('configs', category)
    os.makedirs(save_dir, exist_ok=True)

    filename = f"{job_name}.json"
    filepath = os.path.join(save_dir, filename)

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

    return jsonify({"success": True, "filename": filename})

@app.route('/copelands/list_configs/<category>', methods=['GET'])
def list_configs(category):
    folder = os.path.join(BASE_CONFIG_DIR, category)
    if not os.path.exists(folder):
        return jsonify([])

    files = [f for f in os.listdir(folder) if f.endswith('.json')]
    return jsonify(files)

@app.route('/copelands/get_config/<category>/<filename>', methods=['GET'])
def get_config(category, filename):
    folder = os.path.join(BASE_CONFIG_DIR, category)
    return send_from_directory(folder, filename)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)










