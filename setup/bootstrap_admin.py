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
    "stepCount": 5,
    "steps": [
        {
            "key": "structure",
            "label": "Structure",
            "show": [
                {"query": "ad_layer", "value": "STRUCTURE"},
            ],
            "substeps": [
                {
                    "key": "gen_structure",
                    "label": "Generate external structure",
                    "method": "Generate the external frame/posts",
                    "options": [
                        {
                            "key": "gen_structure",
                            "label": "Standard Frame",
                            "software": "direct",
                            "automated": True,
                            "is_default": True
                        }
                    ]
                },
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
                    "key": "gen_wm",
                    "label": "Generate workmodel",
                    "method": "Generate work points based on hardware distance and pull of membrane",
                    "options": [
                        {
                            "key": "gen_wm_centroid_method",
                            "label": "Centroid Method",
                            "software": "direct",
                            "automated": True,
                            "is_default": False
                        },
                        {
                            "key": "gen_wm_bisect_method",
                            "label": "Bisect Method",
                            "software": "direct",
                            "automated": True,
                            "is_default": True
                        }
                    ]
                },
                {
                    "key": "gen_panelmesh",
                    "label": "Generate PANELMESH",
                    "method": "Generate mesh from work model",
                    "options": [
                        {
                            "key": "std_mesh_gen",
                            "label": "Standard Mesh Gen",
                            "software": "direct",
                            "automated": False,
                            "is_default": True
                        }
                    ]
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
                    "options": [
                        {
                            "key": "std_flatten",
                            "label": "Standard Flatten",
                            "software": "direct",
                            "automated": False,
                            "is_default": True
                        }
                    ]
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
                    "options": [
                        {
                            "key": "std_bisect_hw",
                            "label": "Standard Bisect",
                            "software": "direct",
                            "automated": True,
                            "is_default": True
                        }
                    ]
                },
                {
                    "key": "draw_cable",
                    "label": "Draw CABLE",
                    "method": "Draw appropriate shapes between edges of hardware",
                    "options": [
                        {
                            "key": "std_draw_cable",
                            "label": "Standard Cable",
                            "software": "direct",
                            "automated": True,
                            "is_default": True
                        }
                    ]
                },
                {
                    "key": "gen_cablesection",
                    "label": "Generate cableSection",
                    "method": "Generate cableSection attribute",
                    "options": [
                        {
                            "key": "std_cable_sect",
                            "label": "Standard Section",
                            "software": "direct",
                            "automated": True,
                            "is_default": True
                        }
                    ]
                },
                {
                    "key": "calc_ufc_dist",
                    "label": "Calculate UFC distance",
                    "method": "Calculate distance on UFC diagonals",
                    "options": [
                        {
                            "key": "std_ufc_calc",
                            "label": "Standard Calculation",
                            "software": "direct",
                            "automated": True,
                            "is_default": True
                        }
                    ]
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
                    "options": [
                        {
                            "key": "std_compensation",
                            "label": "Standard Compensation",
                            "software": "direct",
                            "automated": True,
                            "is_default": True
                        }
                    ]
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
      "unitCost": "length * 0.10470337 + width * 0.06595973 + height * 0.08644519 + 111.16780488 + (55 if stayputs else 0)"
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
      "quantity": "(edgeMeter or 0) - (totalTraceLengthCeilMeters or 0) - (totalSailLengthCeilMeters or 0) if cableSize == 4 else 0",
      "type": "row",
      "unitCost": "3"
    },
    {
      "description": "5mm Cable",
      "quantity": "(edgeMeter or 0) - (totalTraceLengthCeilMeters or 0) - (totalSailLengthCeilMeters or 0) if cableSize == 5 else 0",
      "type": "row",
      "unitCost": "4.5"
    },
    {
      "description": "6mm Cable",
      "quantity": "(edgeMeter or 0)  - (totalTraceLengthCeilMeters or 0) - (totalSailLengthCeilMeters or 0) if cableSize == 6 else 0",
      "type": "row",
      "unitCost": "5.5"
    },
    {
      "description": "8mm Cable",
      "quantity": "(edgeMeter or 0) - (totalTraceLengthCeilMeters or 0) - (totalSailLengthCeilMeters or 0) if cableSize == 8 else 0",
      "type": "row",
      "unitCost": "9.5"
    },
    {
      "description": "Sailtrack Corner",
      "quantity": "fittingCounts.get('Sailtrack Corner', 0)",
      "type": "row",
      "unitCost": "28"
    },
    {
      "description": "Pro-Rig or Ezy Slide",
      "quantity": "(fittingCounts.get('Pro-Rig', 0)) + (fittingCounts.get('Ezy Slide', 0))",
      "type": "row",
      "unitCost": "36"
    },
    {
      "description": "Pro-Rig with Small Pipe",
      "quantity": "fittingCounts.get('Pro-Rig with Small Pipe', 0)",
      "type": "row",
      "unitCost": "50"
    },
    {
      "description": "Keder/Rope Edge/Spline per lm",
      "quantity": "totalSailLengthCeilMeters or 0",
      "type": "row",
      "unitCost": "10"
    },
    {
      "description": "Trace cable set up",
      "quantity": "len(traceCables) if traceCables else 0",
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

TARPAULIN_DEFAULT_SCHEMA = {
  "Combined": [
    {
      "description": "Tarpaulin",
      "quantity": "1",
      "type": "row",
      "unitCost": "final_length * final_width * 0.0001"  # Example: 0.0001 per mm²
    }
  ],
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

    # --- 4. Ensure TARPAULIN product exists ---
    tarpaulin = Product.query.filter_by(name="TARPAULIN").first()
    if not tarpaulin:
        tarpaulin = Product(
            name="TARPAULIN",
            description="Tarpaulins with pocket",
        )
        db.session.add(tarpaulin)
        db.session.flush()  # get tarpaulin.id
        print(f"Bootstrapped Product 'TARPAULIN' (id={tarpaulin.id}).")
    else:
        print(f"Product 'TARPAULIN' already exists (id={tarpaulin.id}).")

    # --- 5. Ensure default COVER schema exists ---
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
        # Update existing schema to new format if needed without creating duplicate
        if cover_schema.data != COVER_DEFAULT_SCHEMA:
             cover_schema.data = COVER_DEFAULT_SCHEMA
             print(f"Updated existing default schema for 'COVER' to new Python syntax.")
        else:
             print(f"Default schema for 'COVER' already exists matches current version.")

    # Link COVER to its default schema if not already
    if cover.default_schema_id != cover_schema.id:
        cover.default_schema_id = cover_schema.id
        print(f"Set COVER.default_schema_id = {cover_schema.id}")

    # --- 6. Ensure stub SHADE_SAIL schema exists ---
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
        # Update existing schema to new format
        if shade_schema.data != SHADE_SAIL_DEFAULT_SCHEMA:
            shade_schema.data = SHADE_SAIL_DEFAULT_SCHEMA
            print(f"Updated existing default schema for 'SHADE_SAIL' to new Python syntax.")
        else:
            print(f"Default schema for 'SHADE_SAIL' already exists and matches.")

    # Link SHADE_SAIL to its default schema if not already
    if shade_sail.default_schema_id != shade_schema.id:
        shade_sail.default_schema_id = shade_schema.id
        print(f"Set SHADE_SAIL.default_schema_id = {shade_schema.id}")

    # --- 7. Ensure stub RECTANGLES schema exists ---
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

    # --- 8. Ensure stub TARPAULIN schema exists ---
    tarpaulin_schema = (
        EstimatingSchema.query
        .filter_by(product_id=tarpaulin.id, name="TARPAULIN default v1")
        .first()
    )
    if not tarpaulin_schema:
        tarpaulin_schema = EstimatingSchema(
            product_id=tarpaulin.id,
            name="TARPAULIN default v1",
            data=TARPAULIN_DEFAULT_SCHEMA,
            is_default=True,
            version=1,
        )
        db.session.add(tarpaulin_schema)
        db.session.flush()
        print(f"Created stub default schema for 'TARPAULIN' (schema id={tarpaulin_schema.id}).")
    else:
        print(f"Default schema for 'TARPAULIN' already exists (schema id={tarpaulin_schema.id}).")

    # Link TARPAULIN to its default schema if not already
    if tarpaulin.default_schema_id != tarpaulin_schema.id:
        tarpaulin.default_schema_id = tarpaulin_schema.id
        print(f"Set TARPAULIN.default_schema_id = {tarpaulin_schema.id}")

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
