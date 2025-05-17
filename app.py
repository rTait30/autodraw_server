from flask import Flask, render_template, request, send_from_directory, jsonify
import os
import json

from rectpack import newPacker

app = Flask(__name__, static_url_path='/copelands/static')

BASE_CONFIG_DIR = 'configs'


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

def run_rectpack(rectangles, bin_width=1000):
    packer = newPacker(rotation=True)

    # Add all rectangles
    for width, height, label in rectangles:
        packer.add_rect(width, height, label)

    # Add one bin with fixed width and large height
    packer.add_bin(bin_width, 1000000)

    # Pack
    packer.pack()

    placements = {}
    max_y = 0

    for rect in packer.rect_list():
        bin_index, x, y, w, h, rid = rect
        orig = next(r for r in rectangles if r[2] == rid)
        rotated = (w != orig[0] or h != orig[1])
        placements[rid] = {
            "x": x,
            "y": y,
            "rotated": rotated
        }
        max_y = max(max_y, y + h)

    return {
        "panels": placements,
        "total_length": max_y
    }

@app.route('/copelands/nest_panels', methods=['POST'])
def nest_panels():
    try:
        data = request.get_json()
        if not data or 'quantity' not in data or 'panels' not in data:
            return jsonify({"error": "Invalid input"}), 400

        rectangles = prepare_rectangles(data)

        # 🧠 Apply the rectpack logic
        nest_result = run_rectpack(rectangles)

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










