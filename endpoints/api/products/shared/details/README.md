Shared Details Library

This directory contains details (diagrams and specifications) shared across all products.

Structure
- Each detail can have its own folder named after the detail ID (e.g., `cable_4`, `corner_prorig`).
- Inside the folder, place the diagram file.
  - Preferred names: `diagram.svg`, `diagram.png`, `image.png`, or `{detail_id}.{ext}`.
  - Supported formats: SVG (preferred), PNG, JPG, PDF.
- Alternatively, you can place files directly in this directory named `{detail_id}.{ext}`.

Example
```
shared/details/
  cable_4/
    diagram.svg
    specs.json (optional, future use)
  corner_prorig/
    image.png
  pocket_150.png
```

Usage
Use `endpoints.api.products.shared.detail_manager` to retrieve details.
```python
from endpoints.api.products.shared.detail_manager import get_detail_image

path = get_detail_image("cable_4")
```
