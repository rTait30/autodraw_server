from flask import Blueprint, render_template, request, redirect, url_for, session

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/copelands/projects', methods=['GET', 'POST'])
def projects():

    return render_template('projects.html', user_role=session.get('role', 'client'))