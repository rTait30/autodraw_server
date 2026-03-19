import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, render_template, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from models import db, User  # and your models are imported within blueprints as needed

# Blueprints
from endpoints.api.auth.routes import auth_bp
from endpoints.api.projects.nest import nest_bp
from endpoints.api.projects.projects_api import projects_api_bp
from endpoints.api.database import database_api_bp
from endpoints.api.workguru import workguru_api_bp
from endpoints.api.projects.projects_calc_api import projects_calc_api_bp
from endpoints.api.automation.routes import automation_bp
from endpoints.api.user_preferences import user_bp
from endpoints.api.fabric import fabric_bp
from endpoints.api.estimating_schemas import est_schemas_bp


# --- Env & app ---
load_dotenv(dotenv_path=Path('instance') / '.env')

def create_app():
    app = Flask(
        __name__,
        static_url_path='/copelands/static',
        static_folder='static',
        template_folder='templates',  # ensure this is correct
    )

    # --- Secrets (fail fast in prod) ---
    app.secret_key = os.environ.get("FLASK_SECRET_KEY")
    jwt_secret = os.environ.get("JWT_SECRET_KEY")

    #cp_key = os.environ.get("CP_KEY")

    #print (cp_key)

    # --- DB config ---
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///autodraw.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    migrate = Migrate(app, db) # Initialize Flask-Migrate

    # --- JWT config (access in header, refresh in cookie) ---
    app.config.update(
        JWT_SECRET_KEY=jwt_secret,
        JWT_SESSION_COOKIE=False, # Make cookies persistent (survive browser close)
        JWT_TOKEN_LOCATION=["headers", "cookies"],  # access via header; refresh via cookie
        JWT_HEADER_NAME="Authorization",
        JWT_HEADER_TYPE="Bearer",
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(days=1),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=14),

        # Cookie settings: for same-site dev use Lax; for cross-site set None+Secure on HTTPS.
        JWT_COOKIE_SECURE=False if os.getenv("ENV", "dev") == "dev" else True,
        JWT_COOKIE_SAMESITE=os.getenv("JWT_COOKIE_SAMESITE", "Strict"),  # "Lax" (same-site) or "None"
        JWT_COOKIE_CSRF_PROTECT=True,  # CSRF protection for cookie-based endpoints
        JWT_ACCESS_COOKIE_PATH="/copelands/api/refresh",  # only refresh endpoint needs cookie
        JWT_REFRESH_COOKIE_PATH="/copelands/api/refresh",
    )

    # --- Init extensions ---
    if 'sqlalchemy' not in app.extensions:
        db.init_app(app)
    jwt = JWTManager(app)
    migrate = Migrate(app, db)

    # Optional JWT error handlers (good DX for the SPA)
    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({'error': 'Invalid token', 'reason': reason}), 401

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({'error': 'Token expired'}), 401

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({'error': 'Missing token', 'reason': reason}), 401

    # --- Register blueprints (ensure consistent URL space) ---
    app.register_blueprint(auth_bp, url_prefix="/copelands/api")
    app.register_blueprint(projects_api_bp, url_prefix="/copelands/api")
    app.register_blueprint(nest_bp, url_prefix="/copelands/api")
    app.register_blueprint(database_api_bp, url_prefix="/copelands/api")
    app.register_blueprint(workguru_api_bp, url_prefix="/copelands/api")
    app.register_blueprint(projects_calc_api_bp, url_prefix="/copelands/api")
    app.register_blueprint(automation_bp, url_prefix="/copelands/api")
    app.register_blueprint(user_bp, url_prefix="/copelands/api/user")
    app.register_blueprint(fabric_bp, url_prefix="/copelands/api/fabric")
    app.register_blueprint(est_schemas_bp, url_prefix="/copelands/api")
    print("DEBUG: Registered fabric_bp")

    # --- One-time DB create ---
    with app.app_context():
        db.create_all()

    # --- Static + SPA routes ---

    return app

# Create the application instance for Gunicorn
app = create_app()

if __name__ == '__main__':
    # For local dev only
    print ("Starting Flask dev server...")
    app.run(host='127.0.0.1', port=5001, debug=True)


        # Optional warm-up (safe=True so deploys don't fail if CRM is briefly down)

