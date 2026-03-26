import math
import os

from wg_endpoints import add_update_lead

def cover_lead(project, data, wg_client_id):

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
    
    '''
    create_dr_lead(
        name=name,
        description=description,
        budget=math.ceil(estimated_price) if estimated_price else 0,
        category="2a",
        go_percent=100,
        client_wg_id=wg_client_id
    )
    '''

    add_update_lead(
        tenant="DR",
        id="0",
        name=name,
        description=description,
        budget=math.ceil(estimated_price) if estimated_price else 0,
        category="2a",
        go_percent=100,
        client_wg_id=wg_client_id
    )
