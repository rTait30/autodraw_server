"""Minimal estimating support for 'row' entries.

This evaluates rows by multiplying `quantity * unitCost`. Both fields can be
numbers or string expressions that reference attribute names (e.g. "length * 2").
Expressions are evaluated safely via Python AST with only arithmetic allowed.

Schema shape supported for now:
- A list of row dicts: [{"type":"row", "quantity": ..., "unitCost": ...}, ...]
- A dict containing one or more lists (e.g. {"Combined": [...], "_constants": {...}})

Returns a dict: { "totals": { "total": float, "grand_total": float } }
"""

import ast
import re
from typing import Any, Dict, List


def _convert_ternary(expr: str) -> str:
    """Convert JS-style ternary 'condition ? true : false' to Python 'true if condition else false'.
    
    Handles nested parentheses and simple conditions.
    """
    # Match: (anything) ? (value) : (value)
    # This regex finds ternary patterns
    pattern = r'([a-zA-Z_][a-zA-Z0-9_]*|\([^)]+\))\s*\?\s*([^:]+)\s*:\s*(.+)'
    
    def replace_ternary(match):
        condition = match.group(1).strip()
        true_val = match.group(2).strip()
        false_val = match.group(3).strip()
        # Recursively handle nested ternaries in false branch
        false_val = _convert_ternary(false_val)
        return f"({true_val} if {condition} else {false_val})"
    
    # Keep replacing until no more ternaries found
    prev = None
    while prev != expr:
        prev = expr
        expr = re.sub(pattern, replace_ternary, expr)
    
    return expr


def _safe_eval_expr(expr: str, variables: Dict[str, Any]) -> float:
    """Evaluate a simple arithmetic expression safely.

    Allowed:
    - numbers, names (resolved from variables)
    - binary ops: +, -, *, /
    - unary ops: +, -
    - parentheses
    - ternary: condition ? true_val : false_val
    """
    # Pre-process ternary operators (JS-style: condition ? true : false)
    # Convert to Python-style: true if condition else false
    expr = _convert_ternary(expr.strip())
    
    node = ast.parse(expr, mode="eval")

    def _eval(n: ast.AST) -> float:
        if isinstance(n, ast.Expression):
            return _eval(n.body)
        if isinstance(n, ast.BinOp):
            left = _eval(n.left)
            right = _eval(n.right)
            if isinstance(n.op, ast.Add):
                return left + right
            if isinstance(n.op, ast.Sub):
                return left - right
            if isinstance(n.op, ast.Mult):
                return left * right
            if isinstance(n.op, ast.Div):
                return left / right if right != 0 else 0.0
            raise ValueError("Unsupported operator")
        if isinstance(n, ast.UnaryOp):
            val = _eval(n.operand)
            if isinstance(n.op, ast.UAdd):
                return +val
            if isinstance(n.op, ast.USub):
                return -val
            raise ValueError("Unsupported unary operator")
        if isinstance(n, ast.Name):
            if n.id in variables:
                v = variables[n.id]
                try:
                    return float(v)
                except Exception:
                    raise ValueError(f"Variable '{n.id}' is not numeric: {v}")
            raise ValueError(f"Unknown variable: {n.id}")
        if isinstance(n, ast.Constant):
            if isinstance(n.value, (int, float)):
                return float(n.value)
            # Handle boolean constants (from ternary conversion)
            if isinstance(n.value, bool):
                return 1.0 if n.value else 0.0
            # Strings are treated as invalid here; use number-like strings directly
            raise ValueError("Unsupported constant type")
        if isinstance(n, ast.Num):  # py<3.8
            return float(n.n)
        if isinstance(n, ast.IfExp):
            # Handle ternary: true_val if condition else false_val
            # Evaluate condition as truthy
            cond_val = _eval(n.test)
            if cond_val:
                return _eval(n.body)
            else:
                return _eval(n.orelse)
        if isinstance(n, ast.Call):
            # Calls are not allowed in minimal mode
            raise ValueError("Function calls not allowed in expressions")
        if isinstance(n, ast.Subscript):
            # No indexing access allowed
            raise ValueError("Indexing not allowed in expressions")
        raise ValueError("Unsupported expression element")

    return float(_eval(node))


def _evaluate_value(val: Any, attrs: Dict[str, Any]) -> float:
    """Return numeric value from literal or expression string.
    - numbers -> float
    - number-like strings -> float
    - expression strings -> evaluated against attrs
    """
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        try:
            return float(val)
        except Exception:
            return _safe_eval_expr(val, attrs or {})
    return 0.0


def _collect_rows(schema_data: Any) -> List[Dict[str, Any]]:
    """Flatten rows from either a list or dict-of-lists schema."""
    if isinstance(schema_data, list):
        return [r for r in schema_data if isinstance(r, dict)]
    if isinstance(schema_data, dict):
        rows: List[Dict[str, Any]] = []
        for key, value in schema_data.items():
            if isinstance(value, list):
                rows.extend([r for r in value if isinstance(r, dict)])
        return rows
    return []


def estimate_price_from_schema(schema_data: Any, attributes: Dict[str, Any]) -> Dict[str, Any]:
    total = 0.0
    rows = _collect_rows(schema_data)

    for row in rows:
        if (row.get("type") or "row").lower() == "row":
            quantity = _evaluate_value(row.get("quantity", 0), attributes)
            unit_cost = _evaluate_value(row.get("unitCost", 0), attributes)
            total += quantity * unit_cost

    return {
        "totals": {
            "total": total,
            "grand_total": total,
        }
    }

