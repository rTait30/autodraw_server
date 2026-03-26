import requests
from typing import Optional

import os

# Calculate forecast close date: last day of month, or next month if in last week
from datetime import datetime
from calendar import monthrange

from .auth import WG_BASE, WORKGURU_ENABLED, TENANTS, get_access_token, _log_wg_payload

from .config import LEAD_TENANT_CONFIG, DR_CATEGORIES, CP_CATEGORIES

from .requests import wg_get, wg_post

import requests


def get_workguru_leads(tenant): #DR/CP
    """
    Example function to fetch leads from the CRM.
    Adjust URL/headers as per your CRM API.
    """
    if not WORKGURU_ENABLED:
        print(f"[OFFLINE MODE] Skipping get_workguru_leads({tenant})")
        return []

    print ("Fetching leads for tenant:", tenant)

    access_token = get_access_token("DR")
    url = f"{WG_BASE}/api/services/app/Lead/GetLeads"  # Example endpoint
    headers = {"Authorization": f"Bearer {access_token}"}
    res = requests.get(url, headers=headers, timeout=20)
    
    res.raise_for_status()

    data = res.json()

    print ("LEADS: ", data.get("result", []).get("items", []))

    return res.json().get("result", [])

def add_update_lead(
    tenant: str,
    id: Optional[str],  # None for create, string ID for update
    name: str,
    description: str,
    budget: int,
    category: str,
    go_percent: int = 100,
    client_wg_id: str | None = None
    ):
    

    tenant = tenant.upper()
    cfg = LEAD_TENANT_CONFIG[tenant]

    client_wg_id = client_wg_id or cfg["default_client_wg_id"]
    get_percent = int(go_percent * 0.5)

    print(
        "make_lead:",
        "\ntenant:", tenant,
        "\nname:", name,
        "\ndescription:", description,
        "\nbudget:", budget,
        "\ncategory:", category,
        "\ngo_percent:", go_percent,
        "\nclient_wg_id:", client_wg_id,
    )

    body = {
        "Id": id or "0",
        "TenantId": cfg["tenant_id"],
        "WonOrLostDate": "",
        "Status": "Current",
        "CreatorUserId": "",
        "LeadNumber": "",
        "Name": name,
        "Description": description,
        "OwnerId": cfg["owner_id"],
        "CategoryId": cfg["category_id"],
        "StageId": cfg["stage_id"],
        "CloseProbability": str(get_percent),
        "ForecastCloseDate": get_forecast_close_date(),
        "ClientId": client_wg_id,
        "ContactId": "",
        "BillingClientId": client_wg_id,
        "BillingClientContactId": "",
        "Budget": budget,
        "CustomFieldValues": [
            {
                "TenantId": cfg["tenant_id"],
                "CustomFieldId": cfg["category_custom_field_id"],
                "Value": get_category_display(tenant, category) or cfg["default_category_display"],
            },
            {
                "TenantId": cfg["tenant_id"],
                "CustomFieldId": cfg["get_percent_custom_field_id"],
                "Value": str(get_percent),
            },
            {
                "TenantId": cfg["tenant_id"],
                "CustomFieldId": cfg["go_percent_custom_field_id"],
                "Value": str(go_percent),
            },
        ],
    }

    _log_wg_payload(f"{tenant} LEAD REQUEST BODY", body)

    res = wg_post(tenant, "Lead/AddOrUpdateLead", body)

    print(f"{tenant} LEAD CREATED/UPDATED:", res)
    return res

def add_update_quote(
    tenant: str,
    id: Optional[str],  # None for create, string ID for update
    name: str,
    description: str,
    labour: dict | None = None,
    materials: dict | None = None,
    ):

    body= {

        "Id": id or "0",
        "tenantId": LEAD_TENANT_CONFIG[tenant]["tenant_id"],
        "CustomFieldGroupId": "",
        "ExcludeFromPipeline": False,
        "UseStaffRates": False,
        "QuoteNumber": "",
        "Status": "Draft",
        "Revision": "0",
        "Name": name,
        "DocumentStorageId": "",
        "Description": description,
        "ProjectGroupId": "",
        "ClientId": LEAD_TENANT_CONFIG[tenant]["default_client_wg_id"],
        "ContactId": "",
        "BillingClientId": LEAD_TENANT_CONFIG[tenant]["default_client_wg_id"],
        "BillingClientContactId": "",
        "QuoteOwnerId": LEAD_TENANT_CONFIG[tenant]["owner_id"],
        "ForecastJobDate": "",
        "AssetId": "",
        "LeadId": "",
        "Phases": "",
        "Currency": "AUD",
        "ExchangeRate": "1",
        "Tasks": [],
        "Products": []
    }

    pass

