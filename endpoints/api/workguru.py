from flask import Blueprint, request, jsonify
from endpoints.api.auth.utils import role_required  # reuse your auth helpers
from WG.workGuru import add_cover, get_leads

workguru_api_bp = Blueprint("workguru_api", __name__)

@workguru_api_bp.route("/add_cover", methods=["POST"])
@role_required("estimator", "designer", "admin")
def api_add_cover():
    """
    POST body: { "name": "My cover", "description": "optional description" }
    Requires staff role (estimator/designer/admin). Calls WG.workGuru.add_cover.
    """
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    description = payload.get("description") or ""

    if not name:
        return jsonify({"error": "name is required"}), 400

    try:
        result = add_cover(name, description)
    except Exception as e:
        return jsonify({"error": f"workGuru add_cover failed: {e}"}), 500

    return jsonify({"ok": True, "result": result}), 200
