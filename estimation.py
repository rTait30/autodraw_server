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


def _process_ternary(expr: str) -> str:
    """Core logic to convert a single ternary expression string.
    
    Assumes `expr` is likely 'cond ? true : false' or contains one.
    Does NOT handle parentheses wrapping safely on its own (see `_convert_ternary` wrapper).
    """
    pattern = r'(.+?)\s*\?\s*(.+?)\s*:\s*(.+)'
    match = re.search(pattern, expr)
    
    if match:
        condition = match.group(1).strip()
        true_val = match.group(2).strip()
        false_val = match.group(3).strip()
        
        # Recurse on parts
        false_val_conv = _process_ternary(false_val)
        true_val_conv = _process_ternary(true_val)
        
        return f"({true_val_conv} if {condition} else {false_val_conv})"
    
    return expr

def _convert_ternary(expr: str) -> str:
    """Convert JS-style ternary 'condition ? true : false' to Python.
    
    Handles parentheses by resolving innermost parens first.
    """
    # 1. Resolve ternaries inside parentheses iteratively (innermost first)
    # This prevents 'A + (B ? C : D)' from being parsed as valid ternary 'A + (B' ? ...
    
    # Regex for innermost parentheses (containing no other parentheses)
    inner_pattern = r'\(([^\(\)]*)\)'
    
    # Loop until no more parentheses containing '?' are found to ensure full resolution
    # (or until string stabilizes to avoid infinite loops)
    
    prev_expr = None
    while prev_expr != expr:
        prev_expr = expr
        
        def replace_inner(m):
            content = m.group(1)
            # Only process if it looks like a ternary
            if '?' in content and ':' in content:
                converted = _process_ternary(content)
                return f"({converted})"
            return m.group(0)
            
        expr = re.sub(inner_pattern, replace_inner, expr)
        
    # 2. Finally process any top-level ternary
    return _process_ternary(expr)


def _convert_js_expr(expr: str) -> str:
    """Convert common JS expression syntax to Python syntax."""
    expr = expr.replace("===", "==")
    expr = expr.replace("!==", "!=")
    expr = expr.replace("&&", " and ")
    expr = expr.replace("||", " or ")
    expr = expr.replace("true", "True")
    expr = expr.replace("false", "False")
    return expr

def _eval_python_expr(expr: str, variables: Dict[str, Any]) -> float:
    """Evaluate a standard Python expression using built-in eval().
    
    WARNING: Only use with trusted input (admins).
    Provides math library and variables context.
    """
    import math
    
    # 1. Flatten variables (handle dot notation slightly differently?)
    # Python doesn't support "attributes.length" as a variable name directly in eval
    # unless we pass a dict and use syntax "attributes['length']".
    # BUT, we want to support "length" directly if possible, or "attributes.length" via object proxy.
    
    # Let's map flattened keys for convenience if needed, 
    # but the primary context has "attributes" as a dict.
    
    # Create a safe-ish context
    context = {
        "math": math,
        "abs": abs,
        "min": min,
        "max": max,
        "round": round,
        "int": int,
        "float": float,
        **variables # Inject all top-level variables (attributes, inputs, calculated, etc.)
    }
    
    # Helper: allow direct access to attributes keys if they don't conflict
    if "attributes" in variables and isinstance(variables["attributes"], dict):
        for k, v in variables["attributes"].items():
            if k not in context:
                context[k] = v
                
    if "calculated" in variables and isinstance(variables["calculated"], dict):
        for k, v in variables["calculated"].items():
            if k not in context:
                context[k] = v

    try:
        return float(eval(expr, {"__builtins__": {}}, context))
    except Exception as e:
        print(f"PYTHON EVAL ERROR: {e} in '{expr}'")
        return 0.0

