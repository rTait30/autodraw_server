# endpoints/api/auth/utils.py
from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import jwt_required, verify_jwt_in_request, get_jwt_identity
from models import User

def current_user(required: bool = True):
    """
    Returns the current User or None.
    If required=False, no error is raised when unauthenticated.
    """
    verify_jwt_in_request(optional=not required)
    ident = get_jwt_identity()
    if ident is None:
        return None
    try:
        uid = int(ident)
    except (TypeError, ValueError):
        return None
    return User.query.get(uid)

def role_required(*roles):
    """Decorator: require an authenticated user with one of the roles."""
    print ("role_required called with roles:", roles)
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorated(*args, **kwargs):
            user = current_user(required=True)
            print ("Current user:", user)
            print ("User roles:", user.role if user else None)
            if not user or user.role not in roles:
                print ("User does not have required role, returning 403")
                return jsonify({"error": "Unauthorized"}), 403
            
            print ("User has required role, proceeding with request")
            return fn(*args, **kwargs)
        return decorated
    return wrapper

def _json():
    return request.get_json(silent=True) or {}


def _user_by_credentials(username: str, password: str):
    if not username or not password:
        return None
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return None
    return user