def get_forecast_close_date():
    today = datetime.now()
    # Get last day of current month
    last_day_of_month = monthrange(today.year, today.month)[1]
    
    # Check if we're in the last week (within 7 days of month end)
    days_until_month_end = last_day_of_month - today.day
    
    if days_until_month_end < 7:
        # Move to next month
        if today.month == 12:
            next_year = today.year + 1
            next_month = 1
        else:
            next_year = today.year
            next_month = today.month + 1
        
        last_day = monthrange(next_year, next_month)[1]
        forecastclose_date = f"{last_day:02d}/{next_month:02d}/{next_year}"
    else:
        # Use current month
        forecastclose_date = f"{last_day_of_month:02d}/{today.month:02d}/{today.year}"
    
    return forecastclose_date

def sync_workguru_clients(db, User):
    """
    Fetch all clients from WorkGuru for each tenant and sync to User table.
    Only adds new clients that don't already exist (by wg_id + tenant).
    """
    if not WORKGURU_ENABLED:
        print("[OFFLINE MODE] Skipping WorkGuru client sync")
        return

    print("\n========== SYNCING WORKGURU CLIENTS ==========")
    
    for tenant in TENANTS.keys():
        try:
            print(f"Fetching clients for tenant: {tenant}")
            response = wg_get(tenant, "Client/GetClientNamesAndIds")
            clients = response.get("result", [])
            print(f"Found {len(clients)} clients for {tenant}")
            
            added_count = 0
            for client in clients:
                wg_id = client.get("id")
                name = client.get("name", "")
                
                if not wg_id or not name:
                    continue
                
                # Check if user already exists with this wg_id and tenant
                existing = User.query.filter_by(wg_id=wg_id, tenant=tenant).first()
                if existing:
                    continue
                
                # Use the client name as username
                # If name already exists, append tenant_wg_id to make it unique
                new_user = User(
                    username=name,
                    password_hash="",  # No password - these are client records, not login accounts
                    role="client",
                    verified=False,
                    tenant=tenant,
                    wg_id=wg_id,
                )
                db.session.add(new_user)
                added_count += 1
            
            if added_count > 0:
                db.session.commit()
                print(f"Added {added_count} new clients for {tenant}")
            else:
                print(f"No new clients to add for {tenant}")
                
        except Exception as e:
            print(f"Error syncing clients for tenant {tenant}: {e}")
            db.session.rollback()
            continue
    
    print("========== SYNC COMPLETE ==========\n")












# ----------deprecated older functions below, may be removed in future ----------

