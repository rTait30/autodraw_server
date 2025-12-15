import argparse
import os
import sys
import re
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

BACKEND_PRODUCTS_DIR = BASE_DIR / "endpoints" / "api" / "products"
FRONTEND_PRODUCTS_DIR = BASE_DIR / "react" / "src" / "components" / "products"
BOOTSTRAP_FILE = BASE_DIR / "setup" / "bootstrap_admin.py"

# Lazy imports to avoid circular dependencies when imported by the app
def get_db_models():
    from models import db, Product
    return db, Product

def get_create_app():
    from app import create_app
    return create_app

def create_backend_files(product_name, fields):
    product_dir = BACKEND_PRODUCTS_DIR / product_name
    product_dir.mkdir(parents=True, exist_ok=True)
    
    # Create generators dir
    (product_dir / "generators").mkdir(exist_ok=True)
    
    # Create calculations.py
    calc_file = product_dir / "calculations.py"
    if not calc_file.exists():
        with open(calc_file, "w") as f:
            f.write(f"""
def calculate(data: dict) -> dict:
    \"\"\"
    Auto-generated calculation for {product_name}.
    Input fields expected: {', '.join(fields)}
    \"\"\"
    results = {{}}
    
    # Extract inputs
""")
            for field in fields:
                f.write(f'    {field} = float(data.get("{field}", 0))\n')
            
            f.write("""
    # Perform calculations
    # TODO: Implement logic here
    
    # Return results
    results.update(data)
    return results
""")
        print(f"Created {calc_file}")
    else:
        print(f"Skipped {calc_file} (already exists)")

def create_frontend_files(product_name, fields):
    product_dir = FRONTEND_PRODUCTS_DIR / product_name
    product_dir.mkdir(parents=True, exist_ok=True)
    
    form_file = product_dir / "Form.jsx"
    if not form_file.exists():
        # Generate defaults
        defaults = ",\n  ".join([f"{field}: 0" for field in fields])
        
        # Generate inputs
        inputs = ""
        for i, field in enumerate(fields):
            label = field.replace("_", " ").title()
            inputs += f"""
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">{label}</label>
        <input
          ref={{el => inputRefs.current[{i}] = el}}
          type="number"
          className="p-2 border rounded"
          value={{attributes.{field}}}
          onChange={{(e) => setAttr("{field}")(parseFloat(e.target.value) || 0)}}
          onKeyDown={{(e) => handleKeyDown(e, {i})}}
        />
      </div>"""

        content = f"""import React, {{ useImperativeHandle, useState, useRef }} from "react";

export const ATTRIBUTE_DEFAULTS = Object.freeze({{
  {defaults}
}});

export function ProductForm({{ formRef, hydrate = {{}} }}) {{
  const [attributes, setAttributes] = useState({{
    ...ATTRIBUTE_DEFAULTS,
    ...(hydrate ?? {{}}),
  }});

  const inputRefs = useRef([]);

  const setAttr = (key) => (value) =>
    setAttributes((prev) => ({{ ...prev, [key]: value }}));

  const handleKeyDown = (e, index) => {{
    if (e.key === 'Enter') {{
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {{
        nextInput.focus();
        nextInput.select();
      }}
    }}
  }};

  useImperativeHandle(
    formRef,
    () => ({{
      getValues: () => ({{
        attributes,
      }}),
    }}),
    [attributes]
  );

  return (
    <div className="flex flex-col gap-4 max-w-md">
{inputs}
    </div>
  );
}}

export default ProductForm;
"""
        with open(form_file, "w") as f:
            f.write(content)
        print(f"Created {form_file}")
    else:
        print(f"Skipped {form_file} (already exists)")

    # Create Display.js
    display_file = product_dir / "Display.js"
    if not display_file.exists():
        content = f"""
export function render(canvas, data) {{
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  
  const products = data.products || [];

  // Helper to flatten nested objects for display
  const getLines = (obj, indent = 0) => {{
    let lines = [];
    Object.entries(obj).forEach(([key, val]) => {{
      const prefix = ' '.repeat(indent * 2);
      if (typeof val === 'object' && val !== null) {{
        lines.push(`${{prefix}}${{key}}:`);
        lines = lines.concat(getLines(val, indent + 1));
      }} else {{
        lines.push(`${{prefix}}${{key}}: ${{val}}`);
      }}
    }});
    return lines;
  }};

  // Calculate required height
  let requiredHeight = 80;
  const productLines = products.map(p => getLines(p));
  
  productLines.forEach(lines => {{
    requiredHeight += 25;
    requiredHeight += lines.length * 20;
    requiredHeight += 15;
  }});

  // Resize canvas
  canvas.height = Math.max(200, requiredHeight + 20);
  const height = canvas.height;
  
  // Clear
  ctx.clearRect(0, 0, width, height);
  
  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#cccccc';
  ctx.strokeRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText("{product_name} Preview", 20, 40);

  // Attributes
  let y = 80;
  
  products.forEach((product, index) => {{
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Item ${{index + 1}}`, 20, y);
    y += 25;
    
    ctx.font = '14px monospace';
    ctx.fillStyle = '#444444';
    
    const lines = productLines[index];
    lines.forEach(line => {{
        ctx.fillText(line, 35, y);
        y += 20;
    }});
    y += 15;
  }});
}}
"""
        with open(display_file, "w") as f:
            f.write(content)
        print(f"Created {display_file}")
    else:
        print(f"Skipped {display_file} (already exists)")

