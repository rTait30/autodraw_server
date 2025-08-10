# setup/bootstrap_admin.py
from __future__ import annotations
import os
import sys
from pathlib import Path

# --- Repo root and import path ---
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from models import db, User  # noqa: E402

def bootstrap_admin():
    from passlib.hash import bcrypt

    username = os.getenv("ADMIN_USERNAME", "admin")
    email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    password = os.getenv("ADMIN_PASSWORD", "admin")

    existing = User.query.filter_by(username=username).first()
    if existing:
        print(f"Admin user '{username}' already exists (id={existing.id}).")
        return

    user = User(
        username=username,
        password_hash=bcrypt.hash(password),
        role="admin",
        verified=True,
        email=email,
    )
    db.session.add(user)
    db.session.commit()
    print(f"✅ Bootstrapped admin user '{username}' successfully (id={user.id}).")


if __name__ == "__main__":
    
    from flask import Flask
    instance_dir = BASE_DIR / "instance"
    instance_dir.mkdir(parents=True, exist_ok=True)

    db_path = instance_dir / "users.db"
    db_uri = f"sqlite:///{db_path.as_posix()}"

    app = Flask(__name__, instance_path=str(instance_dir), instance_relative_config=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    with app.app_context():
        # Show where we’re writing so there’s no ambiguity
        print(f"SQLALCHEMY_DATABASE_URI = {app.config.get('SQLALCHEMY_DATABASE_URI')}")
        # Ensure tables exist, then insert admin if needed
        db.create_all()
        bootstrap_admin()