def create_workguru_lead(name: str, description: str):
    if not WORKGURU_ENABLED:
        print(f"[OFFLINE MODE] Skipping create_workguru_lead({name})")
        return {"id": "OFFLINE_ID", "name": name}

    access_token = get_access_token("DR")
    url = f"{WG_BASE}/api/services/app/Lead/AddOrUpdateLead"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    # Build the exact shape Postman typically uses for WG: {"input": {...}}
    body = {
        "Id": 0,                     # for create
        "TenantId": 826,
        "WonOrLostDate": "",         # omit if not needed
        "Status": "Current",         # if Postman used "Open", use that
        "CreatorUserId": "",         # omit if not needed
        "LeadNumber": "",            # omit if not needed
        "Name": name,
        "Description": description,
        "OwnerId": 14364,            # dr ryan
        "CategoryId": 2140,          # dr warm
        "StageId": 2607,             # dr lead
        "CloseProbability": 90,
        "ForecastCloseDate": calculate_forecast_close_date(),
        "ClientId": 178827,          # dr parameter
        "ContactId": None,           # or omit if not used
        "BillingClientId": 178827,
        "BillingClientContactId": None,
        "Budget": 0,           # generate with estimate
        "CustomFieldValues": [
            {
                "TenantId": 826,
                "CustomFieldId": 3686,
                "Value": "2a. Tarpaulins (Tarps and Covers)",
            },
            {
                "TenantId": 826,
                "CustomFieldId": 5385,
                "Value": "90",  # 0
            },
            {
                "TenantId": 826,
                "CustomFieldId": 5386,
                "Value": "90",  # supplied by customer
            },
        ],
    }

    # Send JSON (not data=)
    res = requests.post(url, json=body, headers=headers, timeout=30)

    # Helpful diagnostics on failure
    if not res.ok:
        print("Status:", res.status_code)
        print("Response headers:", res.headers)
        try:
            print("Response JSON:", res.json())
        except Exception:
            print("Response text:", res.text)
        res.raise_for_status()

    data = res.json()
    print("LEAD CREATED/UPDATED:", data)
    return data

def create_cp_lead(name: str, description: str, budget: int, category: str, go_percent: int = 100, client_wg_id: str = "194156"):

    print ("create_cp_lead:", "\nname:", name, "\ndescription:", description, "\nbudget:", budget, "\ncategory:", category, "\ngo_percent:", go_percent, "\nclient_wg_id:", client_wg_id)

    # Build the exact shape that matches the working example
    body = {
        "Id": "0",
        "TenantId": "825",
        "WonOrLostDate": "",
        "Status": "Current",
        "CreatorUserId": "",
        "LeadNumber": "",
        "Name": name,
        "Description": description,
        "OwnerId": "14366",          # From working example
        "CategoryId": "1735",
        "StageId": "2123",           # From working example (was 2618)
        "CloseProbability": str(int(go_percent * 0.5)),
        "ForecastCloseDate": calculate_forecast_close_date(),
        "ClientId": client_wg_id,    # From working example
        "ContactId": "",
        "BillingClientId": client_wg_id, # From working example
        "BillingClientContactId": "",
        "Budget": budget,
        "CustomFieldValues": [
            {
                "TenantId": "825",
                "CustomFieldId": "3553",
                "Value": get_category_display_name("CP", category) or "1a. Shade (Shade Cloth)"
            },
            {
                "TenantId": "825",
                "CustomFieldId": "5289",
                "Value": str(go_percent * 0.5),  # Get% 50
            },
            {
                "TenantId": "825",
                "CustomFieldId": "5290",
                "Value": str(go_percent),  # Go% supplied by customer
            },
        ]
    }

    _log_wg_payload("CP LEAD REQUEST BODY", body)

    # Send JSON (not data=)
    res = wg_post("CP", "Lead/AddOrUpdateLead", body)

    print("CP LEAD CREATED/UPDATED:", res)
    return res

def create_dr_lead(name: str, description: str, budget: int, category: str, go_percent: int = 100, client_wg_id: str = "178827"):

    print ("create_dr_lead:", "\nname:", name, "\ndescription:", description, "\nbudget:", budget, "\ncategory:", category, "\ngo_percent:", go_percent, "\nclient_wg_id:", client_wg_id)

    # Build the exact shape that matches the working example
    body = {
        "Id": "0",                   # STRING for create (working example uses strings)
        "TenantId": "826",           # STRING
        "WonOrLostDate": "",
        "Status": "Current",
        "CreatorUserId": "",
        "LeadNumber": "",
        "Name": name,
        "Description": description,
        "OwnerId": "14364",          # STRING - dr ryan
        "CategoryId": "2140",        # STRING - dr warm
        "StageId": "2607",           # STRING - dr lead
        "CloseProbability": str(int(go_percent * 0.5)),  # STRING
        "ForecastCloseDate": calculate_forecast_close_date(),
        "ClientId": client_wg_id,    # STRING - Dynamic
        "ContactId": "",             # Empty string, not None
        "BillingClientId": client_wg_id, # STRING - Dynamic
        "BillingClientContactId": "",  # Empty string, not None
        "Budget": budget,       # STRING - generate with estimate
        "CustomFieldValues": [
            {
                "TenantId": "826",   # STRING
                "CustomFieldId": "3686",  # STRING
                "Value": get_category_display_name("DR", category),
            },
            {
                "TenantId": "826",
                "CustomFieldId": "5385",
                "Value": "50",  # Get% 50
            },
            {
                "TenantId": "826",
                "CustomFieldId": "5386",
                "Value": str(go_percent),  # Go% supplied by customer
            },
        ],
    }

    # Send JSON (not data=)
    res = wg_post("DR", "Lead/AddOrUpdateLead", body)

    print("DR LEAD CREATED/UPDATED:", res)
    return res

