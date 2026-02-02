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
        # Define all fabrics (simplified, no specs or colors yet)
        fabrics_data = [
            {'name': 'Rainbow Z16', 'category': 'Shade'},
            {'name': 'Poly Fx', 'category': 'Shade'},
            {'name': 'Extreme 32', 'category': 'Shade'},
            {'name': 'Polyfab Xtra', 'category': 'Shade'},
            {'name': 'Tensitech 480', 'category': 'Shade'},
            {'name': 'Monotec 370', 'category': 'Shade'},
            {'name': 'DriZ', 'category': 'Shade'},
            {'name': 'Bochini', 'category': 'PVC'},
            {'name': 'Bochini Blockout', 'category': 'PVC'},
            {'name': 'Mehler FR580', 'category': 'PVC'},
            {'name': 'Ferrari 502S2', 'category': 'PVC'},
            {'name': 'Ferrari 502V3', 'category': 'PVC'}
        ]

        for fabric_data in fabrics_data:
            # Check if already exists
            if not FabricType.query.filter_by(name=fabric_data['name']).first():
                fabric = FabricType(
                    name=fabric_data['name'],
                    category=fabric_data['category'],
                    description="",
                    tech_specs={}
                )
                db.session.add(fabric)
                db.session.commit()
                print(f"Added {fabric_data['name']} fabric.")

        print("All fabrics processed.")

if __name__ == '__main__':
    add_sample_fabrics()
