from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/copelands/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    access_token = create_access_token(identity=username)
    return jsonify({'access_token': access_token, 'role': user.role, 'id': user.id, 'username': user.username, 'verified': user.verified})

@auth_bp.route('/copelands/api/logout', methods=['POST'])
def api_logout():
    return jsonify({'status': 'logged out'})

@auth_bp.route('/copelands/api/register', methods=['POST'])
def register_client():
    data = request.get_json()
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    password2 = data.get('password2')
    company = data.get('company')
    role = 'client'

    if not email or not username or not password or not password2 or not company:
        return jsonify({'error': 'All fields are required.'}), 400
    if password != password2:
        return jsonify({'error': 'Passwords do not match.'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists.'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists.'}), 400

    user = User(
        username=username,
        password_hash='',
        role=role,
        company=company,
        email=email,
        verified=False  # <-- Ensure verified is set to False
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Client registered'}), 201

@auth_bp.route('/copelands/api/register_staff', methods=['POST'])
@jwt_required()
def register_staff():
    username = get_jwt_identity()
    admin_user = User.query.filter_by(username=username).first()
    if not admin_user or admin_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    new_username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    if role not in ['designer', 'estimator']:
        return jsonify({'error': 'Invalid role'}), 400

    if not new_username or not password:
        return jsonify({'error': 'Missing username or password'}), 400

    if User.query.filter_by(username=new_username).first():
        return jsonify({'error': 'User already exists'}), 400

    user = User(username=new_username, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': f'{role.capitalize()} registered'}), 201

@auth_bp.route('/copelands/api/verify_user', methods=['POST'])
@jwt_required()
def verify_user():
    username = get_jwt_identity()
    admin_user = User.query.filter_by(username=username).first()
    if not admin_user or admin_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    target_username = data.get('username')
    if not target_username:
        return jsonify({'error': 'Missing username'}), 400

    user = User.query.filter_by(username=target_username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.verified = True
    db.session.commit()
    return jsonify({'message': f'User {target_username} marked as verified.'}), 200

@auth_bp.route('/copelands/api/users', methods=['GET'])
@jwt_required()
def list_users():
    username = get_jwt_identity()
    admin_user = User.query.filter_by(username=username).first()
    if not admin_user or admin_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    users = User.query.all()
    return jsonify([
        {
            'username': u.username,
            'role': u.role,
            'verified': u.verified
        } for u in users
    ])

@auth_bp.route('/copelands/api/me', methods=['GET'])
@jwt_required()
def get_me():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'username': user.username,
        'role': user.role,
        'verified': user.verified
    })