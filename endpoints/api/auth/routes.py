from flask import Blueprint, request, jsonify, session

auth_api_bp = Blueprint('auth_api', __name__)

@auth_api_bp.route('/copelands/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # 🔒 Fake auth logic — replace with DB check
    if username == 'client' and password == 'pass':
        session['role'] = 'client'
    elif username == 'designer' and password == 'pass':
        session['role'] = 'designer'
    elif username == 'estimator' and password == 'pass':
        session['role'] = 'estimator'
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

    return jsonify({'status': 'ok'})

@auth_api_bp.route('/copelands/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'status': 'logged out'})