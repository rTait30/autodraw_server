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
from typing import Dict, Callable, Any

# Auto-discover all product modules in this package
_CALCULATORS_BY_NAME: Dict[str, Callable[[dict], dict]] = {}
_GENERATORS_REGISTRY: Dict[str, Dict[str, Callable]] = {}
_AVAILABLE_DOCUMENTS_BY_NAME: Dict[str, list] = {}

# Legacy support
_DXF_GENERATORS_BY_NAME: Dict[str, Callable] = {}
_PDF_GENERATORS_BY_NAME: Dict[str, Callable] = {}

_PRODUCTS_DIR = os.path.dirname(__file__)

for entry in os.scandir(_PRODUCTS_DIR):
    if entry.is_dir() and not entry.name.startswith("_") and not entry.name == "__pycache__":
        product_type = entry.name.upper()
        
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

        # 2. Scan 'generators' folder (New System)
        generators_dir = os.path.join(entry.path, "generators")
        product_generators = {}
        product_docs_metadata = []

        if os.path.isdir(generators_dir):
            for gen_file in os.scandir(generators_dir):
                if gen_file.is_file() and gen_file.name.endswith(".py") and not gen_file.name.startswith("_"):
                    try:
                        module_name = f"endpoints.api.products.{entry.name}.generators.{gen_file.name[:-3]}"
                        mod = importlib.import_module(module_name)
                        if hasattr(mod, "get_metadata") and hasattr(mod, "generate"):
                            meta = mod.get_metadata()
                            doc_id = meta["id"]
                            product_generators[doc_id] = mod.generate
                            product_docs_metadata.append(meta)
                    except Exception as e:
                        print(f"[PRODUCTS] Failed to load generator {gen_file.name} for {entry.name}: {e}")

        if product_generators:
            _GENERATORS_REGISTRY[product_type] = product_generators
            _AVAILABLE_DOCUMENTS_BY_NAME[product_type] = product_docs_metadata
        
        # 3. Legacy Fallback (dxf.py, pdf.py)
        
        # Legacy DXF
        try:
            dxf_module_name = f"endpoints.api.products.{entry.name}.dxf"
            dxf_module = importlib.import_module(dxf_module_name)
            if hasattr(dxf_module, "generate_dxf"):
                _DXF_GENERATORS_BY_NAME[product_type] = dxf_module.generate_dxf
        except ImportError:
            pass
        except Exception as e:
            print(f"[PRODUCTS] Failed to import dxf for {entry.name}: {e}")

        # Legacy PDF
        try:
            pdf_module_name = f"endpoints.api.products.{entry.name}.pdf"
            pdf_module = importlib.import_module(pdf_module_name)
            if hasattr(pdf_module, "generate_pdf"):
                _PDF_GENERATORS_BY_NAME[product_type] = pdf_module.generate_pdf
        except ImportError:
            pass
        except Exception as e:
            print(f"[PRODUCTS] Failed to import pdf for {entry.name}: {e}")

        # If no new generators were found, populate available docs from legacy
        if not product_generators:
            docs = []
            if product_type in _DXF_GENERATORS_BY_NAME:
                docs.append({"id": "dxf", "name": "DXF File", "type": "dxf"})
            if product_type in _PDF_GENERATORS_BY_NAME:
                docs.append({"id": "pdf", "name": "PDF File", "type": "pdf"})
            if docs:
                _AVAILABLE_DOCUMENTS_BY_NAME[product_type] = docs


def dispatch_calculation(product_type: str, data: dict) -> dict:
    """Dispatch calculation to the appropriate product module by name."""
    func = _CALCULATORS_BY_NAME.get((product_type or "").upper())
    if func:
        return func(data)
    print(f"[PRODUCTS] No calculator for product type: {product_type}")
    return data


def dispatch_document(product_type: str, doc_id: str, project, **kwargs):
    """Dispatch document generation to the appropriate product module."""
    pt = (product_type or "").upper()
    
    # 1. Try new generator registry
    if pt in _GENERATORS_REGISTRY:
        generators = _GENERATORS_REGISTRY[pt]
        if doc_id in generators:
            return generators[doc_id](project, **kwargs)
    
    # 2. Fallback to legacy dispatchers
    if doc_id == "dxf":
        return dispatch_dxf(pt, project)
    elif doc_id == "pdf":
        return dispatch_pdf(pt, project, **kwargs)
        
    raise ValueError(f"No document generator for product type: {product_type}, document: {doc_id}")


def get_product_documents(product_type: str) -> list:
    """Get list of available documents for a product type."""
    return _AVAILABLE_DOCUMENTS_BY_NAME.get((product_type or "").upper(), [])



def get_product_capabilities(product_type: str) -> dict:
    """Get the capabilities (calc, dxf, pdf) for a given product type."""
    pt = (product_type or "").upper()
    return {
        "has_calculator": pt in _CALCULATORS_BY_NAME,
        "documents": get_product_documents(pt)
    }

# Expose available product types
def available_calculators() -> list[str]:
    return sorted(_CALCULATORS_BY_NAME.keys())

__all__ = [
    "dispatch_calculation",
    "dispatch_document",
    "get_product_documents",
    "dispatch_dxf",
    "available_calculators",
    "available_dxf_generators",
]
