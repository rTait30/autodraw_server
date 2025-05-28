from flask import Blueprint, render_template, redirect, url_for, session

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/copelands/dashboard')
def dashboard():
    role = session.get('role')
    if not role:
        return redirect(url_for('landing.landing'))
    valid_roles = {'client', 'designer', 'estimator'}
    if role not in valid_roles:
        return "Unauthorized", 403
    return render_template(f'dashboards/{role}.html')