"""Product calculations and DXF generation dispatch.

Auto-discovers product modules and provides unified dispatch for:
- Calculations (pricing, nesting, etc.)
- DXF generation

Each product folder (COVER, RECTANGLES, SHADE_SAIL, etc.) should export:
- calculate(data: dict) -> dict
- generate_dxf(nest, nested_panels, filename, product_dims) -> Flask response
"""
import importlib
import pkgutil
from typing import Dict, Callable, Optional


# Auto-discover all product modules in this package
_CALCULATORS_BY_NAME: Dict[str, Callable[[dict], dict]] = {}
_DXF_GENERATORS_BY_NAME: Dict[str, Callable] = {}

for finder, name, ispkg in pkgutil.iter_modules(__path__, prefix=__name__ + "."):
    if not ispkg:
        continue
    
    module_name = name.split(".")[-1]
    if module_name.startswith("_"):
        continue
    
    try:
        module = importlib.import_module(name)
        product_type = module_name.upper()
        
        if hasattr(module, "calculate"):
            _CALCULATORS_BY_NAME[product_type] = module.calculate
        
        if hasattr(module, "generate_dxf"):
            _DXF_GENERATORS_BY_NAME[product_type] = module.generate_dxf
    except Exception as e:
        print(f"[PRODUCTS] Failed to import {name}: {e}")


def get_calculators_by_id() -> Dict[int, Callable[[dict], dict]]:
    """Build a mapping of Product.id -> calculator function from the database."""
    from models import Product
    
    calculators_by_id = {}
    try:
        products = Product.query.all()
        for product in products:
            calc = _CALCULATORS_BY_NAME.get((product.name or "").upper())
            if calc:
                calculators_by_id[product.id] = calc
    except Exception as e:
        print(f"[PRODUCTS] Failed to build calculator map: {e}")
    
    return calculators_by_id


def get_dxf_generators_by_id() -> Dict[int, Callable]:
    """Build a mapping of Product.id -> DXF generator function from the database."""
    from models import Product
    
    generators_by_id = {}
    try:
        products = Product.query.all()
        for product in products:
            gen = _DXF_GENERATORS_BY_NAME.get((product.name or "").upper())
            if gen:
                generators_by_id[product.id] = gen
    except Exception as e:
        print(f"[PRODUCTS] Failed to build DXF generator map: {e}")
    
    return generators_by_id


def dispatch_calculation(product_type: str, data: dict) -> dict:
    """Dispatch calculation to the appropriate product module by name.
    
    Args:
        product_type: Product type name (e.g., "cover", "shade_sail")
        data: Calculation payload
    
    Returns:
        Mutated data dict with calculated fields
    """
    func = _CALCULATORS_BY_NAME.get((product_type or "").upper())
    if func:
        return func(data)
    print(f"[PRODUCTS] No calculator for product type: {product_type}")
    return data


def dispatch_calculation_by_id(product_id: int, data: dict) -> dict:
    """Dispatch calculation to the appropriate product module by Product ID.
    
    Args:
        product_id: Database Product ID
        data: Calculation payload
    
    Returns:
        Mutated data dict with calculated fields
    """
    calculators = get_calculators_by_id()
    func = calculators.get(product_id)
    if func:
        return func(data)
    print(f"[PRODUCTS] No calculator for product ID: {product_id}")
    return data


def dispatch_dxf(product_type: str, nest: dict, nested_panels: dict, 
                 download_name: str, product_dims: dict):
    """Dispatch DXF generation to the appropriate product module by name.
    
    Args:
        product_type: Product type name (e.g., "cover", "shade_sail")
        nest: Nesting result
        nested_panels: Panel metadata
        download_name: DXF filename
        product_dims: Product dimensions map
    
    Returns:
        Flask send_file response or error
    
    Raises:
        ValueError: If no DXF generator exists for the product type
    """
    func = _DXF_GENERATORS_BY_NAME.get((product_type or "").upper())
    if not func:
        raise ValueError(f"No DXF generator for product type: {product_type}")
    return func(nest, nested_panels, download_name, product_dims)


def dispatch_dxf_by_id(product_id: int, nest: dict, nested_panels: dict,
                       download_name: str, product_dims: dict):
    """Dispatch DXF generation to the appropriate product module by Product ID.
    
    Args:
        product_id: Database Product ID
        nest: Nesting result
        nested_panels: Panel metadata
        download_name: DXF filename
        product_dims: Product dimensions map
    
    Returns:
        Flask send_file response or error
    
    Raises:
        ValueError: If no DXF generator exists for the product ID
    """
    generators = get_dxf_generators_by_id()
    func = generators.get(product_id)
    if not func:
        raise ValueError(f"No DXF generator for product ID: {product_id}")
    return func(nest, nested_panels, download_name, product_dims)


# Expose available product types
def available_calculators() -> list[str]:
    """Return list of product types with calculation support."""
    return sorted(_CALCULATORS_BY_NAME.keys())


def available_dxf_generators() -> list[str]:
    """Return list of product types with DXF generation support."""
    return sorted(_DXF_GENERATORS_BY_NAME.keys())


__all__ = [
    "dispatch_calculation",
    "dispatch_calculation_by_id",
    "dispatch_dxf",
    "dispatch_dxf_by_id",
    "get_calculators_by_id",
    "get_dxf_generators_by_id",
    "available_calculators",
    "available_dxf_generators",
]
