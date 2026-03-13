#!/usr/bin/env python3
import argparse
import sys
import os
import json

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from endpoints.api.fabric import add_fabric_type_service, update_fabric_type_service, add_fabric_color_service
from models import FabricType

def cmd_create(args):
    data = {
        "name": args.name,
        "category": args.category,
        "description": args.description,
        "tech_specs": {} 
    }
    try:
        if args.specs:
            data['tech_specs'] = json.loads(args.specs)
    except json.JSONDecodeError:
        print("Error: --specs must be valid JSON string")
        sys.exit(1)
        
    try:
        fabric = add_fabric_type_service(data)
        print(f"Successfully added fabric: {fabric.name} (ID: {fabric.id})")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def cmd_update(args):
    # Find fabric by ID or Name
    fabric = None
    if args.id:
        fabric = FabricType.query.get(args.id)
    elif args.name_identifier:
        fabric = FabricType.query.filter_by(name=args.name_identifier).first()
    
    if not fabric:
        print("Error: Fabric not found. Provide --id or --name-identifier")
        sys.exit(1)

    data = {}
    if args.new_name:
        data['name'] = args.new_name
    if args.category:
        data['category'] = args.category
    if args.description:
        data['description'] = args.description
    if args.specs:
        try:
            data['tech_specs'] = json.loads(args.specs)
        except json.JSONDecodeError:
            print("Error: --specs must be valid JSON string")
            sys.exit(1)
    
    if not data:
        print("No updates provided.")
        return

    try:
        updated = update_fabric_type_service(fabric.id, data)
        print(f"Successfully updated fabric: {updated.name} (ID: {updated.id})")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def cmd_add_color(args):
    # Find fabric by ID or Name
    fabric = None
    if args.id:
        fabric = FabricType.query.get(args.id)
    elif args.name_identifier:
        fabric = FabricType.query.filter_by(name=args.name_identifier).first()
    
    if not fabric:
        print("Error: Fabric not found. Provide --id or --name-identifier")
        sys.exit(1)

    data = {
        "name": args.color_name,
        "hex_value": args.hex,
        "texture_path": args.texture
    }

    try:
        color = add_fabric_color_service(fabric.id, data)
        print(f"Successfully added color '{color.name}' to fabric '{fabric.name}'")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Manage fabrics and colors.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # CREATE
    parser_create = subparsers.add_parser("create", help="Add a new fabric type")
    parser_create.add_argument("name", help="Name of the fabric")
    parser_create.add_argument("category", help="Category of the fabric")
    parser_create.add_argument("--description", help="Description", default="")
    parser_create.add_argument("--specs", help="Tech specs as JSON string", default=None)
    parser_create.set_defaults(func=cmd_create)

    # UPDATE
    parser_update = subparsers.add_parser("update", help="Update a fabric type")
    parser_update.add_argument("--id", type=int, help="Fabric ID to update")
    parser_update.add_argument("--name-identifier", help="Fabric Name to update (if ID not provided)")
    parser_update.add_argument("--new-name", help="New name for the fabric")
    parser_update.add_argument("--category", help="New category")
    parser_update.add_argument("--description", help="New description")
    parser_update.add_argument("--specs", help="New specs as JSON string (merges into existing)")
    parser_update.set_defaults(func=cmd_update)

    # ADD COLOR
    parser_color = subparsers.add_parser("add-color", help="Add a color to a fabric")
    parser_color.add_argument("--id", type=int, help="Fabric ID")
    parser_color.add_argument("--name-identifier", help="Fabric Name")
    parser_color.add_argument("color_name", help="Name of the color")
    parser_color.add_argument("--hex", help="Hex code (e.g. #FFFFFF)")
    parser_color.add_argument("--texture", help="Texture file path")
    parser_color.set_defaults(func=cmd_add_color)

    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        args.func(args)

if __name__ == "__main__":
    main()
