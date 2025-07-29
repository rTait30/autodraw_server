from flask_sqlalchemy import SQLAlchemy
from passlib.hash import bcrypt

from sqlalchemy import Enum as SqlEnum
import enum
from datetime import datetime, timezone

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(32), nullable=False)
    verified = db.Column(db.Boolean, default=False, nullable=False)  # Added verified field
    email = db.Column(db.String(120), nullable=True)
    address = db.Column(db.String(120), nullable=True)

    def set_password(self, password):
        self.password_hash = bcrypt.hash(password)

    def check_password(self, password):
        return bcrypt.verify(password, self.password_hash)
    
class ProjectType(enum.Enum):
    cover = "cover"
    sail = "sail"
    
    # Add more types as needed

class ProjectStatus(enum.Enum):

    quoting = "quoting"
    estimating = "estimating"
    design = "design"
    production = "production"
    quality_checking = "quality_checking"
    completed = "completed"
    dispatched = "dispatched"
    # Add more statuses as needed

class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    type = db.Column(SqlEnum(ProjectType), nullable=False)
    status = db.Column(SqlEnum(ProjectStatus), nullable=False, default=ProjectStatus.quoting)
    due_date = db.Column(db.Date, nullable=True)
    info = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    client_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

class ProjectAttribute(db.Model):
    __tablename__ = 'project_attributes'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False, index=True)
    data = db.Column(db.JSON)
    calculated = db.Column(db.JSON)  # <-- store cached calculations here (optional)

class Log(db.Model):
    __tablename__ = 'logs'
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(255))

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(32), nullable=True)  # e.g., 'each', 'meter', etc.
    active = db.Column(db.Boolean, default=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
