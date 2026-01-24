from flask_sqlalchemy import SQLAlchemy
from passlib.hash import bcrypt
from sqlalchemy import Enum as SqlEnum
import enum
from datetime import datetime, timezone

db = SQLAlchemy()

user_favorites = db.Table('user_favorites',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('product_id', db.Integer, db.ForeignKey('products.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(32), nullable=False)
    verified = db.Column(db.Boolean, default=False, nullable=False)
    email = db.Column(db.String(120), nullable=True)
    address = db.Column(db.String(120), nullable=True)
    
    # WorkGuru integration
    tenant = db.Column(db.String(10), nullable=True)  # "DR" or "CP"
    wg_id = db.Column(db.Integer, nullable=True, index=True)  # WorkGuru client ID

    # User Preferences (JSON is cleaner for flexible lists/settings)
    # General preferences: e.g. {"favorites": [1, 5], "dark_mode": true}
    preferences = db.Column(db.JSON, default=dict)

    # Manufacturing/Product preferences: e.g. {"Shade Sails": {"defaults": {"hardware": "Ezy Slide", "allowance": 20}}}
    product_preferences = db.Column(db.JSON, default=dict)

    favorites = db.relationship('Product', secondary=user_favorites, lazy='subquery',
        backref=db.backref('favorited_by', lazy=True))

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

    autodraw_config = db.Column(db.JSON, default=dict, nullable=True)

class ProjectStatus(enum.Enum):
    awaiting_deposit = "1.1 Awaiting Deposit"
    on_hold = "1.2 On Hold"
    request_deposit = "1.3 Request Deposit"
    in_design = "2.1 In Design"
    sent_for_approval = "2.2 Sent for approval"
    customer_approved = "2.3 Customer Approved"
    awaiting_materials = "3.1 Awaiting Materials"
    waiting_to_start = "3.2 Waiting to Start"
    in_progress = "4.1 In Progress"
    completion_invoice = "4.2 Completion Invoice"
    awaiting_final_payment = "5.1 Awaiting Final Payment"
    ready_for_despatch = "5.2 Ready For Despatch"
    cancelled = "5.3 Cancelled"
    completed = "5.4 Completed"

class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)

    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    product = db.relationship("Product", backref="projects")

    status = db.Column(SqlEnum(ProjectStatus), nullable=False, default=ProjectStatus.awaiting_deposit)
    due_date = db.Column(db.Date)
    info = db.Column(db.Text)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    # optional pointer to the template ID (just to remember what it came from)
    schema_id = db.Column(
        db.Integer,
        db.ForeignKey("estimating_schemas.id"),
        nullable=True,
        index=True,
    )
    schema = db.relationship("EstimatingSchema", foreign_keys=[schema_id], post_update=True)

    # actual values for the job
    project_attributes = db.Column(db.JSON, default=dict)
    project_calculated = db.Column(db.JSON, default=dict)

    products = db.relationship(
        "ProjectProduct",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    # 👇 THIS is the working schema for the project
    estimate_schema = db.Column(db.JSON, default=dict)

    # optional convenience field
    estimate_total = db.Column(db.Float)

    # WorkGuru integration data (lead_id, quote_id, project_id, etc.)
    wg_data = db.Column(db.JSON, default=dict)

    def get_estimated_price(self):
        from estimation import estimate_price_from_schema
        # If we have items, prefer summing their estimates (compute on the fly if missing)
        if self.products and self.estimate_schema:
            grand_total = 0.0
            for item in self.products:
                # Use the item-specific attributes when evaluating
                result = estimate_price_from_schema(self.estimate_schema, item.attributes or {}) or {}
                totals = result.get("totals") or {}
                item_total = (
                    totals.get("grand_total")
                    or totals.get("grandTotal")
                    or totals.get("total")
                    or 0.0
                )
                item.estimate_total = item_total
                grand_total += float(item_total or 0.0)
            self.estimate_total = grand_total
            return grand_total

        # Fallback: evaluate against project-level attributes
        if not self.estimate_schema:
            return None
        results = estimate_price_from_schema(self.estimate_schema, self.project_attributes or {})
        totals = results.get("totals") or {}
        return (
            totals.get("grand_total")
            or totals.get("grandTotal")
            or totals.get("total")
        )

    autodraw_record = db.Column(db.JSON, default=dict)
    autodraw_meta = db.Column(db.JSON, default=lambda: {"current_step": 0, "current_sub_step": 0})

class ProjectProduct(db.Model):
    __tablename__ = "project_products"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    item_index = db.Column(db.Integer, nullable=False, default=1)
    label = db.Column(db.String(120))

    attributes = db.Column(db.JSON, default=dict)
    calculated = db.Column(db.JSON, default=dict)

    # per-item estimated total (computed from project.estimate_schema against attributes)
    estimate_total = db.Column(db.Float)

    autodraw_record = db.Column(db.JSON, default=dict)
    autodraw_meta = db.Column(db.JSON, default=lambda: {"current_step": 0, "current_sub_step": 0})
    status = db.Column(db.String(32), default="pending")

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

class SKU(db.Model):
    __tablename__ = "skus"
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(64), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=True)
    costPrice = db.Column(db.Float, nullable=True)
    sellPrice = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            "sku": self.sku,
            "name": self.name,
            "costPrice": self.costPrice,
            "sellPrice": self.sellPrice,
        }
