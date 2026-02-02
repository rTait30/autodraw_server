#!/usr/bin/env python3
import argparse
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from endpoints.api.fabric import add_fabric_type_service

def main():
    parser = argparse.ArgumentParser(description="Add a new fabric type to the database.")
    parser.add_argument("name", help="Name of the fabric (e.g., 'Rainbow Z16')")
    parser.add_argument("category", help="Category of the fabric (e.g., 'Shade', 'PVC')")
    parser.add_argument("--description", help="Description of the fabric", default="")
    
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        data = {
            "name": args.name,
            "category": args.category,
            "description": args.description,
            "tech_specs": {} 
        }
        
        try:
            fabric = add_fabric_type_service(data)
            print(f"Successfully added fabric: {fabric.name} (ID: {fabric.id})")
        except ValueError as e:
            print(f"Error: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Unexpected error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
