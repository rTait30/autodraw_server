from models import db, User
from passlib.hash import bcrypt
from flask import Flask

def bootstrap_admin():
    admin_username = 'admin'
    admin_password = 'admin'  # You may prompt or read from env in production

    existing = User.query.filter_by(username=admin_username).first()
    if existing:
        print(f"Admin user '{admin_username}' already exists.")
        return

    user = User(
        username=admin_username,
        password_hash=bcrypt.hash(admin_password),
        role='admin',
        verified=True,
        email='admin@example.com'
    )
    db.session.add(user)
    db.session.commit()
    print(f"✅ Bootstrapped admin user '{admin_username}' successfully.")

if __name__ == '__main__':
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)  # <-- This is required!
    with app.app_context():
        db.create_all()  # Ensure tables exist
        bootstrap_admin()
