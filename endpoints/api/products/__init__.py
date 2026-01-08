"""Product calculations and Document generation dispatch.

Auto-discovers product modules and provides unified dispatch for:
- Calculations (pricing, nesting, etc.)
- Document generation (PDF, DXF, etc.) via 'generators' folder

Each product folder (COVER, RECTANGLES, SHADE_SAIL, etc.) should contain:
- calculations.py: exporting calculate(data: dict) -> dict
- generators/: Folder containing generator modules.
    Each generator module must export:
    - get_metadata() -> dict: { "id": str, "name": str, "type": str }
    - generate(project, **kwargs) -> Flask response
"""
import importlib
import os
import sys
from typing import Dict, Callable, Any, List

# Auto-discover all product modules in this package
_CALCULATORS_BY_NAME: Dict[str, Callable[[dict], dict]] = {}
_GENERATORS_REGISTRY: Dict[str, Dict[str, Callable]] = {}
_AVAILABLE_DOCUMENTS_BY_NAME: Dict[str, list] = {}

# Legacy support
_DXF_GENERATORS_BY_NAME: Dict[str, Callable] = {}
_PDF_GENERATORS_BY_NAME: Dict[str, Callable] = {}

_PRODUCTS_DIR = os.path.dirname(__file__)
_PRODUCT_DIR_NAMES: Dict[str, str] = {}


def _load_generators(product_type: str, product_dir_name: str):
    """Dynamically scan and load generators for a product."""
    generators_dir = os.path.join(_PRODUCTS_DIR, product_dir_name, "generators")
    product_generators = {}
    product_docs_metadata = []
    
    if os.path.isdir(generators_dir):
        for gen_file in os.scandir(generators_dir):
            if gen_file.is_file() and gen_file.name.endswith(".py") and not gen_file.name.startswith("_"):
                try:
                    module_name = f"endpoints.api.products.{product_dir_name}.generators.{gen_file.name[:-3]}"
                    
                    if module_name in sys.modules:
                        mod = importlib.reload(sys.modules[module_name])
                    else:
                        mod = importlib.import_module(module_name)
                    
                    if hasattr(mod, "get_metadata") and hasattr(mod, "generate"):
                        meta = mod.get_metadata()
                        doc_id = meta.get("id")
                        if doc_id:
                            product_generators[doc_id] = mod.generate
                            product_docs_metadata.append(meta)
                except Exception as e:
                    # In dev, this might print often if invalid syntax
                    print(f"[PRODUCTS] Failed to load generator {gen_file.name} for {product_dir_name}: {e}")

    # Register found generators
    if product_generators:
        _GENERATORS_REGISTRY[product_type] = product_generators
        _AVAILABLE_DOCUMENTS_BY_NAME[product_type] = product_docs_metadata
    else:
        # Fallback to legacy if no new generators found
        docs = []
        if product_type in _DXF_GENERATORS_BY_NAME:
            docs.append({"id": "dxf", "name": "DXF File", "type": "dxf"})
        if product_type in _PDF_GENERATORS_BY_NAME:
            docs.append({"id": "pdf", "name": "PDF File", "type": "pdf"})
        
        if docs:
            _AVAILABLE_DOCUMENTS_BY_NAME[product_type] = docs
        elif product_type in _AVAILABLE_DOCUMENTS_BY_NAME:
             # If previously populated but now empty, clear it
             if product_type in _AVAILABLE_DOCUMENTS_BY_NAME:
                 del _AVAILABLE_DOCUMENTS_BY_NAME[product_type]
             if product_type in _GENERATORS_REGISTRY:
                 del _GENERATORS_REGISTRY[product_type]


