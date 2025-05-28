from flask import Blueprint, render_template, request, redirect, url_for, session

newproject_bp = Blueprint('newproject', __name__)

@newproject_bp.route('/copelands/newproject', methods=['GET', 'POST'])
def new_project():
    if request.method == 'POST':
        # Handle form data here
        return redirect(url_for('dashboard.dashboard'))
    return render_template('newproject.html')

@newproject_bp.route('/copelands/new_project/covers')
def new_project_covers():
    return render_template('newproject/cover.html', user_role=session.get('role', 'client'))

@newproject_bp.route('/copelands/newproject/shadesail')
def new_project_shadesails():
    return render_template('newproject/shadesail.html', user_role=session.get('role', 'client'))