def _safe_eval_expr(expr: str, variables: Dict[str, Any]) -> float:
    """Evaluate a simple arithmetic expression safely.
    
    Now supports explicit Python syntax if detected, or legacy JS-ish syntax.
    """
    original_expr = expr
    expr = expr.strip()
    
    # Heuristic: If it contains "if " or "else " or looks like a python function call, use Python eval
    if " if " in expr or " else " in expr or "math." in expr:
         return _eval_python_expr(expr, variables)

    # Pre-process: remove newlines which break regex/ternary parsing
    expr = expr.replace('\n', ' ').replace('\r', ' ')
    
    # 1. Convert JS syntax
    expr = _convert_js_expr(expr.strip())
    
    # 2. Convert ternaries
    expr = _convert_ternary(expr)
    
    # Verbose logging for debugging "cable" or "Evaluations"
    verbose = any(x in original_expr for x in ["cable", "=="])
    if verbose:
        print(f"EVAL START: '{original_expr}' -> '{expr}'")

    try:
        node = ast.parse(expr, mode="eval")
    except SyntaxError as e:
        if verbose:
             print(f"EVAL ERROR: SyntaxError: {e}")
        return 0.0

    def _eval(n: ast.AST) -> Any:
        if isinstance(n, ast.Expression):
            return _eval(n.body)
        
        # Binary Operators
        if isinstance(n, ast.BinOp):
            left = _eval(n.left)
            right = _eval(n.right)
            if isinstance(n.op, ast.Add): return float(left) + float(right)
            if isinstance(n.op, ast.Sub): return float(left) - float(right)
            if isinstance(n.op, ast.Mult): return float(left) * float(right)
            if isinstance(n.op, ast.Div):
                r = float(right) 
                return float(left) / r if r != 0 else 0.0
            raise ValueError("Unsupported operator")
            
        # Unary Operators
        if isinstance(n, ast.UnaryOp):
            val = float(_eval(n.operand))
            if isinstance(n.op, ast.UAdd): return +val
            if isinstance(n.op, ast.USub): return -val
            if isinstance(n.op, ast.Not): return not val
            raise ValueError("Unsupported unary operator")
            
        # Boolean Logic (and, or)
        if isinstance(n, ast.BoolOp):
            values = [_eval(v) for v in n.values]
            if isinstance(n.op, ast.Or):
                # Return first truthy, or last
                for v in values:
                    if v: return v
                return values[-1]
            if isinstance(n.op, ast.And):
                # Return first falsy, or last
                for v in values:
                    if not v: return v
                return values[-1]
                
        # Comparisons (==, !=, >, <, etc)
        if isinstance(n, ast.Compare):
            left = _eval(n.left)
            for op, comparator in zip(n.ops, n.comparators):
                right = _eval(comparator)
                
                # Helper for loose comparison (JS-style behavior)
                def _loose_eq(a, b):
                    if a == b: return True
                    # Try converting strings to floats
                    try: 
                        if float(a) == float(b): return True
                    except (ValueError, TypeError): pass
                    return False

                res = False
                if isinstance(op, ast.Eq):
                    res = _loose_eq(left, right)
                elif isinstance(op, ast.NotEq):
                    res = not _loose_eq(left, right)
                elif isinstance(op, ast.Gt):
                    res = (float(left) > float(right))
                elif isinstance(op, ast.Lt):
                    res = (float(left) < float(right))
                elif isinstance(op, ast.GtE):
                    res = (float(left) >= float(right))
                elif isinstance(op, ast.LtE):
                    res = (float(left) <= float(right))
                else:
                    raise ValueError(f"Unsupported comparison: {type(op)}")
                
                if verbose:
                    print(f"   CMP: {left} {type(op).__name__} {right} -> {res}")
                
                if not res: return False
                left = right
            return True

        if isinstance(n, ast.Name):
            if n.id in variables:
                val = variables[n.id]
                if verbose:
                    print(f"   VAR: {n.id} -> {val}")
                return val
            if verbose:
                print(f"   VAR: {n.id} -> MISSING (0.0)")
            return 0.0 
        
        if isinstance(n, ast.Attribute):
            obj = _eval(n.value)
            if isinstance(obj, dict):
                 return obj.get(n.attr, 0.0)
            if hasattr(obj, n.attr):
                 return getattr(obj, n.attr)
            return 0.0

        if isinstance(n, ast.Constant):
            # Return exact value (int, float, string, bool)
            return n.value
            
        if isinstance(n, ast.Num):  # py<3.8
            return n.n
        if isinstance(n, ast.Str):  # py<3.8
            return n.s
            
        if isinstance(n, ast.IfExp):
            # Handle ternary
            cond_val = _eval(n.test)
            if cond_val:
                return _eval(n.body)
            else:
                return _eval(n.orelse)
                
        if isinstance(n, ast.Subscript):
            # e.g. fittingCounts['Key']
            val = _eval(n.value)
            idx = _eval(n.slice) # In py3.9+ slice is the index node
            if isinstance(val, dict):
                return val.get(idx, 0.0)
            if isinstance(val, (list, tuple)) and isinstance(idx, int):
                if 0 <= idx < len(val):
                    return val[idx]
            return 0.0

        # Attempt to handle Index node for older python if ast.Subscript structure differs?
        # In modern python ast.Index is deprecated but might appear wrapped in n.slice
        if isinstance(n, ast.Index):
             return _eval(n.value)

        raise ValueError(f"Unsupported expression element: {type(n)}")

    result = _eval(node)
    try:
        return float(result)
    except (ValueError, TypeError):
        # Result might be boolean or string, try converting
        if isinstance(result, bool):
            return 1.0 if result else 0.0
        # If it returns a string, we can't easily make it a float unless it is numeric
        # But for price calc, usually we end up with numbers.
        return 0.0


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
            try:
                return _safe_eval_expr(val, attrs or {})
            except Exception:
                # If expression evaluation fails, return 0 to avoid breaking the entire calculation
                return 0.0
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