def update_bootstrap_script(product_name):
    if not BOOTSTRAP_FILE.exists():
        print(f"Warning: {BOOTSTRAP_FILE} not found.")
        return

    with open(BOOTSTRAP_FILE, "r") as f:
        content = f.read()

    # Regex to find the products_to_create list
    # We look for products_to_create = [ ... ]
    # We want to insert before the closing ]
    
    pattern = r"(products_to_create\s*=\s*\[[\s\S]*?)(\s*\])"
    match = re.search(pattern, content)
    
    if match:
        list_content = match.group(1)
        closing_bracket = match.group(2)
        
        # Find the highest ID in the existing content
        ids = re.findall(r'"id":\s*(\d+)', list_content)
        next_id = 1
        if ids:
            next_id = max(map(int, ids)) + 1
            
        new_entry = f"""
        {{
            "id": {next_id},
            "name": "{product_name}",
            "description": "Auto-generated product {product_name}",
            "default_schema_id": 1
        }},"""
        
        # Insert the new entry before the closing bracket
        # We need to be careful about commas. 
        # Assuming the last item might not have a comma if it's valid JSON, 
        # but in Python lists, trailing commas are allowed and common.
        # Let's just append it.
        
        new_content = content.replace(match.group(0), list_content + new_entry + closing_bracket)
        
        with open(BOOTSTRAP_FILE, "w") as f:
            f.write(new_content)
            
        print(f"Updated {BOOTSTRAP_FILE} with new product ID {next_id}")
    else:
        print("Could not find 'products_to_create' list in bootstrap_admin.py. Please update manually.")

def add_product_to_db(product_name):
    from flask import has_app_context
    
    db, Product = get_db_models()
    
    def _add():
        existing = Product.query.filter_by(name=product_name).first()
        if existing:
            print(f"Product {product_name} already exists in DB (ID: {existing.id}).")
            return

        # Find next ID
        max_id = db.session.query(db.func.max(Product.id)).scalar() or 0
        new_id = max_id + 1

        new_product = Product(
            id=new_id,
            name=product_name,
            description=f"Auto-generated product {product_name}",
            default_schema_id=1
        )
        
        db.session.add(new_product)
        db.session.commit()
        print(f"✅ Successfully added {product_name} to database with ID {new_id}.")

    if has_app_context():
        print(f"Adding {product_name} to database (using existing context)...")
        _add()
    else:
        print(f"Adding {product_name} to database (creating new context)...")
        create_app = get_create_app()
        app = create_app()
        with app.app_context():
            _add()

def scaffold_product(name, fields):
    """
    Main entry point to scaffold a product.
    Can be called programmatically.
    """
    product_name = name.upper()
    print(f"Scaffolding product: {product_name}")
    create_backend_files(product_name, fields)
    create_frontend_files(product_name, fields)
    update_bootstrap_script(product_name)
    add_product_to_db(product_name)
    print("\\nDone! Product is ready to use.")

def main():
    parser = argparse.ArgumentParser(description="Add a new product to AutoDraw")
    parser.add_argument("name", help="Name of the product (e.g. MY_PRODUCT)")
    parser.add_argument("fields", nargs="+", help="List of number fields (e.g. width height)")
    
    args = parser.parse_args()
    scaffold_product(args.name, args.fields)

if __name__ == "__main__":
    main()
