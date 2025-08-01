from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
from flask import session
from passlib.hash import bcrypt
from flask_jwt_extended import JWTManager
import os
import json

from dotenv import load_dotenv
from pathlib import Path

from endpoints.api.auth.routes import auth_bp
from endpoints.api.projects.nest import nest_bp
from endpoints.api.projects.projects_api import projects_api_bp

from endpoints.api.database import database_api_bp

from models import db, User, Project, Log

load_dotenv(dotenv_path=Path('instance') / '.env')

app = Flask(__name__, static_url_path='/copelands/static', static_folder='static')

app.secret_key = os.environ.get("FLASK_SECRET_KEY")

from flask_cors import CORS
CORS(app, supports_credentials=True)

CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'  # Default DB (users/auth)

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get("JWT_SECRET_KEY")

# --- Initialize extensions here ---
db.init_app(app)
jwt = JWTManager(app)



# ---- API ENDPOINTS ----

db_initialized = False

@app.before_request
def create_all_databases():
    global db_initialized
    if not db_initialized:
        db.create_all()
        db_initialized = True

BASE_CONFIG_DIR = 'configs'

app.register_blueprint(auth_bp)
app.register_blueprint(projects_api_bp)
app.register_blueprint(nest_bp)

app.register_blueprint(database_api_bp)






# -- REACT --

@app.route('/copelands/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory('static/assets', filename)

@app.route('/copelands/', defaults={'path': ''})
@app.route('/copelands/<path:path>')
def serve_react_app(path):
    return render_template('index.html')

if __name__ == '__main__':

    app.run(host='127.0.0.1', port=5001, debug=True)