def estimate_price_from_schema(schema_data: Any, attributes: Dict[str, Any], skus = None) -> Dict[str, Any]:
    print("\n--- ESTIMATING PRICE START ---")
    total = 0.0
    input_state = {}
    
    # 1. Initialize input state from schema defaults
    if isinstance(schema_data, dict):
        for section, rows in schema_data.items():
            if isinstance(rows, list):
                for row in rows:
                    if isinstance(row, dict) and row.get("type") == "input":
                        key = row.get("key")
                        default_val = row.get("default", 0)
                        if key:
                            input_state[key] = default_val
    
    print(f"Initialized Inputs: {input_state}")

    # Create rows list with section tags
    flattened_rows = []
    if isinstance(schema_data, dict):
        for section, rows in schema_data.items():
            if section == "_constants" or not isinstance(rows, list):
                continue
            for row in rows:
                if isinstance(row, dict):
                    row["_section"] = section 
                    flattened_rows.append(row)
    
    print(f"Flattened Rows Count: {len(flattened_rows)}")
    
    section_totals = {}
    
    # Context available to expressions
    eval_context = {
        **attributes,
        "inputs": input_state,
        "global": {
            "contingencyPercent": schema_data.get("_constants", {}).get("contingencyPercent", 3),
            "marginPercent": schema_data.get("_constants", {}).get("marginPercent", 45),
        }
    }
    
    print(f"Eval Context Global: {eval_context['global']}")

    # Evaluate rows
    for row in flattened_rows:
        rtype = (row.get("type") or "row").lower()
        section = row.get("_section", "General")
        
        if rtype in ("row", "sku"):
            raw_qty = row.get("quantity", 0)
            quantity = _evaluate_value(raw_qty, eval_context)
            unit_cost = 0.0
            
            if rtype == "sku":
                sku_code = row.get("sku")
                if skus and sku_code in skus:
                    unit_cost = float(skus[sku_code].costPrice or 0.0)
                    print(f"DEBUG SKU: Found '{sku_code}' | Cost: {unit_cost} | Qty: {quantity}")
                else:
                    print(f"DEBUG SKU: Missing '{sku_code}' in lookup. Keys: {list(skus.keys()) if skus else 'None'}")
                    unit_cost = 0.0
            else:
                raw_cost = row.get("unitCost", 0)
                unit_cost = _evaluate_value(raw_cost, eval_context)
                print(f"DEBUG ROW: {section} | Qty: {quantity} (from {raw_qty}) | Unit: {unit_cost} (from {raw_cost})")
            
            line_total = quantity * unit_cost
            total += line_total
            section_totals[section] = section_totals.get(section, 0.0) + line_total
            print(f"  -> Line Total: {line_total} | Section '{section}' Total so far: {section_totals[section]}")

    # Update context with section totals for completeness (though unused here)
    for sname, sval in section_totals.items():
        eval_context[f"{sname.lower()}Total"] = sval
        
    eval_context["baseCost"] = total

    # Apply Markup
    contingency_pct = eval_context["global"].get("contingencyPercent", 3)
    margin_pct = eval_context["global"].get("marginPercent", 45)
    
    contingency_amt = total * (contingency_pct / 100.0)
    
    suggested_price = 0.0
    if abs(1.0 - margin_pct/100.0) > 0.001:
        suggested_price = (total + contingency_amt) / (1.0 - margin_pct / 100.0)
    else:
         suggested_price = total + contingency_amt
    
    print(f"--- MARKUP CALCULATION ---")
    print(f"Base Total: {total}")
    print(f"Contingency %: {contingency_pct} -> Amt: {contingency_amt}")
    print(f"Margin %: {margin_pct}")
    print(f"Suggested Price: {suggested_price}")
    print("--- ESTIMATING PRICE END ---\n")

    return {
        "totals": {
            "total": total, # Base cost
            "grand_total": suggested_price, # Final price
            "contingency_amount": contingency_amt
        }
    }


def flatten_rows(schema_data):
    if isinstance(schema_data, list):
        return [r for r in schema_data if isinstance(r, dict)]
    if isinstance(schema_data, dict):
        rows = []
        for key, value in schema_data.items():
            if isinstance(value, list):
                 for r in value:
                     if isinstance(r, dict):
                         r["_section"] = key
                         rows.append(r)
        return rows
    return []

