"""Product calculations and DXF generation dispatch.

Auto-discovers product modules and provides unified dispatch for:
- Calculations (pricing, nesting, etc.)
- DXF generation

Each product folder (COVER, RECTANGLES, SHADE_SAIL, etc.) should contain:
- calculations.py: exporting calculate(data: dict) -> dict
- dxf.py: exporting generate_dxf(project, download_name: str) -> Flask response
"""
import importlib
import os
from typing import Dict, Callable


# Auto-discover all product modules in this package
_CALCULATORS_BY_NAME: Dict[str, Callable[[dict], dict]] = {}
_DXF_GENERATORS_BY_NAME: Dict[str, Callable] = {}

_PRODUCTS_DIR = os.path.dirname(__file__)

for entry in os.scandir(_PRODUCTS_DIR):
    if entry.is_dir() and not entry.name.startswith("_") and not entry.name == "__pycache__":
        product_type = entry.name.upper()
        
        # Try to import calculations.py
        try:
            # Construct module path: endpoints.api.products.<PRODUCT>.calculations
            calc_module_name = f"endpoints.api.products.{entry.name}.calculations"
            calc_module = importlib.import_module(calc_module_name)
            if hasattr(calc_module, "calculate"):
                _CALCULATORS_BY_NAME[product_type] = calc_module.calculate
        except ImportError:
            pass # No calculations module or failed to import
        except Exception as e:
            print(f"[PRODUCTS] Failed to import calculations for {entry.name}: {e}")

        # Try to import dxf.py
        try:
            dxf_module_name = f"endpoints.api.products.{entry.name}.dxf"
            dxf_module = importlib.import_module(dxf_module_name)
            if hasattr(dxf_module, "generate_dxf"):
                _DXF_GENERATORS_BY_NAME[product_type] = dxf_module.generate_dxf
        except ImportError:
            pass
        except Exception as e:
            print(f"[PRODUCTS] Failed to import dxf for {entry.name}: {e}")


def dispatch_calculation(product_type: str, data: dict) -> dict:
    """Dispatch calculation to the appropriate product module by name.
    
    Args:
        product_type: Product type name (e.g., "cover", "shade_sail")
        data: Full project data dict
    
    Returns:
        Mutated data dict with calculated fields
    """
    func = _CALCULATORS_BY_NAME.get((product_type or "").upper())
    if func:
        return func(data)
    print(f"[PRODUCTS] No calculator for product type: {product_type}")
    return data


def dispatch_dxf(product_type: str, project, download_name: str = None):
    """Dispatch DXF generation to the appropriate product module by name.
    
    Args:
        product_type: Product type name (e.g., "cover", "shade_sail")
        project: Full project object
        download_name: DXF filename (optional, defaults to product_type + ".dxf")
    
    Returns:
        Flask send_file response or error
    
    Raises:
        ValueError: If no DXF generator exists for the product type
    """
    func = _DXF_GENERATORS_BY_NAME.get((product_type or "").upper())
    if not func:
        raise ValueError(f"No DXF generator for product type: {product_type}")
    if download_name is None:
        download_name = product_type + ".dxf"
    # Pass the project through untouched; generators must accept plain dicts
    return func(project, download_name=download_name)


# Expose available product types
def available_calculators() -> list[str]:
    """Return list of product types with calculation support."""
    return sorted(_CALCULATORS_BY_NAME.keys())


def available_dxf_generators() -> list[str]:
    """Return list of product types with DXF generation support."""
    return sorted(_DXF_GENERATORS_BY_NAME.keys())


__all__ = [
    "dispatch_calculation",
    "dispatch_dxf",
    "available_calculators",
    "available_dxf_generators",
]
