from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from endpoints.api.auth.utils import current_user
from models import db

# Since this is about user preferences (like favorites), 
# it fits well under a dedicated user/preferences endpoint 
# or within the existing auth/user routes.
# For now, I'll assume we can add this to the existing auth routes or create a new small blueprint.
# Given existing structure, let's create a new 'user' blueprint for preferences.

user_bp = Blueprint("user_api", __name__)

@user_bp.route("/preferences", methods=["GET", "POST"])
@jwt_required()
def handle_user_preferences():
    user = current_user(required=True)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == "POST":
        data = request.get_json() or {}
        
        # Merge or overwrite. Usually merge for top-level keys is safer.
        # If user passes {"favorites": [1, 2]}, we update that key in preferences.
        
        current_prefs = dict(user.preferences) if user.preferences else {}
        
        # Update with new keys
        for key, value in data.items():
            current_prefs[key] = value
            
        user.preferences = current_prefs
        db.session.commit()
        
        return jsonify(user.preferences), 200

    # GET
    return jsonify(user.preferences or {}), 200
