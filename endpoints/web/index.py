from flask import Blueprint, render_template

index_bp = Blueprint('index', __name__)

@index_bp.route('/copelands/')
@index_bp.route('/copelands')
def copelands_index():
    return render_template('index.html')