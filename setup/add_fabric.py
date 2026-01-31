#!/usr/bin/env python3
import os
import sys

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db, FabricType, FabricColor

def add_sample_fabrics():
    app = create_app()
    with app.app_context():
        # Define all fabrics from the form options
        fabrics_data = [
            {
                'name': 'Rainbow Z16',
                'category': 'Shade',
                'description': 'High quality knitted shade fabric with excellent UV protection',
                'tech_specs': {
                    'warp': 95,
                    'weft': 90,
                    'gsm': 200,
                    'uv_block': '98%'
                }
            },
            {
                'name': 'Poly Fx',
                'category': 'Shade',
                'description': 'Durable polyester shade fabric',
                'tech_specs': {
                    'warp': 100,
                    'weft': 85,
                    'gsm': 180,
                    'uv_block': '95%'
                }
            },
            {
                'name': 'Extreme 32',
                'category': 'Shade',
                'description': 'Heavy duty shade fabric for extreme conditions',
                'tech_specs': {
                    'warp': 120,
                    'weft': 110,
                    'gsm': 320,
                    'uv_block': '99%'
                }
            },
            {
                'name': 'Polyfab Xtra',
                'category': 'Shade',
                'description': 'Extra strength polyester fabric',
                'tech_specs': {
                    'warp': 110,
                    'weft': 95,
                    'gsm': 250,
                    'uv_block': '97%'
                }
            },
            {
                'name': 'Tensitech 480',
                'category': 'Shade',
                'description': 'High tensile strength technical fabric',
                'tech_specs': {
                    'warp': 150,
                    'weft': 130,
                    'gsm': 480,
                    'uv_block': '99%'
                }
            },
            {
                'name': 'Monotec 370',
                'category': 'Shade',
                'description': 'Monofilament technical fabric',
                'tech_specs': {
                    'warp': 140,
                    'weft': 120,
                    'gsm': 370,
                    'uv_block': '98%'
                }
            },
            {
                'name': 'DriZ',
                'category': 'Shade',
                'description': 'Water-resistant shade fabric',
                'tech_specs': {
                    'warp': 100,
                    'weft': 90,
                    'gsm': 220,
                    'uv_block': '96%'
                }
            },
            {
                'name': 'Bochini',
                'category': 'PVC',
                'description': 'Classic PVC membrane fabric',
                'tech_specs': {
                    'thickness': '0.8mm',
                    'weight': '1200gsm',
                    'tensile_strength': '2800N/50mm',
                    'tear_strength': '350N'
                }
            },
            {
                'name': 'Bochini Blockout',
                'category': 'PVC',
                'description': 'PVC membrane with complete light blockage',
                'tech_specs': {
                    'thickness': '0.9mm',
                    'weight': '1350gsm',
                    'tensile_strength': '3000N/50mm',
                    'tear_strength': '400N'
                }
            },
            {
                'name': 'Mehler FR580',
                'category': 'PVC',
                'description': 'Fire retardant PVC membrane',
                'tech_specs': {
                    'thickness': '0.58mm',
                    'weight': '950gsm',
                    'tensile_strength': '2500N/50mm',
                    'tear_strength': '300N'
                }
            },
            {
                'name': 'Ferrari 502S2',
                'category': 'PVC',
                'description': 'Premium PVC membrane with superior finish',
                'tech_specs': {
                    'thickness': '0.65mm',
                    'weight': '1100gsm',
                    'tensile_strength': '2600N/50mm',
                    'tear_strength': '320N'
                }
            },
            {
                'name': 'Ferrari 502V3',
                'category': 'PVC',
                'description': 'High performance PVC membrane',
                'tech_specs': {
                    'thickness': '0.7mm',
                    'weight': '1150gsm',
                    'tensile_strength': '2700N/50mm',
                    'tear_strength': '340N'
                }
            }
        ]

        for fabric_data in fabrics_data:
            # Check if already exists
            if not FabricType.query.filter_by(name=fabric_data['name']).first():
                fabric = FabricType(
                    name=fabric_data['name'],
                    category=fabric_data['category'],
                    description=fabric_data['description'],
                    tech_specs=fabric_data['tech_specs']
                )
                db.session.add(fabric)
                db.session.commit()

                # Add some default colors for each fabric
                default_colors = [
                    {'name': 'White', 'hex': '#ffffff'},
                    {'name': 'Black', 'hex': '#000000'},
                    {'name': 'Charcoal', 'hex': '#36454f'},
                    {'name': 'Navy', 'hex': '#000080'},
                ]

                for color_data in default_colors:
                    color = FabricColor(
                        fabric_type_id=fabric.id,
                        name=color_data['name'],
                        hex_value=color_data['hex']
                    )
                    db.session.add(color)

                db.session.commit()
                print(f"Added {fabric_data['name']} fabric with default colors.")

        print("All fabrics added successfully.")

if __name__ == '__main__':
    add_sample_fabrics()
