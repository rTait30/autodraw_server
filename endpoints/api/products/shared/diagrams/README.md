Shared diagrams for product generators

Place diagrams here to be reused by any product generator.

Naming convention
- Use the pattern: <category>_<id>.<ext>
  - Examples:
    - cable_4.svg or cable_4.png
    - corner_prorig.svg
    - pocket_150.png
- Prefer lowercase, underscores, no spaces.

Recommended formats
- SVG: Preferred for diagrams (vector, scales cleanly).
- PNG (300 DPI): Good raster fallback for images/screenshots.
- PDF: Ok for vector diagrams as single-page PDFs.

Usage
- Files will be searched in this order:
  1. Product-local `generators/diagrams/` directory
  2. Shared `endpoints/api/products/shared/diagrams/`
- Filenames should be `"{detail_type}_{detail_id}.{ext}"` or `"{detail_id}.{ext}"`.

Cable diagrams
- Suggested names for cable diagrams you mentioned:
  - `cable_4.svg` (or `.png`)
  - `cable_5.svg`
  - `cable_6.svg`
  - `cable_8.svg`

Notes
- If you provide SVGs we recommend also providing PNGs for environments that can't render SVGs directly.
- After adding diagrams, re-generate the Fabrication Workbook to see them appear on the DETAILS page.
