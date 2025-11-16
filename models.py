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

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    default_schema_id = db.Column(db.Integer, db.ForeignKey('estimating_schemas.id'), nullable=True)
    default_schema = db.relationship('EstimatingSchema', foreign_keys=[default_schema_id], post_update=True)
    schemas = db.relationship('EstimatingSchema', backref='product', lazy='dynamic', foreign_keys='EstimatingSchema.product_id')

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
    def get_estimated_price(self):
        """
        Returns the estimated price for this project using its schema if set,
        otherwise falls back to the product's default schema.
        """
        from estimation import estimate_price_from_schema
        schema = self.schema or self.product.default_schema
        if not schema:
            return None  # No schema available
        return estimate_price_from_schema(schema.data, self.project_attributes)
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    product = db.relationship("Product", backref="projects")

    status = db.Column(SqlEnum(ProjectStatus), nullable=False, default=ProjectStatus.quoting)
    due_date = db.Column(db.Date)
    info = db.Column(db.Text)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    schema_id = db.Column(db.Integer, db.ForeignKey("estimating_schemas.id"), nullable=True, index=True)
    schema = db.relationship("EstimatingSchema", foreign_keys=[schema_id], post_update=True)
    # If schema_id is null, use product.default_schema

    project_attributes = db.Column(db.JSON, default=dict)
    project_calculated = db.Column(db.JSON, default=dict)

    products = db.relationship(
        "ProjectProduct",
        back_populates="project",
        cascade="all, delete-orphan",
        #order_by="ProjectProduct.item_index"
    )


class ProjectProduct(db.Model):
    __tablename__ = "project_products"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    item_index = db.Column(db.Integer, nullable=False, default=1)
    label = db.Column(db.String(120))

    attributes = db.Column(db.JSON, default=dict)
    calculated = db.Column(db.JSON, default=dict)

    project = db.relationship("Project", back_populates="products")

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


class EstimatingSchema(db.Model):
    __tablename__ = "estimating_schemas"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True, index=True)
    name = db.Column(db.String(200), nullable=False)
    data = db.Column(db.JSON, nullable=False, default=dict)
    is_default = db.Column(db.Boolean, nullable=False, default=False)
    version = db.Column(db.Integer, nullable=False, default=1)
