import math
import os

from integrations.workguru.wg_endpoints import add_update_lead, add_update_quote
from models import User




def cover_quote(project, data, name, description, client_id, lead_id = None):

    print(f"Making cover quote for client {client_id}")
    if lead_id:
        print(f"Using lead {lead_id} in WorkGuru")

    wg_client_id = None
    if client_id:
        client_user = User.query.filter_by(id=client_id).first()
        if client_user and client_user.wg_id:
            wg_client_id = str(client_user.wg_id)

    print (f"Client WG ID: {wg_client_id}")

    print (f"Submitting cover quote to WorkGuru (Client WG ID: {wg_client_id})...")

    hours = 0

    materials = []

    estimate_schema_evaluated = project.estimate_schema_evaluated or {}

    idx = 0

    zip_slider = 0

    for cover in data.get("products", []):

        attributes = cover.get("attributes", {})
        quantity = attributes.get("quantity", 0)
        stayputs = attributes.get("stayputs", False)
        if stayputs: hours += quantity * 2.5
        else: hours += quantity * 2

        unit_cost = estimate_schema_evaluated.get("items", {})[idx].get("unitCost", 0) if estimate_schema_evaluated.get("items") else 0

        cover_length = attributes.get("length", 0)
        cover_width = attributes.get("width", 0)
        cover_height = attributes.get("height", 0)

        stay_puts_str = "; Stay Puts" if attributes.get("stayputs", False) else ""

        item_description = (f"{quantity} x PVC Cover\n{cover_length}x{cover_width}x{cover_height}mm {stay_puts_str}\n")

        materials.append({"key": "3-DR-043", "description": item_description, "quantity": quantity, "unit_cost": unit_cost, "billable": True})
    
        zip_slider += cover_height

    print ("\n\n#########################################\n\n")

    print (project.project_attributes)
    print (project.project_attributes.get("nest"))

    total_material = ((project.project_attributes.get("nest").get("num_rolls"))-1) * project.project_attributes.get("nest").get("fabric_roll_length") + project.project_attributes.get("nest").get("last_roll_length")

    material_buy = (math.ceil(total_material / 500) * 500) / 1000

    materials.append({"key": "2-DR-F-225","quantity": material_buy})

    materials.append({"key": "2-DR-H-113","quantity": idx * 2})

    materials.append({"key": "2-DR-H-001-W","quantity": math.ceil(zip_slider / 1000)})

    res = add_update_quote(
        tenant="DR",
        id=None,
        name=name,
        description=description,
        lead_id=lead_id or "",
        labour={"Labour - 1": hours},
        materials=materials,
    )

    return res, name, description
