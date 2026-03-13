import importlib.util
from pathlib import Path

_dir = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("autodraw_configs", _dir / "autodraw_configs.py")
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
SHADE_SAIL_AUTODRAW_CONFIG = _mod.SHADE_SAIL_AUTODRAW_CONFIG

PRODUCTS = [
    {
        "name": "COVER",
        "description": "Covers for various products",
        "schema": {
            "Combined": [
                {"description": "Price List", "quantity": "1", "type": "row",
                 "unitCost": "length * 0.10470337 + width * 0.06595973 + height * 0.08644519 + 111.16780488 + (55 if stayputs else 0)"}
            ],
            "_constants": {"contingencyPercent": 0, "marginPercent": 0},
        },
    },
    {
        "name": "SHADE_SAIL",
        "description": "Shadesail in mesh or PVC",
        "autodraw_config": SHADE_SAIL_AUTODRAW_CONFIG,
        "schema": {
            "Combined": [
                {"description": "Membrane", "quantity": "1", "type": "row", "unitCost": "fabricPrice"},
                {"description": "4mm Cable", "type": "row", "unitCost": "3",
                 "quantity": "(edgeMeter or 0) - (totalTraceLengthCeilMeters or 0) - (totalSailLengthCeilMeters or 0) if cableSize == 4 else 0"},
                {"description": "5mm Cable", "type": "row", "unitCost": "4.5",
                 "quantity": "(edgeMeter or 0) - (totalTraceLengthCeilMeters or 0) - (totalSailLengthCeilMeters or 0) if cableSize == 5 else 0"},
                {"description": "6mm Cable", "type": "row", "unitCost": "5.5",
                 "quantity": "(edgeMeter or 0) - (totalTraceLengthCeilMeters or 0) - (totalSailLengthCeilMeters or 0) if cableSize == 6 else 0"},
                {"description": "8mm Cable", "type": "row", "unitCost": "9.5",
                 "quantity": "(edgeMeter or 0) - (totalTraceLengthCeilMeters or 0) - (totalSailLengthCeilMeters or 0) if cableSize == 8 else 0"},
                {"description": "Sailtrack Corner", "type": "row", "unitCost": "28",
                 "quantity": "fittingCounts.get('Sailtrack Corner', 0)"},
                {"description": "Pro-Rig or Ezy Slide", "type": "row", "unitCost": "36",
                 "quantity": "(fittingCounts.get('Pro-Rig', 0)) + (fittingCounts.get('Ezy Slide', 0))"},
                {"description": "Pro-Rig with Small Pipe", "type": "row", "unitCost": "50",
                 "quantity": "fittingCounts.get('Pro-Rig with Small Pipe', 0)"},
                {"description": "Keder/Rope Edge/Spline per lm", "type": "row", "unitCost": "10",
                 "quantity": "totalSailLengthCeilMeters or 0"},
                {"description": "Trace cable set up", "type": "row", "unitCost": "15",
                 "quantity": "len(traceCables) if traceCables else 0"},
            ],
            "_constants": {"contingencyPercent": 0, "marginPercent": 0},
        },
    },
    {
        "name": "RECTANGLES",
        "description": "Arbitrary rectangles for testing",
        "schema": {
            "_constants": {"contingencyPercent": 0, "marginPercent": 0},
        },
    },
    {
        "name": "TARPAULIN",
        "description": "Tarpaulins with pocket",
        "schema": {
            "Combined": [
                {"description": "Tarpaulin", "quantity": "1", "type": "row",
                 "unitCost": "final_length * final_width * 0.0001"},
            ],
            "_constants": {"contingencyPercent": 0, "marginPercent": 0},
        },
    },
]
