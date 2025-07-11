from models import db, User

from passlib.hash import bcrypt

from flask import Flask

def bootstrap_admin():
    adminusername = 'admin'
    adminpassword = 'admin123'

    existing = User.query.filter_by(username=adminusername).first()
    if existing:
        print(f"Admin user '{adminusername}' already exists.")
        return

    user = User(
        username=adminusername,
        password_hash=bcrypt.hash(adminpassword),
        role='admin',
        verified=True,
        email='admin@example.com',
        company='AdminCorp'
    )
    db.session.add(user)
    db.session.commit()
    print(f"Admin user '{adminusername}' created successfully.")

if __name__ == '__main__':
    # Create and push app context
    app = Flask(__name__)  # Ensure this returns a Flask app instance
    with app.app_context():
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
        bootstrap_admin()


# bootstrap_admin.py

def bootstrap_admin():
    admin_username = 'admin'
    admin_password = 'admin123'  # You may prompt or read from env in production

    with app.app_context():
        existing = User.query.filter_by(username=admin_username).first()
        if existing:
            print(f"Admin user '{admin_username}' already exists.")
            return

        user = User(
            username=admin_username,
            password_hash=bcrypt.hash(admin_password),
            role='admin',
            verified=True,
            email='admin@example.com',
            company='AdminCorp'
        )
        db.session.add(user)
        db.session.commit()
        print(f"✅ Bootstrapped admin user '{admin_username}' successfully.")

if __name__ == '__main__':
    bootstrap_admin()
