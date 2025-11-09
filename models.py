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
    verified = db.Column(db.Boolean, default=False, nullable=False)
    email = db.Column(db.String(120), nullable=True)
    address = db.Column(db.String(120), nullable=True)

    def set_password(self, password):
        self.password_hash = bcrypt.hash(password)

    def check_password(self, password):
        return bcrypt.verify(password, self.password_hash)

class ProjectType(db.Model):
    __tablename__ = 'project_types'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    default_schema_id = db.Column(db.Integer, db.ForeignKey('estimating_schemas.id'), nullable=True)
    default_schema = db.relationship('EstimatingSchema', foreign_keys=[default_schema_id], post_update=True)
    # Optional: add icon, default_attributes, etc.
    schemas = db.relationship('EstimatingSchema', backref='project_type', lazy='dynamic', foreign_keys='EstimatingSchema.project_type_id')

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

    # This is your "productType" in JSON
    type_id = db.Column(db.Integer, db.ForeignKey('project_types.id'), nullable=False)
    type = db.relationship('ProjectType', backref='projects')

    status = db.Column(SqlEnum(ProjectStatus), nullable=False, default=ProjectStatus.quoting)

    # Top-level, applies to whole project
    due_date = db.Column(db.Date, nullable=True)      # maps from JSON "dueDate"
    info = db.Column(db.Text, nullable=True)          # good place for global notes

    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    client_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # NEW: each project can have 1..N products (sails/covers/etc)
    products = db.relationship(
        'ProjectProduct',
        backref='project',
        lazy='dynamic',
        order_by='ProjectProduct.item_index',
        cascade='all, delete-orphan',
    )

    # unchanged
    schemas = db.relationship(
        'EstimatingSchema',
        backref='project',
        lazy='dynamic',
        foreign_keys='EstimatingSchema.project_id'
    )

class ProjectProduct(db.Model):
    """
    One 'thing' under a project: e.g. a single shade sail or a single PVC cover.

    Reuses the existing 'project_attributes' table so you don't lose data,
    but adds item_index/label and renames 'data' → 'attributes' at the ORM level.
    """
    __tablename__ = 'project_attributes'  # reuse existing table

    id = db.Column(db.Integer, primary_key=True)

    project_id = db.Column(
        db.Integer,
        db.ForeignKey('projects.id'),
        nullable=False,
        index=True
    )

    # Order of this product within the project (1,2,3,...)
    item_index = db.Column(db.Integer, nullable=False, default=1)

    # Human label like "Sail 1", "Cover A" (optional but useful)
    label = db.Column(db.String(120), nullable=True)

    # Previously called `data`; we keep the column name but expose as `attributes`
    attributes = db.Column('data', db.JSON)
    calculated = db.Column(db.JSON)

    # Optional: timestamps if you want (requires migration)
    # created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    # updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))


class Quote(db.Model):
    __tablename__ = 'quotes'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False, index=True)
    
    value = db.Column(db.Float)
    status = db.Column(db.String(32), default="draft")  # draft, sent, accepted
    snapshot = db.Column(db.JSON)       # evaluated line items + totals    

    version = db.Column(db.Integer, nullable=True, default=1)
    
    #provenance = db.Column(db.JSON)     # schema, inputs, price list version, etc.
    #created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    #created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

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
    unit = db.Column(db.String(32), nullable=True)
    active = db.Column(db.Boolean, default=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

class EstimatingSchema(db.Model):
    __tablename__ = "estimating_schemas"
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True)
    project_type_id = db.Column(db.Integer, db.ForeignKey("project_types.id"), nullable=True, index=True)
    name = db.Column(db.String(200), nullable=False)
    data = db.Column(db.JSON, nullable=False, default=dict)
    is_default = db.Column(db.Boolean, nullable=False, default=False)
    version = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now(), onupdate=db.func.now())
