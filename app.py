from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
from flask import session
from flask_sqlalchemy import SQLAlchemy
from passlib.hash import bcrypt
from flask_jwt_extended import JWTManager
import os
import json



from endpoints.api.auth.routes import auth_bp
from endpoints.api.projects.nest import nest_bp
from endpoints.api.projects.projects import projects_api_bp

from endpoints.web.index import index_bp
from endpoints.web.discrepancy import discrepancy_bp
from endpoints.web.dashboard import dashboard_bp
from endpoints.web.newproject import newproject_bp
from endpoints.web.projects import projects_bp

from models import db, User, Project, Log


app = Flask(__name__, static_url_path='/copelands/static')
app.secret_key = "C0p3l4nds_S3cr3t_K3y"

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'  # Default DB (users/auth)
app.config['SQLALCHEMY_BINDS'] = {
    #'users': 'sqlite:///users.db',
    #'projects': 'sqlite:///projects.db',
    #'project_attributes': 'sqlite:///project_attributes.db',
    #'logs': 'sqlite:///logs.db'
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



app.register_blueprint(auth_bp)
app.register_blueprint(projects_api_bp)
app.register_blueprint(nest_bp)



app.register_blueprint(index_bp)
app.register_blueprint(discrepancy_bp)
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










