# endpoints/api/auth/routes.py
from datetime import timedelta
from functools import wraps

from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    set_refresh_cookies,
    unset_jwt_cookies,
)
from models import db, User, Product

from endpoints.api.auth.utils import current_user, role_required, _json, _user_by_credentials

auth_bp = Blueprint("auth_bp", __name__)

# -------------------------------
# Auth endpoints
# -------------------------------

@auth_bp.route("/login", methods=["POST"])
def api_login():
    """
    POST body: { username, password }
    Returns: { access_token, role, id, username, verified }
    Also sets an HttpOnly refresh cookie.
    """
    data = _json()
    user = _user_by_credentials(data.get("username"), data.get("password"))
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    # sub must be a string
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "username": user.username,
            "verified": user.verified,
        },
        expires_delta=timedelta(minutes=10),
    )
    refresh_token = create_refresh_token(identity=str(user.id))

    resp = make_response(jsonify({
        "access_token": access_token,
        "role": user.role,
        "username": user.username,
        "verified": user.verified,
    }))
    set_refresh_cookies(resp, refresh_token)
    return resp, 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_access_token():
    """
    Use the HttpOnly refresh cookie to mint a new access token.
    Rotates the refresh token as well.
    """
    user_id = int(get_jwt_identity())  # cast back to int
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    new_access = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "username": user.username,
            "verified": user.verified,
        },
    )
    new_refresh = create_refresh_token(identity=str(user.id))

    resp = make_response(jsonify({"access_token": new_access}))
    set_refresh_cookies(resp, new_refresh)  # rotate refresh
    return resp, 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """
    Clears refresh cookies. (If you also want to revoke tokens, add a blocklist.)
    """
    resp = make_response(jsonify({"message": "Logged out"}))
    unset_jwt_cookies(resp)
    return resp, 200


# -------------------------------
# Registration & user mgmt
# -------------------------------

@auth_bp.route("/register", methods=["POST"])
def register_client():
    """
    Public registration for clients.
    POST body: { email, username, password, password2 }
    """
    data = _json()
    email = data.get("email", "").strip()
    username = data.get("username", "").strip()
    password = data.get("password")
    password2 = data.get("password2")

    if not username or not password or not password2:
        return jsonify({"error": "Username and password are required."}), 400
    if password != password2:
        return jsonify({"error": "Passwords do not match."}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists."}), 400

    user = User(
        username=username,
        password_hash="",
        role="client",
        email=email if email else None,
        verified=False,   # adjust if you want auto-verified
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Client registered"}), 201


@auth_bp.route("/register_staff", methods=["POST"])
@role_required("admin")
def register_staff():
    """
    Admin creates staff accounts.
    POST body: { username, password, role }
    role ∈ {"designer", "estimator", "admin"}
    """
    data = _json()
    new_username = (data.get("username") or "").strip()
    password = data.get("password")
    role = data.get("role")

    if role not in {"designer", "estimator", "admin"}:
        return jsonify({"error": "Invalid role"}), 400
    if not new_username or not password:
        return jsonify({"error": "Missing username or password"}), 400
    if User.query.filter_by(username=new_username).first():
        return jsonify({"error": "User already exists"}), 400

    user = User(username=new_username, role=role, verified=True)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": f"{role.capitalize()} registered"}), 201


@auth_bp.route("/verify_user", methods=["POST"])
@role_required("admin")
def verify_user():
    """
    Admin marks a user as verified.
    POST body: { username }
    """
    target_username = (_json().get("username") or "").strip()
    if not target_username:
        return jsonify({"error": "Missing username"}), 400

    user = User.query.filter_by(username=target_username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.verified = True
    db.session.commit()
    return jsonify({"message": f"User {target_username} marked as verified."}), 200


@auth_bp.route("/users", methods=["GET"])
@role_required("admin")
def list_users():
    users = User.query.all()
    return jsonify([
        {"username": u.username, "role": u.role, "verified": u.verified}
        for u in users
    ]), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "username": user.username,
        "role": user.role,
        "verified": user.verified,
        "favorites": [p.id for p in user.favorites]
    }), 200

@auth_bp.route("/favorites/<int:product_id>", methods=["POST", "DELETE"])
@jwt_required()
def manage_favorite(product_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    product = Product.query.get(product_id)
    
    if not user or not product:
        return jsonify({"error": "User or Product not found"}), 404
        
    if request.method == "POST":
        if product not in user.favorites:
            user.favorites.append(product)
            db.session.commit()
        return jsonify({"message": "Added to favorites", "favorites": [p.id for p in user.favorites]})
        
    elif request.method == "DELETE":
        if product in user.favorites:
            user.favorites.remove(product)
            db.session.commit()
        return jsonify({"message": "Removed from favorites", "favorites": [p.id for p in user.favorites]})
