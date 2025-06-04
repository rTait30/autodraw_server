from flask import Blueprint, render_template, request, redirect, url_for, session

newproject_bp = Blueprint('newproject', __name__)

@newproject_bp.route('/newproject', methods=['GET', 'POST'])
def newproject():
    if request.method == 'POST':
        # Handle form data here
        return redirect(url_for('dashboard.dashboard'))
    return render_template('newproject.html', user_role=session.get('role', 'client'))

@newproject_bp.route('/copelands/newproject/covers')
def newproject_covers():
    return render_template('newproject/cover.html', user_role=session.get('role', 'client'))

@newproject_bp.route('/copelands/newproject/shadesail')
def newproject_shadesails():
    return render_template('newproject/shadesail.html', user_role=session.get('role', 'client'))

