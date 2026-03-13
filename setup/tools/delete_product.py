import argparse
import os
import sys
import shutil
import re
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

BACKEND_PRODUCTS_DIR = BASE_DIR / "endpoints" / "api" / "products"
FRONTEND_PRODUCTS_DIR = BASE_DIR / "react" / "src" / "components" / "products"
BOOTSTRAP_FILE = BASE_DIR / "setup" / "bootstrap_admin.py"

# Lazy imports
def get_db_models():
    from models import db, Product
    return db, Product

def get_create_app():
    from app import create_app
    return create_app

def delete_backend_files(product_name):
    product_dir = BACKEND_PRODUCTS_DIR / product_name
    if product_dir.exists() and product_dir.is_dir():
        shutil.rmtree(product_dir)
        print(f"Deleted backend files: {product_dir}")
    else:
        print(f"Backend directory not found: {product_dir}")

def delete_frontend_files(product_name):
    product_dir = FRONTEND_PRODUCTS_DIR / product_name
    if product_dir.exists() and product_dir.is_dir():
        shutil.rmtree(product_dir)
        print(f"Deleted frontend files: {product_dir}")
    else:
        print(f"Frontend directory not found: {product_dir}")

def remove_from_bootstrap_script(product_name):
    if not BOOTSTRAP_FILE.exists():
        print(f"Warning: {BOOTSTRAP_FILE} not found.")
        return

    with open(BOOTSTRAP_FILE, "r") as f:
        content = f.read()

    # Regex to find the product entry in the list
    # Matches: { ... "name": "PRODUCT_NAME" ... },
    pattern = re.compile(r'\s*\{\s*[^}]*"name":\s*"' + re.escape(product_name) + r'"[^}]*\},?', re.DOTALL)
    
    if pattern.search(content):
        new_content = pattern.sub('', content)
        with open(BOOTSTRAP_FILE, "w") as f:
            f.write(new_content)
        print(f"Removed {product_name} from {BOOTSTRAP_FILE}")
    else:
        print(f"Product {product_name} not found in bootstrap_admin.py")

def remove_from_db(product_name):
    from flask import has_app_context
    db, Product = get_db_models()
    
    def _delete():
        product = Product.query.filter_by(name=product_name).first()
        if product:
            db.session.delete(product)
            db.session.commit()
            print(f"✅ Deleted {product_name} from database.")
        else:
            print(f"Product {product_name} not found in database.")

    if has_app_context():
        _delete()
    else:
        create_app = get_create_app()
        app = create_app()
        with app.app_context():
            _delete()

def delete_product(name, force=False):
    product_name = name.upper()
    print(f"Deleting product: {product_name}")
    
    if not force:
        confirm = input(f"Are you sure you want to delete {product_name} and all its files? (y/N): ")
        if confirm.lower() != 'y':
            print("Aborted.")
            return

    delete_backend_files(product_name)
    delete_frontend_files(product_name)
    remove_from_bootstrap_script(product_name)
    remove_from_db(product_name)
    
    print("\nDone!")

def main():
    parser = argparse.ArgumentParser(description="Delete a product from AutoDraw")
    parser.add_argument("name", help="Name of the product to delete")
    parser.add_argument("--force", action="store_true", help="Skip confirmation")
    
    args = parser.parse_args()
    delete_product(args.name, args.force)

if __name__ == "__main__":
    main()
