import json
import os
import tempfile
from flask import send_file, after_this_request
from .shared import generate_sails_layout

def get_metadata():
    return {
        "id": "geometry_json",
        "name": "Geometry JSON",
        "type": "json"
    }

def generate(project, **kwargs):
    """
    Generates a JSON file download with the geometry data.
    """
    try:
        layout_results = generate_sails_layout(project)
        data = []
        for item in layout_results:
            data.extend(item['entities'])
        
        project_name = project.get("general", {}).get("name", "Unnamed")
        filename = f"{project_name}_geometry.json"

        # Create a temporary file to send
        tmp = tempfile.NamedTemporaryFile(suffix=".json", mode='w+', delete=False, encoding='utf-8')
        json.dump(data, tmp, indent=2)
        tmp_path = tmp.name
        tmp.close()

        @after_this_request
        def _cleanup(response):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
            return response

        return send_file(
            tmp_path,
            mimetype="application/json",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        # In case of error, we might still want to return JSON error, 
        # but the caller expects a file.
        from flask import jsonify
        return jsonify({"error": str(e)}), 500
