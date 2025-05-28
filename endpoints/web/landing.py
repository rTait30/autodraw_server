from flask import Blueprint, render_template

landing_bp = Blueprint('landing', __name__)

@landing_bp.route('/copelands/landing/')
@landing_bp.route('/landing')
def landing():
    return render_template('landing.html')