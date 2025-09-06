import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, render_template, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from models import db  # and your models are imported within blueprints as needed

# Blueprints
from endpoints.api.auth.routes import auth_bp
from endpoints.api.projects.nest import nest_bp
from endpoints.api.projects.projects_api import projects_api_bp
from endpoints.api.database import database_api_bp

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

    # --- DB config ---
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///users.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # --- JWT config (access in header, refresh in cookie) ---
    app.config.update(
        JWT_SECRET_KEY=jwt_secret,
        JWT_TOKEN_LOCATION=["headers", "cookies"],  # access via header; refresh via cookie
        JWT_HEADER_NAME="Authorization",
        JWT_HEADER_TYPE="Bearer",
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(minutes=10),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=14),

        # Cookie settings: for same-site dev use Lax; for cross-site set None+Secure on HTTPS.
        JWT_COOKIE_SECURE=False if os.getenv("ENV", "dev") == "dev" else True,
        JWT_COOKIE_SAMESITE=os.getenv("JWT_COOKIE_SAMESITE", "Strict"),  # "Lax" (same-site) or "None"
        JWT_COOKIE_CSRF_PROTECT=True,  # CSRF protection for cookie-based endpoints
        JWT_ACCESS_COOKIE_PATH="/copelands/api/refresh",  # only refresh endpoint needs cookie
        JWT_REFRESH_COOKIE_PATH="/copelands/api/refresh",
    )

    # --- CORS (match your frontend origin exactly) ---
    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:5173")
    CORS(app, origins=[frontend_origin], supports_credentials=True)

    # --- Init extensions ---
    db.init_app(app)
    jwt = JWTManager(app)

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

    # --- One-time DB create ---
    with app.app_context():
        db.create_all()

    # --- Static + SPA routes ---
    @app.route('/copelands/assets/<path:filename>')
    def serve_assets(filename):
        return send_from_directory('static/assets', filename)

    @app.route('/copelands/', defaults={'path': ''})
    @app.route('/copelands/<path:path>')
    def serve_react_app(path):
        # Let React Router handle the path; index.html must exist in templates/
        return render_template('index.html')

    # --- Minimal security headers (adjust CSP as you harden) ---
    @app.after_request
    def set_security_headers(resp):
        # In dev, avoid strict CSP that breaks Vite HMR; tighten for prod build
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer-when-downgrade")
        return resp

    return app


app = create_app()
if __name__ == '__main__':
    # For local dev only
    app.run(host='127.0.0.1', port=5001, debug=True)
