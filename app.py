from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
from flask import session
from flask_sqlalchemy import SQLAlchemy
from passlib.hash import bcrypt
from flask_jwt_extended import JWTManager
import os
import json

from rectpack import newPacker



from endpoints.api.auth.routes import auth_bp

from endpoints.web.index import index_bp
from endpoints.web.discrepancy import discrepancy_bp
from endpoints.web.newproject import newproject_bp
from endpoints.web.projects import projects_bp
from endpoints.web.dashboard import dashboard_bp

from models import db, User, Project, Log


app = Flask(__name__, static_url_path='/copelands/static')
app.secret_key = "C0p3l4nds_S3cr3t_K3y"

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'  # Default DB (users/auth)
app.config['SQLALCHEMY_BINDS'] = {
    'projects': 'sqlite:///projects.db',
    'logs': 'sqlite:///logs.db'
}

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = "super-secret-jwt-key"

# --- Initialize extensions here ---
db.init_app(app)
jwt = JWTManager(app)


# --- Create all databases/tables before first request ---
@app.before_request
def create_all_databases():
    db.create_all()  # This will create tables for all binds

BASE_CONFIG_DIR = 'configs'

app.register_blueprint(index_bp)
app.register_blueprint(discrepancy_bp)

app.register_blueprint(auth_bp)

app.register_blueprint(dashboard_bp)

app.register_blueprint(newproject_bp)
app.register_blueprint(projects_bp)


app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'  # Default DB (users/auth)
app.config['SQLALCHEMY_BINDS'] = {
    'projects': 'sqlite:///projects.db',
    'logs': 'sqlite:///logs.db'
}



# ---- API ENDPOINTS ----



@app.route('/copelands/new_project/covers')
def new_project_covers():
    # Example: session['role'] = 'estimator' or 'client'
    return render_template('newproject/cover.html', user_role=session.get('role', 'client'))

@app.route('/copelands/newproject/shadesail')
def new_project_shadesails():
    
    return render_template('/newproject/shadesail.html', user_role=session.get('role', 'client'))


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
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid input"}), 400

        # Get the next ID and increment it
        next_id = get_next_id()
        data['id'] = next_id

        # Save the configuration to a file
        category = data.get('category', 'default')
        config_dir = os.path.join(BASE_CONFIG_DIR, category)
        os.makedirs(config_dir, exist_ok=True)
        config_file = os.path.join(config_dir, f"{data['name']}.json")

        with open(config_file, 'w') as f:
            json.dump(data, f, indent=4)

        return jsonify({"message": "Config saved", "id": next_id}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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







SETTINGS_FILE = 'settings.json'

def load_settings():
    """Loads settings from the settings file or initializes defaults."""
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r') as f:
            return json.load(f)
    # Default settings
    return {"nextID": 1}

def save_settings(settings):
    """Saves settings to the settings file."""
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f, indent=4)

def get_next_id():
    """Gets the next ID from settings and increments it."""
    settings = load_settings()
    next_id = settings.get("nextID", 1)
    settings["nextID"] = next_id + 1
    save_settings(settings)
    return next_id




if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)










