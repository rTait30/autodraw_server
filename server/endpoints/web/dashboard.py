from flask import Blueprint, render_template, session

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/copelands/dashboard')
def dashboard():
    
    return render_template(f'dashboards/dashboard.html')

@dashboard_bp.route('/copelands/dashboard/admin')
def dashboard_admin():
    
    return render_template(f'dashboards/admin.html')


@dashboard_bp.route('/copelands/dashboard/client')
def dashboard_client():
    return render_template('dashboards/client.html', user_role=session.get('role', 'client'))


@dashboard_bp.route('/copelands/dashboard/estimator')
def dashboard_estimator():
    return render_template('dashboards/estimator.html', user_role=session.get('role', 'estimator'))


@dashboard_bp.route('/copelands/dashboard/designer')
def dashboard_designer():
    return render_template('dashboards/designer.html', user_role=session.get('role', 'designer'))