def create_cp_quote(name: str, data: dict | None = None, materials_labour: dict | None = None, client_wg_id: str = "147217", category: str = "1a"):

    print("create_cp_quote:", "\nname:", name, "\ndata:", data, "\nmaterials_labour:", materials_labour, "\nclient_wg_id:", client_wg_id, "\ncategory:", category)

    pro_rig_quantity = _get_total_project_points(data)

    body = {
        "Id": "0",
        "tenantId": "825",
        "CustomFieldGroupId": "",
        "ExcludeFromPipeline": False,
        "UseStaffRates": False,
        "QuoteNumber": "",
        "Status": "Draft",
        "Revision": "0",
        "Name": name,
        "DocumentStorageId": "",
        "Description": "",
        "ProjectGroupId": "",
        "ClientId": client_wg_id,
        "ContactId": "",
        "BillingClientId": client_wg_id,
        "BillingClientContactId": "",
        "QuoteOwnerId": "14366",
        "ForecastJobDate": "",
        "AssetId": "",
        "LeadId": "",
        "Phases": "",
        "Currency": "AUD",
        "ExchangeRate": "1",
        "customFieldValues": [
            {
                "tenantId": "825",
                "customfieldId": "3553",
                "customField": {
                    "tenantId": "825",
                    "QuoteId": "0",
                    "id": "0",
                    "Value": get_category_display("CP", category) or "1a. Shade (Shade Cloth)",
                },
            },
            {
                "tenantId": "825",
                "customfieldId": "3581",
                "customField": {
                    "tenantId": "825",
                    "QuoteId": "0",
                    "id": "0",
                    "Value": "",
                },
            },
            {
                "tenantId": "825",
                "customfieldId": "3585",
                "customField": {
                    "tenantId": "825",
                    "QuoteId": "0",
                    "id": "0",
                    "Value": "",
                },
            },
        ],
        "Tasks": [],
        "Products": [],
        "Rounding": "",
        "TaxRounding": "",
    }

    if pro_rig_quantity > 0:
        body["Products"].append(
            {
                "ProductId": "873094",
                "Id": "0",
                "QuoteId": "0",
                "TenantId": "825",
                "SortOrder": "1",
                "TaxName": "GST on Income",
                "TaxRate": "10",
                "AccountCode": "47000",
                "IsAccepted": False,
                "Sku": "2-CP-108",
                "Name": "2-CP-108",
                "Quantity": f"{pro_rig_quantity:.4f}",
                "DiscountApplied": "",
                "Discount": "",
                "UnitAmount": "8.0000",
                "Billable": True,
                "LineTotal": str(pro_rig_quantity),
                "Description": "Cast Double Dee 8 x 50mm",
                "TaxType": "OUTPUT",
                "TaxAmount": f"{pro_rig_quantity * 0.1:.1f}",
                "UnitCost": "4.4000",
                "MarkUp": "",
            }
        )

    print(f"[workGuru] Derived Pro-Rig quantity from project points: {pro_rig_quantity}")
    _log_wg_payload("CP QUOTE REQUEST BODY", body)

    res = wg_post("CP", "Quote/AddOrUpdateQuote", body)

    quote_result = {
        "quote": res,
        "materials_labour": materials_labour or {"materials": {}, "labour": {}},
    }

    print("CP QUOTE CREATED/UPDATED:", quote_result)
    return quote_result
