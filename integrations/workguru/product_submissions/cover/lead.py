import math
import os

from integrations.workguru.wg_endpoints import add_update_lead
from models import User

def cover_lead(project, data, client_id):

    print(f"Making cover lead for client {client_id}")

    wg_client_id = None
    if client_id:
        client_user = User.query.filter_by(id=client_id).first()
        if client_user and client_user.wg_id:
            wg_client_id = str(client_user.wg_id)

    print (f"Client WG ID: {wg_client_id}")

    print (f"Submitting cover project to WorkGuru (Client WG ID: {wg_client_id})...")
    name = (data.get("general").get("name") or "").strip()
    description = ""
    for cover in data.get("products", []):
        attributes = cover.get("attributes", {})
        cover_quantity = attributes.get("quantity", 0)
        cover_length = attributes.get("length", 0)
        cover_width = attributes.get("width", 0)
        cover_height = attributes.get("height", 0)

        stay_puts_str = "; Stay Puts" if attributes.get("stayputs", False) else ""

        description += (f"{cover_quantity} x PVC Cover\n{cover_length}x{cover_width}x{cover_height}mm {stay_puts_str}\n")

    estimated_price = project.estimate_total or 0.0

    res = add_update_lead(
        tenant="DR",
        id="0",
        name=name,
        description=description,
        budget=math.ceil(estimated_price) if estimated_price else 0,
        category="2a",
        go_percent=100,
        client_wg_id=wg_client_id
    )

    return res, name, description


