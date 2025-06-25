from flask import Blueprint, render_template

discrepancy_bp = Blueprint('discrepancy', __name__)

@discrepancy_bp.route('/copelands/discrepancy')
def discrepancy():
    return render_template('discrepancy.html')