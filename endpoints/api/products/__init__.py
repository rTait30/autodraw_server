"""Product calculations and document generation dispatch.

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
from typing import Dict, Callable

_CALCULATORS_BY_NAME: Dict[str, Callable[[dict], dict]] = {}
_GENERATORS_REGISTRY: Dict[str, Dict[str, Callable]] = {}
_AVAILABLE_DOCUMENTS_BY_NAME: Dict[str, list] = {}

_PRODUCTS_DIR = os.path.dirname(__file__)
_PRODUCT_DIR_NAMES: Dict[str, str] = {}


def _load_generators(product_type: str, product_dir_name: str):
    """Scan and load generators for a product from its generators/ folder."""
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
                    print(f"[PRODUCTS] Failed to load generator {gen_file.name} for {product_dir_name}: {e}")

    _GENERATORS_REGISTRY[product_type] = product_generators
    _AVAILABLE_DOCUMENTS_BY_NAME[product_type] = product_docs_metadata


def _initialize_products():
    """Scan product folders and load calculations and generators."""
    for entry in os.scandir(_PRODUCTS_DIR):
        if entry.is_dir() and not entry.name.startswith("_") and entry.name != "__pycache__":
            product_type = entry.name.upper()
            _PRODUCT_DIR_NAMES[product_type] = entry.name

            try:
                calc_module = importlib.import_module(f"endpoints.api.products.{entry.name}.calculations")
                if hasattr(calc_module, "calculate"):
                    _CALCULATORS_BY_NAME[product_type] = calc_module.calculate
            except ImportError:
                pass
            except Exception as e:
                print(f"[PRODUCTS] Failed to import calculations for {entry.name}: {e}")

            _load_generators(product_type, entry.name)


_initialize_products()


def dispatch_calculation(product_type: str, data: dict) -> dict:
    """Dispatch calculation to the appropriate product module."""
    func = _CALCULATORS_BY_NAME.get((product_type or "").upper())
    return func(data) if func else data


def dispatch_document(product_type: str, doc_id: str, project, **kwargs):
    """Dispatch document generation to the appropriate generator module."""
    pt = (product_type or "").upper()

    # Reload generators to pick up any file changes
    if pt in _PRODUCT_DIR_NAMES:
        _load_generators(pt, _PRODUCT_DIR_NAMES[pt])

    generators = _GENERATORS_REGISTRY.get(pt, {})
    if doc_id in generators:
        return generators[doc_id](project, **kwargs)

    raise ValueError(f"No document generator for product type: {product_type}, document: {doc_id}")


def get_product_documents(product_type: str, include_staff_only: bool = True) -> list:
    """Return available document metadata for a product type."""
    pt = (product_type or "").upper()
    if pt in _PRODUCT_DIR_NAMES:
        _load_generators(pt, _PRODUCT_DIR_NAMES[pt])
    all_docs = _AVAILABLE_DOCUMENTS_BY_NAME.get(pt, [])
    if include_staff_only:
        return all_docs
    return [doc for doc in all_docs if doc.get("client_visible", False)]


def get_product_capabilities(product_type: str, include_staff_only: bool = True) -> dict:
    """Return capabilities dict for a product type."""
    pt = (product_type or "").upper()
    return {
        "has_calculator": pt in _CALCULATORS_BY_NAME,
        "documents": get_product_documents(pt, include_staff_only),
    }


def available_calculators() -> list:
    return sorted(_CALCULATORS_BY_NAME.keys())


__all__ = [
    "dispatch_calculation",
    "dispatch_document",
    "get_product_documents",
    "get_product_capabilities",
    "available_calculators",
]
