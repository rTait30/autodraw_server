"""Product calculation package with database-driven auto-discovery.

Automatically discovers calculator modules and maps them to Product IDs from the database.
Each module should expose a `calculate(data: dict) -> dict` function.
Module filenames match Product.name (e.g., 'cover.py' matches Product with name='COVER').
"""

import importlib
import pkgutil
from typing import Dict, Callable, Optional

# Auto-discover all calculator modules in this package
_CALCULATORS_BY_NAME: Dict[str, Callable[[dict], dict]] = {}

for finder, name, ispkg in pkgutil.iter_modules(__path__, prefix=__name__ + "."):
	module_name = name.split(".")[-1]
	if module_name.startswith("_") or module_name == "calculators":
		continue
	
	try:
		module = importlib.import_module(name)
		if hasattr(module, "calculate"):
			product_type = module_name.upper()
			_CALCULATORS_BY_NAME[product_type] = module.calculate
	except Exception:
		pass


def get_calculators_by_id() -> Dict[int, Callable[[dict], dict]]:
	"""Build a mapping of Product.id -> calculator function from the database."""
	from models import Product, db
	
	calculators_by_id = {}
	try:
		products = Product.query.all()
		for product in products:
			calc = _CALCULATORS_BY_NAME.get((product.name or "").upper())
			if calc:
				calculators_by_id[product.id] = calc
	except Exception:
		# If DB not available or error, return empty dict
		pass
	
	return calculators_by_id


def dispatch(product_type: str, data: dict) -> dict:
	"""Dispatch calculation to the appropriate product module by name."""
	func = _CALCULATORS_BY_NAME.get((product_type or "").upper())
	if func:
		return func(data)
	return dict(data.get("attributes") or {})


def dispatch_by_id(product_id: int, data: dict) -> dict:
	"""Dispatch calculation to the appropriate product module by Product ID."""
	calculators = get_calculators_by_id()
	func = calculators.get(product_id)
	if func:
		return func(data)
	return dict(data.get("attributes") or {})


__all__ = ["dispatch", "dispatch_by_id", "get_calculators_by_id"]
