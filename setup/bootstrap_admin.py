# setup/bootstrap_admin.py
from __future__ import annotations
import os
import sys
from pathlib import Path

# --- Repo root and import path ---
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from models import db, User, Product, EstimatingSchema  # noqa: E402

def bootstrap_admin():
    from passlib.hash import bcrypt

    username = os.getenv("ADMIN_USERNAME", "admin")
    email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    password = os.getenv("ADMIN_PASSWORD", "admin")

    existing = User.query.filter_by(username=username).first()
    if existing:
        print(f"Admin user '{username}' already exists (id={existing.id}).")
        return

    user = User( 
        username=username,
        password_hash=bcrypt.hash(password),
        role="admin",
        verified=True,
        email=email,
    )
    db.session.add(user)
    db.session.commit()
    print(f"✅ Bootstrapped admin user '{username}' successfully (id={user.id}).")



SHADE_SAIL_AUTODRAW_CONFIG = {
    "stepCount": 11,
    "steps": [
        {
            "key": "structure",
            "label": "Structure",
            "show": [
                {"query": "ad_layer", "value": "STRUCTURE"},
                {"query": "ad_layer", "value": "WORKMODEL"}
            ],
            "substeps": [
                {
                    "key": "draw_ext_structure",
                    "label": "Draw external structure",
                    "method": "Draw the external frame/posts",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "gen_wp",
                    "label": "Generate workpoints (Distance)",
                    "method": "Generate and connect workpoints between attachment point and average of distance according to hardware",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "membrane",
            "label": "Membrane",
            "show": [
                {"query": "ad_layer", "value": "WORKMODEL"},
                {"query": "ad_layer", "value": "PANELMESH"}
            ],
            "substeps": [
                {
                    "key": "gen_panelmesh",
                    "label": "Generate PANELMESH",
                    "method": "Generate mesh from work model",
                    "software": "direct",
                    "automated": False
                }
            ]
        },
        {
            "key": "pattern",
            "label": "Pattern",
            "show": [
                {"query": "ad_layer", "value": "PANELMESH"},
                {"query": "ad_layer", "value": "PANELMEMBRANE"}
            ],
            "substeps": [
                {
                    "key": "gen_panelmembrane",
                    "label": "Generate PANELMEMBRANE",
                    "method": "Generate 2d membrane from mesh",
                    "software": "direct",
                    "automated": False
                }
            ]
        },
        {
            "key": "cable",
            "label": "Cable",
            "show": [
                {"query": "ad_layer", "value": "PANELMEMBRANE"},
                {"query": "ad_layer", "value": "CABLE"},
                {"query": "ad_layer", "value": "HARDWARE"}
            ],
            "substeps": [
                {
                    "key": "bisect_hardware",
                    "label": "Bisect with Hardware",
                    "method": "Bisect corner with HARDWARE",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "draw_cable",
                    "label": "Draw CABLE",
                    "method": "Draw appropriate shapes between edges of hardware",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "gen_cablesection",
                    "label": "Generate cableSection",
                    "method": "Generate cableSection attribute",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "calc_ufc_dist",
                    "label": "Calculate UFC distance",
                    "method": "Calculate distance on UFC diagonals",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "compensation",
            "label": "Compensation",
            "show": [
                {"query": "ad_layer", "value": "HARDWARE"},
                {"query": "ad_layer", "value": "CABLE"},
                {"query": "ad_layer", "value": "COMPENSATEDMODEL"}
            ],
            "substeps": [
                {
                    "key": "gen_comp_model",
                    "label": "Generate COMPENSATEDMODEL",
                    "method": "Generate model scaling appropriately",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "pockets",
            "label": "Pockets",
            "show": [
                {"query": "ad_layer", "value": "COMPENSATEDMODEL"},
                {"query": "ad_layer", "value": "POCKET"},
                {"query": "ad_layer", "value": "WHEEL"},
                {"query": "ad_layer", "value": "PERIMITER"}
            ],
            "substeps": [
                {
                    "key": "offset_cable",
                    "label": "Offset cable edges",
                    "method": "Offset cable edges by pocket size on PERIMITER (Layer: WHEEL)",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "offset_track",
                    "label": "Offset track edges",
                    "method": "Offset track edges appropriately, space matchmarks according to scale",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "draw_pocket_corners",
                    "label": "Draw POCKET corners",
                    "method": "Draw appropriate corners on POCKET",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "draw_pocket_labels",
                    "label": "Draw POCKET labels",
                    "method": "Draw corner and exit labels on POCKET (Layer: PEN)",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "seams",
            "label": "Seams",
            "show": [
                 {"query": "ad_layer", "value": "PERIMITER"},
                 {"query": "ad_layer", "value": "SEAM"}
            ],
            "substeps": [
                {
                    "key": "draw_seams",
                    "label": "Draw seams",
                    "method": "Draw appropriate seams on SEAM",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "panels",
            "label": "Panels",
            "show": [
                {"query": "ad_layer", "value": "POCKET"},
                {"query": "ad_layer", "value": "SEAM"},
                {"query": "ad_layer", "value": "CUTPANELS"}
            ],
            "substeps": [
                {
                    "key": "gen_cutpanels",
                    "label": "Generate CUTPANELS",
                    "method": "Generate CUTPANELS with POCKET and SEAM",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "gen_cutting_panels",
                    "label": "Generate cutting panels",
                    "method": "Generate panels for cutting on CUTPANELS considering seam allowance",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "add_matchmarks",
                    "label": "Add match marks",
                    "method": "Add match marks on seams on CUTPANELS (Layer: PEN)",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "add_seam_labels",
                    "label": "Add seam labels",
                    "method": "Add seam labels on CUTPANELS (Layer: PEN)",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "gen_doublers",
                    "label": "Generate doublers",
                    "method": "Generate doublers on CUTPANELS",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "calc_ufc_len",
                    "label": "Calculate UFC length",
                    "method": "Calculate total UFC length required on CUTPANELS",
                    "software": "direct",
                    "automated": True
                },
                {
                    "key": "mark_ufc",
                    "label": "Mark UFC lines",
                    "method": "Mark lines for UFC",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "nest",
            "label": "Nest",
            "show": [
                 {"query": "ad_layer", "value": "CUTPANELS"},
                 {"query": "ad_layer", "value": "PLOT"},
                 {"query": "ad_layer", "value": "PLOTLABELS"}
            ],
            "substeps": [
                {
                    "key": "nest_panels",
                    "label": "Nest panels",
                    "method": "Nest panels within fabric dimensions minimising usage on PLOT",
                    "software": "direct",
                    "automated": False
                },
                {
                    "key": "mirror_plot",
                    "label": "Mirror PLOT",
                    "method": "If pockets are underside, mirror PLOT",
                    "software": "direct",
                    "automated": False
                },
                {
                    "key": "draw_plot_labels",
                    "label": "Draw PLOT labels",
                    "method": "Draw larger labels on PLOTLABELS",
                    "software": "direct",
                    "automated": False
                },
                {
                    "key": "nest_ufc",
                    "label": "Nest UFC",
                    "method": "Determine UFC fit and nest appropriately",
                    "software": "direct",
                    "automated": False
                }
            ]
        },
        {
            "key": "client_drawing",
            "label": "Client Drawing",
            "show": [
                {"query": "ad_layer", "value": "POCKET"},
                {"query": "ad_layer", "value": "SEAM"},
                {"query": "ad_layer", "value": "CLIENTDRAWING"}
            ],
            "substeps": [
                {
                    "key": "draw_client_details",
                    "label": "Draw client details",
                    "method": "Draw corner details on CLIENTDRAWING",
                    "software": "direct",
                    "automated": True
                }
            ]
        },
        {
            "key": "floor_drawing",
            "label": "Floor Drawing",
            "show": [
                {"query": "ad_layer", "value": "POCKET"},
                {"query": "ad_layer", "value": "SEAM"},
                {"query": "ad_layer", "value": "FLOORDRAWING"}
            ],
            "substeps": [
                {
                    "key": "draw_floor_details",
                    "label": "Draw floor details",
                    "method": "Draw sail details (corner, dim, exit, logo, keder, tabs, trace, ufc, links) on FLOORDRAWING",
                    "software": "direct",
                    "automated": True
                }
            ]
        }
    ]
}


COVER_DEFAULT_SCHEMA_REAL = {
    "_constants": {
        "contingencyPercent": 3,
        "marginPercent": 45,
    },
    "Materials": [
        {
            "type": "sku",
            "sku": "2-DR-F-225",
            "quantity": "Math.ceil((flatMainWidth + flatSideWidth)/1000)",
        },
        {
            "type": "sku",
            "sku": "2-DR-H-113",
            "quantity": "2 * Math.ceil(height / 1000)",
        },
        {
            "type": "sku",
            "sku": "2-DR-H-001-N",
            "quantity": "2 * Math.ceil(height / 1000)",
        },
    ],
    "Labour": [
        {
            "type": "row",
            "description": "Design",
            "quantity": 0.5,
            "unitCost": 55,
        },
        {
            "type": "row",
            "description": "Total cut length",
            "quantity": "Math.ceil((flatMainWidth + flatMainHeight + flatSideWidth + flatSideHeight)/1000)",
            "unitCost": 0,
        },
        {
            "type": "row",
            "description": "Cutting/Plotting",
            "quantity": "((1/3) + Math.ceil((flatMainWidth + flatMainHeight + flatSideWidth + flatSideHeight)/1000) * (1/60)).toFixed(2)",
            "unitCost": 55,
        },
        {
            "type": "row",
            "description": "Sewing",
            "quantity": "1",
            "unitCost": 55,
        },
        {
            "type": "row",
            "description": "Welding",
            "quantity": "1",
            "unitCost": 55,
        },
        {
            "type": "row",
            "description": "QA",
            "quantity": 0.5,
            "unitCost": 55,
        },
        {
            "type": "row",
            "description": "Packing up",
            "quantity": 0.5,
            "unitCost": 55,
        },
    ],
}

COVER_DEFAULT_SCHEMA = {

  "Combined": [
    {
      "description": "Price List",
      "quantity": "1",
      "type": "row",
      "unitCost": "length * 0.10470337 + width * 0.06595973 + height * 0.08644519 + 111.16780488 + (stayputs ? 55 : 0)"
    }

  ],
  "_constants": {
    "contingencyPercent": 0,
    "marginPercent": 0
  }
}

SHADE_SAIL_DEFAULT_SCHEMA = {

  "Combined": [
    {
      "description": "Membrane",
      "quantity": "1",
      "type": "row",
      "unitCost": "fabricPrice"
    },
    {
      "description": "4mm Cable",
      "quantity": "cableSize === 4 ? (edgeMeter || 0) - (totalTraceLengthCeilMeters || 0) - (totalSailLengthCeilMeters || 0) : 0",
      "type": "row",
      "unitCost": "3"
    },
    {
      "description": "5mm Cable",
      "quantity": "cableSize === 5 ? (edgeMeter || 0) - (totalTraceLengthCeilMeters || 0) - (totalSailLengthCeilMeters || 0) : 0",
      "type": "row",
      "unitCost": "4.5"
    },
    {
      "description": "6mm Cable",
      "quantity": "cableSize === 6 ? (edgeMeter || 0)  - (totalTraceLengthCeilMeters || 0) - (totalSailLengthCeilMeters || 0) : 0",
      "type": "row",
      "unitCost": "5.5"
    },
    {
      "description": "8mm Cable",
      "quantity": "cableSize === 8 ? (edgeMeter || 0) - (totalTraceLengthCeilMeters || 0) - (totalSailLengthCeilMeters || 0) : 0",
      "type": "row",
      "unitCost": "9.5"
    },
    {
      "description": "Sailtrack Corner",
      "quantity": "fittingCounts['Sailtrack Corner'] || 0",
      "type": "row",
      "unitCost": "28"
    },
    {
      "description": "Pro-Rig or Ezy Slide",
      "quantity": "(fittingCounts['Pro-Rig'] || 0) + (fittingCounts['Ezy Slide'] || 0)",
      "type": "row",
      "unitCost": "36"
    },
    {
      "description": "Pro-Rig with Small Pipe",
      "quantity": "(fittingCounts['Pro-Rig with Small Pipe'] || 0)",
      "type": "row",
      "unitCost": "50"
    },
    {
      "description": "Keder/Rope Edge/Spline per lm",
      "quantity": "totalSailLengthCeilMeters || 0",
      "type": "row",
      "unitCost": "10"
    },
    {
      "description": "Trace cable set up",
      "quantity": "traceCables.length || 0",
      "type": "row",
      "unitCost": "15"
    }
  ],
  "_constants": {
    "contingencyPercent": 0,
    "marginPercent": 0
  }
}

RECTANGLES_DEFAULT_SCHEMA = {
  "_constants": {
    "contingencyPercent": 0,
    "marginPercent": 0
  }
}


def bootstrap_products():
    """Bootstrap default Product records and their default estimating schemas."""

    # --- 1. Ensure COVER product exists ---
    cover = Product.query.filter_by(name="COVER").first()
    if not cover:
        cover = Product(
            name="COVER",
            description="Covers for various products",
        )
        db.session.add(cover)
        db.session.flush()  # get cover.id
        print(f"Bootstrapped Product 'COVER' (id={cover.id}).")
    else:
        print(f"Product 'COVER' already exists (id={cover.id}).")

    # --- 2. Ensure SHADE_SAIL product exists ---
    shade_sail = Product.query.filter_by(name="SHADE_SAIL").first()
    if not shade_sail:
        shade_sail = Product(
            name="SHADE_SAIL",
            description="Shadesail in mesh or PVC",
            autodraw_config=SHADE_SAIL_AUTODRAW_CONFIG,
        )
        db.session.add(shade_sail)
        db.session.flush()  # get shade_sail.id
        print(f"Bootstrapped Product 'SHADE_SAIL' (id={shade_sail.id}).")
    else:
        # Ensure config is up to date
        shade_sail.autodraw_config = SHADE_SAIL_AUTODRAW_CONFIG
        print(f"Updated autodraw_config for Product 'SHADE_SAIL' (id={shade_sail.id}).")

    # --- 3. Ensure RECTANGLES product exists ---
    rectangles = Product.query.filter_by(name="RECTANGLES").first()
    if not rectangles:
        rectangles = Product(
            name="RECTANGLES",
            description="Arbitrary rectangles for testing",
        )
        db.session.add(rectangles)
        db.session.flush()  # get rectangles.id
        print(f"Bootstrapped Product 'RECTANGLES' (id={rectangles.id}).")
    else:
        print(f"Product 'RECTANGLES' already exists (id={rectangles.id}).")

    # --- 4. Ensure default COVER schema exists ---
    cover_schema = (
        EstimatingSchema.query
        .filter_by(product_id=cover.id, name="COVER default v1")
        .first()
    )
    if not cover_schema:
        cover_schema = EstimatingSchema(
            product_id=cover.id,
            name="COVER default v1",
            data=COVER_DEFAULT_SCHEMA,
            is_default=True,
            version=1,
        )
        db.session.add(cover_schema)
        db.session.flush()
        print(f"Created default schema for 'COVER' (schema id={cover_schema.id}).")
    else:
        print(f"Default schema for 'COVER' already exists (schema id={cover_schema.id}).")

    # Link COVER to its default schema if not already
    if cover.default_schema_id != cover_schema.id:
        cover.default_schema_id = cover_schema.id
        print(f"Set COVER.default_schema_id = {cover_schema.id}")

    # --- 5. Ensure stub SHADE_SAIL schema exists ---
    shade_schema = (
        EstimatingSchema.query
        .filter_by(product_id=shade_sail.id, name="SHADE_SAIL default v1")
        .first()
    )
    if not shade_schema:
        shade_schema = EstimatingSchema(
            product_id=shade_sail.id,
            name="SHADE_SAIL default v1",
            data=SHADE_SAIL_DEFAULT_SCHEMA,
            is_default=True,
            version=1,
        )
        db.session.add(shade_schema)
        db.session.flush()
        print(f"Created stub default schema for 'SHADE_SAIL' (schema id={shade_schema.id}).")
    else:
        print(f"Default schema for 'SHADE_SAIL' already exists (schema id={shade_schema.id}).")

    # Link SHADE_SAIL to its default schema if not already
    if shade_sail.default_schema_id != shade_schema.id:
        shade_sail.default_schema_id = shade_schema.id
        print(f"Set SHADE_SAIL.default_schema_id = {shade_schema.id}")

    # --- 6. Ensure stub RECTANGLES schema exists ---
    rectangles_schema = (
        EstimatingSchema.query
        .filter_by(product_id=rectangles.id, name="RECTANGLES default v1")
        .first()
    )
    if not rectangles_schema:
        rectangles_schema = EstimatingSchema(
            product_id=rectangles.id,
            name="RECTANGLES default v1",
            data=RECTANGLES_DEFAULT_SCHEMA,
            is_default=True,
            version=1,
        )
        db.session.add(rectangles_schema)
        db.session.flush()
        print(f"Created stub default schema for 'RECTANGLES' (schema id={rectangles_schema.id}).")
    else:
        print(f"Default schema for 'RECTANGLES' already exists (schema id={rectangles_schema.id}).")

    # Link RECTANGLES to its default schema if not already
    if rectangles.default_schema_id != rectangles_schema.id:
        rectangles.default_schema_id = rectangles_schema.id
        print(f"Set RECTANGLES.default_schema_id = {rectangles_schema.id}")

    db.session.commit()
    print("Bootstrap complete.")



if __name__ == "__main__":
    from flask import Flask
    instance_dir = BASE_DIR / "instance"
    instance_dir.mkdir(parents=True, exist_ok=True)

    db_path = instance_dir / "autodraw.db"
    db_uri = f"sqlite:///{db_path.as_posix()}"

    app = Flask(__name__, instance_path=str(instance_dir), instance_relative_config=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    with app.app_context():
        # Show where we’re writing so there’s no ambiguity
        print(f"SQLALCHEMY_DATABASE_URI = {app.config.get('SQLALCHEMY_DATABASE_URI')}")
        # Ensure tables exist, then insert admin if needed
        db.create_all()
        bootstrap_admin()
        bootstrap_products()
