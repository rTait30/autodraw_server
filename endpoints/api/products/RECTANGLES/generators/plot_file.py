import os
import tempfile
from flask import send_file, after_this_request
from endpoints.api.projects.shared.dxf_utils import new_doc_mm

def get_metadata():
    return {
        "id": "plot_file",
        "name": "Plot File",
        "type": "dxf"
    }

def generate(project, **kwargs):
    """
    Generates a DXF plot file for the RECTANGLES product.
    """
    filename = f"PLOT_{project.get('id', 'project')}.dxf"
    
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

    @after_this_request
    def _cleanup(response):
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        return response

    return send_file(
        tmp_path,
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=filename,
        max_age=0,
        etag=False,
        conditional=False,
        last_modified=None,
    )
