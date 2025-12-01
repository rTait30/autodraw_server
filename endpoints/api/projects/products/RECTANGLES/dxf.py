"""RECTANGLES DXF generation (stub - to be implemented)."""
import tempfile
from flask import send_file, jsonify
from endpoints.api.projects.shared.dxf_utils import new_doc_mm


def generate_dxf(nest: dict, nested_panels: dict, download_name: str, product_dims: dict):
    """Generate DXF file for RECTANGLES product type.
    
    TODO: Implement rectangles-specific DXF generation logic.
    For now, returns a simple placeholder DXF.
    
    Args:
        nest: Nesting result with 'panels', 'bin_height'/'fabric_height', 'total_width'/'required_width'
        nested_panels: Panel metadata map
        download_name: Filename for the DXF download
        product_dims: Dict mapping product index to dimensions
    
    Returns:
        Flask send_file response with DXF file
    """
    doc, msp = new_doc_mm()
    
    # Placeholder: Add a simple text note
    msp.add_text(
        "RECTANGLES DXF - To be implemented",
        dxfattribs={"layer": "PEN", "height": 50}
    ).set_placement((100, 100))
    
    # Save to temp file
    tmp = tempfile.NamedTemporaryFile(suffix=".dxf", delete=False)
    tmp_path = tmp.name
    tmp.close()
    doc.saveas(tmp_path)

    return send_file(
        tmp_path,
        mimetype="application/dxf",
        as_attachment=True,
        download_name=download_name,
        max_age=0,
        etag=False,
        conditional=False,
        last_modified=None,
    )


__all__ = ["generate_dxf"]
