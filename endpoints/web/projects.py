from flask import Blueprint, render_template, request, redirect, url_for, session

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/copelands/projects', methods=['GET', 'POST'])
def projects():

    return render_template('projects.html', user_role=session.get('role', 'client'))

@projects_bp.route('/copelands/project/<int:project_id>', methods=['GET', 'POST'])
def project(project_id):  # <-- function name can be anything, but must accept project_id
    return render_template('project.html', project_id=project_id, user_role=session.get('role', 'client'))