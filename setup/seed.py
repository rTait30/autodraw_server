"""Seed all initial data. Safe to run multiple times (idempotent)."""
from __future__ import annotations
import os
import sys
import importlib.util
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SETUP_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from models import (
    db, User, Product, EstimatingSchema,
    FabricType, FabricColor, ShadeSailMembranePriceList,
)

# Direct-load data modules to avoid setup.py shadowing setup/ package
def _load_data(name):
    spec = importlib.util.spec_from_file_location(name, SETUP_DIR / "data" / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

_products_mod = _load_data("products")
_fabrics_mod = _load_data("fabrics")
_prices_mod = _load_data("membrane_prices")

PRODUCTS = _products_mod.PRODUCTS
FABRIC_TYPES = _fabrics_mod.FABRIC_TYPES
MEMBRANE_PRICES = _prices_mod.MEMBRANE_PRICES


def _upsert(model, lookup: dict, defaults: dict):
    """Find by lookup fields; create or update with defaults. Returns (obj, created)."""
    obj = model.query.filter_by(**lookup).first()
    if obj:
        for k, v in defaults.items():
            setattr(obj, k, v)
        return obj, False
    obj = model(**lookup, **defaults)
    db.session.add(obj)
    return obj, True


def seed_admin():
    from passlib.hash import bcrypt
    username = os.getenv("ADMIN_USERNAME", "admin")
    existing = User.query.filter_by(username=username).first()
    if existing:
        print(f"  Admin '{username}' exists (id={existing.id})")
        return
    db.session.add(User(
        username=username,
        password_hash=bcrypt.hash(os.getenv("ADMIN_PASSWORD", "admin")),
        role="admin", verified=True,
        email=os.getenv("ADMIN_EMAIL", "admin@example.com"),
    ))
    print(f"  Created admin '{username}'")


def seed_products():
    for p in PRODUCTS:
        product, created = _upsert(Product, {"name": p["name"]}, {
            "description": p.get("description", ""),
            "autodraw_config": p.get("autodraw_config", {}),
        })
        db.session.flush()
        tag = "Created" if created else "Updated"
        print(f"  {tag} product '{p['name']}' (id={product.id})")

        if "schema" in p:
            schema_name = f"{p['name']} default v1"
            schema, _ = _upsert(EstimatingSchema,
                {"product_id": product.id, "name": schema_name},
                {"data": p["schema"], "is_default": True, "version": 1},
            )
            db.session.flush()
            product.default_schema_id = schema.id


def seed_fabrics():
    for f in FABRIC_TYPES:
        fabric, created = _upsert(FabricType, {"name": f["name"]}, {
            "category": f["category"],
            "description": f.get("description", ""),
            "tech_specs": f.get("tech_specs", {}),
        })
        db.session.flush()
        for c in f.get("colors", []):
            _upsert(FabricColor, {"fabric_type_id": fabric.id, "name": c["name"]}, {
                "hex_value": c.get("hex_value"),
                "texture_path": c.get("texture_path"),
            })
        if created:
            print(f"  Created fabric '{f['name']}'")


def seed_membrane_prices():
    count = 0
    for fabric_name, prices in MEMBRANE_PRICES.items():
        fabric = FabricType.query.filter_by(name=fabric_name).first()
        if not fabric:
            print(f"  Warning: fabric '{fabric_name}' not found, skipping prices")
            continue
        for edge_meter, price in prices.items():
            _, created = _upsert(ShadeSailMembranePriceList,
                {"fabric_type_id": fabric.id, "edge_meter": edge_meter},
                {"price": price},
            )
            if created:
                count += 1
    print(f"  Membrane prices: {count} new entries")


def seed_all():
    """Run all seeders."""
    print("Seeding admin...")
    seed_admin()
    print("Seeding products...")
    seed_products()
    print("Seeding fabrics...")
    seed_fabrics()
    print("Seeding membrane prices...")
    seed_membrane_prices()
    db.session.commit()
    print("Seed complete.")


if __name__ == "__main__":
    from app import create_app
    app = create_app()
    with app.app_context():
        seed_all()
