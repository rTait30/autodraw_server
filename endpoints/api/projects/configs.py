from flask import Blueprint, request, jsonify
# Import your DB models here

configs_api_bp = Blueprint('configs_api', __name__)

BASE_CONFIG_DIR = 'configs'

@configs_api_bp.route('/copelands/api/projects/save', methods=['POST'])
def save_project_config():
    # Save config to DB instead of file
    pass

@configs_api_bp.route('/copelands/api/projects/list', methods=['GET'])
def list_project_configs():
    # List configs from DB
    pass

@configs_api_bp.route('/copelands/api/projects/get/<int:project_id>', methods=['GET'])
def get_project_config(project_id):
    # Get config from DB
    pass

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
