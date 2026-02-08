from endpoints.integrations.workguru.client import cp_make_lead, dr_make_lead, wg_get
import math
import os

def is_workguru_enabled():
    return os.getenv("WORKGURU_INTEGRATION", "false").lower() == "true"

def enrich_wg_data(wg_data):
    """
    Enrich wg_data with additional information from WorkGuru API.
    
    Args:
        wg_data: dict containing at minimum 'project_number' and 'tenant'
        
    Returns:
        dict: The enriched wg_data with additional fields from the API response
    """
    if not is_workguru_enabled():
        return wg_data

    project_number = wg_data.get("project_number")
    tenant = wg_data.get("tenant")
    
    if not project_number or not tenant:
        return wg_data
    
    try:
        if tenant == "Copelands":
            tenant_code = "CP"
        if tenant == "D&R Liners":
            tenant_code = "DR"

        GetProjectId = wg_get(tenant_code, f"/Project/GetProjectIdByNumber?number=PR-{tenant_code}-{project_number}")

        projectId = GetProjectId.get("result", None)

        print (f"WorkGuru API: Fetched project ID {projectId} for project number {project_number} under tenant {tenant}")

        GetProjectById = wg_get(tenant_code, f"/Project/GetProjectById?id={projectId}")

        api_response = {
            "projectId": projectId,
            "dueDate": GetProjectById.get("result", {}).get("dueDate", None),
            "PO": GetProjectById.get("result", {}).get("invoices", [{}])[0].get("clientPurchaseOrder", None),
            "description": GetProjectById.get("result", {}).get("description", None),
            "freightMethod": GetProjectById.get("result", {}).get("freightMethod", None),
        }
        
        # Merge API response into wg_data
        if api_response:
            wg_data = {**wg_data, **api_response}
            
    except Exception as e:
        print(f"Failed to enrich wg_data from WorkGuru API: {e}")
    
    return wg_data

def submit_cover_to_workguru(project, data, wg_client_id):
    if not is_workguru_enabled():
        print("WorkGuru integration disabled. Skipping submission.")
        return

    print (f"Submitting cover project to WorkGuru (Client WG ID: {wg_client_id})...")
    name = (data.get("general").get("name") or "").strip()
    description = ""
    for cover in data.get("products", []):
        attributes = cover.get("attributes", {})
        cover_quantity = attributes.get("quantity", 0)
        cover_length = attributes.get("length", 0)
        cover_width = attributes.get("width", 0)
        cover_height = attributes.get("height", 0)

        stay_puts = attributes.get("stayputs", False)
        stay_puts_str = "; Stay Puts" if stay_puts else ""

        description += (f"{cover_quantity} x PVC Cover\n{cover_length}x{cover_width}x{cover_height}mm {stay_puts_str}\n")


    estimated_price = project.estimate_total or 0.0
    
    dr_make_lead(
        name=name,
        description=description,
        budget=math.ceil(estimated_price) if estimated_price else 0,
        category="2a",
        go_percent=100,
        client_wg_id=wg_client_id
    )

def submit_shade_sail_to_workguru(project, data, wg_client_id, wg_name):
    if not is_workguru_enabled():
        print("WorkGuru integration disabled. Skipping submission.")
        return

    print (f"Submitting shade sail project to WorkGuru (Client WG ID: {wg_client_id})...")
    project_name = data.get("general").get("name") or ""
    
    if wg_name:
        name = (f"{wg_name} - {project_name}")
    else:
        name = project_name
        
    description = ""
    sailCount = len(data.get("products", []))
    for sail in data.get("products", []):

        sail_name = sail.get("name", "")
        if sail_name[:4] == "Item":
            productIndex = sail.get("productIndex", 0)
            sail_name = f"Sail {productIndex + 1}"
        attributes = sail.get("attributes", {})
        
        edgeMeter = attributes.get("edgeMeter", 0)

        fabric_type = attributes.get("fabricType", "")

        colour = attributes.get("colour", "")

        corners = attributes.get("pointCount", "")

        cableSize = attributes.get("cableSize", "")

        if attributes.get("fabricCategory", "") == "PVC":
            description += "PVC Membrane "

        if sailCount > 1: description += (f"{sail_name}: {edgeMeter}EM, {fabric_type} {colour}, {corners}C, {cableSize}mm Cable")
        else: description += (f"{edgeMeter}EM, {fabric_type} {colour}, {corners}C, {cableSize}mm Cable")

        for sailtrack in (attributes.get("sailTracks", [])):
            
            description += (f", ST From {sailtrack[0]} to {sailtrack[1]}")

        description += "\n"

    estimated_price = project.estimate_total or 0.0

    if attributes.get("fabricCategory", "") == "PVC":
        category = "1b"
    else:
        category = "1a"
    
    cp_make_lead(
        name=name,
        description=description,
        budget=math.ceil(estimated_price) if estimated_price else 0,
        category=category,
        go_percent=100,
        client_wg_id=wg_client_id
    )
