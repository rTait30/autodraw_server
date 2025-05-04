from flask import Flask, render_template, request, send_from_directory, jsonify
import os
import json

a = "test"


app = Flask(__name__, static_url_path='/copelands/static')

BASE_CONFIG_DIR = 'configs'

@app.route('/copelands/')
@app.route('/copelands')
def copelands_index():
    return render_template('index.html')

@app.route('/save_config', methods=['POST'])
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

@app.route('/list_configs/<category>', methods=['GET'])
def list_configs(category):
    folder = os.path.join(BASE_CONFIG_DIR, category)
    if not os.path.exists(folder):
        return jsonify([])

    files = [f for f in os.listdir(folder) if f.endswith('.json')]
    return jsonify(files)

@app.route('/get_config/<category>/<filename>', methods=['GET'])
def get_config(category, filename):
    folder = os.path.join(BASE_CONFIG_DIR, category)
    return send_from_directory(folder, filename)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)