def _initialize_products():
    """Initial scan for products folders and static components."""
    for entry in os.scandir(_PRODUCTS_DIR):
        if entry.is_dir() and not entry.name.startswith("_") and not entry.name == "__pycache__":
            product_type = entry.name.upper()
            _PRODUCT_DIR_NAMES[product_type] = entry.name
            
            # 1. Import calculations.py
            try:
                calc_module_name = f"endpoints.api.products.{entry.name}.calculations"
                calc_module = importlib.import_module(calc_module_name)
                if hasattr(calc_module, "calculate"):
                    _CALCULATORS_BY_NAME[product_type] = calc_module.calculate
            except ImportError:
                pass 
            except Exception as e:
                print(f"[PRODUCTS] Failed to import calculations for {entry.name}: {e}")

            # 2. Legacy Fallback (dxf.py, pdf.py) - Scan once
            try:
                dxf_module_name = f"endpoints.api.products.{entry.name}.dxf"
                dxf_module = importlib.import_module(dxf_module_name)
                if hasattr(dxf_module, "generate_dxf"):
                    _DXF_GENERATORS_BY_NAME[product_type] = dxf_module.generate_dxf
            except ImportError:
                pass
            except Exception:
                pass

            try:
                pdf_module_name = f"endpoints.api.products.{entry.name}.pdf"
                pdf_module = importlib.import_module(pdf_module_name)
                if hasattr(pdf_module, "generate_pdf"):
                    _PDF_GENERATORS_BY_NAME[product_type] = pdf_module.generate_pdf
            except ImportError:
                pass
            except Exception:
                pass

            # Initial load of generators
            _load_generators(product_type, entry.name)

# Run initialization
_initialize_products()


def dispatch_calculation(product_type: str, data: dict) -> dict:
    """Dispatch calculation to the appropriate product module by name."""
    func = _CALCULATORS_BY_NAME.get((product_type or "").upper())
    if func:
        return func(data)
    # print(f"[PRODUCTS] No calculation for product type: {product_type}")
    return data


def dispatch_document(product_type: str, doc_id: str, project, **kwargs):
    """Dispatch document generation to the appropriate product module."""
    pt = (product_type or "").upper()
    
    # Try generic load first to ensure up-to-date
    if pt in _PRODUCT_DIR_NAMES:
        _load_generators(pt, _PRODUCT_DIR_NAMES[pt])

    # 1. Try new generator registry
    if pt in _GENERATORS_REGISTRY:
        generators = _GENERATORS_REGISTRY[pt]
        if doc_id in generators:
            return generators[doc_id](project, **kwargs)
    
    # 2. Legacy Fallback
    if doc_id == "dxf" and pt in _DXF_GENERATORS_BY_NAME:
        return _DXF_GENERATORS_BY_NAME[pt](project, f"{pt}_legacy.dxf")

    if doc_id == "pdf" and pt in _PDF_GENERATORS_BY_NAME:
        return _PDF_GENERATORS_BY_NAME[pt](project)

    raise ValueError(f"No document generator for product type: {product_type}, document: {doc_id}")


def get_product_documents(product_type: str) -> list:
    """Get list of available documents for a product type."""
    pt = (product_type or "").upper()
    
    # Refresh logic
    if pt in _PRODUCT_DIR_NAMES:
        _load_generators(pt, _PRODUCT_DIR_NAMES[pt])
        
    return _AVAILABLE_DOCUMENTS_BY_NAME.get(pt, [])


def get_product_capabilities(product_type: str) -> dict:
    """Get the capabilities (calc, dxf, pdf) for a given product type."""
    pt = (product_type or "").upper()
    return {
        "has_calculator": pt in _CALCULATORS_BY_NAME,
        "documents": get_product_documents(pt)
    }

# Expose available product types
def available_calculators() -> list:
    return sorted(_CALCULATORS_BY_NAME.keys())

def available_dxf_generators() -> list:
    return sorted(_DXF_GENERATORS_BY_NAME.keys())

def dispatch_dxf(product_type: str, project, **kwargs):
    """Legacy wrapper for dispatch_dxf."""
    return dispatch_document(product_type, "dxf", project, **kwargs)

__all__ = [
    "dispatch_calculation",
    "dispatch_document",
    "get_product_documents",
    "dispatch_dxf",
    "available_calculators",
    "available_dxf_generators",
    "get_product_capabilities"
]
