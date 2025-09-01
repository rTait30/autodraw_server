# endpoints/api/auth/utils.py
from functools import wraps
import inspect
from flask import jsonify, request, g, current_app
from flask_jwt_extended import jwt_required, verify_jwt_in_request, get_jwt_identity
from models import User

def current_user(required: bool = True, verify: bool = True):
    """
    Returns the current User or None.
    If required=False, no error is raised when unauthenticated.
    """
    if verify:
        verify_jwt_in_request(optional=not required)
    ident = get_jwt_identity()
    if ident is None:
        return None
    try:
        uid = int(ident)
    except (TypeError, ValueError):
        return None
    return User.query.get(uid)

def role_required(*roles, allow_admin=True, attach_to_g=True, inject_user_kwarg=True):
    """
    Require an authenticated user with one of the given roles.
    - If no roles are provided, any authenticated user is allowed.
    - allow_admin=True lets 'admin' bypass role checks.
    - attach_to_g=True sets g.current_user for downstream access.
    - inject_user_kwarg=True injects `user` kwarg into the view
      if the view signature includes a `user` parameter.
    """
    def wrapper(fn):
        sig = inspect.signature(fn)
        accepts_user_kwarg = inject_user_kwarg and ("user" in sig.parameters)

        @wraps(fn)
        @jwt_required()  # handles 401 (no/invalid JWT)
        def decorated(*args, **kwargs):
            # Resolve the user (JWT already verified above)
            user = current_user(required=True, verify=False)
            if not user:
                # Safety net; @jwt_required already covered 401
                return jsonify({"error": "Unauthorized"}), 401

            # Role gate
            allowed = False
            if not roles:
                allowed = True  # any authenticated user
            elif user.role in roles:
                allowed = True
            elif allow_admin and user.role == "admin":
                allowed = True

            if not allowed:
                current_app.logger.info(
                    "Forbidden: user %s with role %s not in %s",
                    getattr(user, "id", None), getattr(user, "role", None), roles
                )
                return jsonify({"error": "Forbidden"}), 403

            # Expose user
            if attach_to_g:
                g.current_user = user
            if accepts_user_kwarg:
                kwargs["user"] = user

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
