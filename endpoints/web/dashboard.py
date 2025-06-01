from flask import Blueprint, render_template

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/copelands/dashboard')
def dashboard():
    
    return render_template(f'dashboards/dashboard.html')

@dashboard_bp.route('/copelands/dashboard/admin')
def dashboard_admin():
    
    return render_template(f'dashboards/admin.html')


@dashboard_bp.route('/copelands/dashboard/client')
def dashboard_client():
    
    return render_template(f'dashboards/client.html')


@dashboard_bp.route('/copelands/dashboard/estimator')
def dashboard_estimator():
    
    return render_template(f'dashboards/estimator.html')


@dashboard_bp.route('/copelands/dashboard/designer')
def dashboard_designer():
    
    return render_template(f'dashboards/designer.html')