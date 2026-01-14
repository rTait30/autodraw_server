# app/crm/client.py
import os, time, requests
from typing import Optional, Dict, Any

import os
from pathlib import Path
from dotenv import load_dotenv

# Calculate forecast close date: last day of month, or next month if in last week
from datetime import datetime, timedelta
from calendar import monthrange

# WG/workGuru.py -> WG/ -> top-level/
TOP = Path(__file__).resolve().parent.parent
load_dotenv(TOP / "instance" / ".env")

WG_BASE = "https://api.workguru.io/"
WORKGURU_OFFLINE = os.getenv("WORKGURU_OFFLINE", "False").lower() in ("true", "1", "yes")

TENANTS = {
    "CP": {
        "key": os.getenv("CP_KEY"),
        "secret": os.getenv("CP_SECRET"),
        "token": None,  # optional pre-set token
    },
    "DR": {
        "key": os.getenv("DR_KEY"),
        "secret": os.getenv("DR_SECRET"),
        "token": None,  # optional pre-set token
    },
}

def _now() -> int:
    return int(time.time())

import requests
import traceback

import requests
import traceback

def _fetch_access_token(tenant: str):
    if WORKGURU_OFFLINE:
        print(f"[OFFLINE MODE] Skipping token fetch for {tenant}")
        return "OFFLINE_TOKEN"

    print("\n========== FETCHING NEW WORKGURU TOKEN ==========")
    print(f"Tenant: {tenant}")

    creds = TENANTS.get(tenant)
    if not creds:
        raise RuntimeError(f"No credentials configured for tenant '{tenant}'")

    base = WG_BASE.rstrip("/")  # e.g. "https://api.workguru.io"
    url = f"{base}/api/ClientTokenAuth/Authenticate/api/client/v1/tokenauth"
    print(f"Auth URL: {url}")

    payload = {
        "apiKey": creds["key"],
        "secret": creds["secret"],
    }
    print("Payload keys present:", {
        "apiKey": bool(creds.get("key")),
        "secret": bool(creds.get("secret")),
    })

    try:
        res = requests.post(url, json=payload, timeout=20)

        # Debug info
        print("Auth status code:", res.status_code)
        try:
            # First 500 chars of body so logs don't explode
            print("Auth response body preview:")
            print((res.text or "")[:500])
        except Exception:
            print("Could not read response text")

        res.raise_for_status()
        data = res.json()

    except Exception as e:
        # This is what you’re seeing now in the traceback
        print("\n!!!!!! ERROR WHILE FETCHING WORKGURU TOKEN !!!!!!")
        print("Tenant:", tenant)
        print("Exception:", repr(e))
        print("Traceback:")
        traceback.print_exc()
        print("--------------------------------------------------")
        raise RuntimeError(
            f"Failed to fetch WorkGuru token for tenant '{tenant}'. "
            f"HTTP status: {getattr(res, 'status_code', 'unknown')}. "
            f"See logs above for full response."
        ) from e

    access = data.get("accessToken")
    if not access:
        raise RuntimeError(
            f"WorkGuru token response did not contain 'accessToken' for tenant '{tenant}'. "
            f"Raw response: {data}"
        )

    # Common fields in WG token responses: accessToken, expiresInSeconds
    expires_in = int(data.get("expiresInSeconds", data.get("expires_in", 3600)))
    exp = _now() + max(60, expires_in - 30)

    TENANTS[tenant]["token"] = access
    TENANTS[tenant]["token_exp"] = exp

    print("Token fetched OK for tenant", tenant)
    print("Token expires at:", exp)
    print("==================================================\n")

    return access



def get_access_token(tenant):

    print (f"Getting access token for tenant: {tenant}")

    if TENANTS[tenant]["token"]:
        return TENANTS[tenant]["token"]

    else:
        _fetch_access_token(tenant)
        return TENANTS[tenant]["token"]

def warm_crm_token(*tenants: str) -> None:
    """Optional: prefetch tokens at startup."""
    targets = tenants or list(TENANTS.keys())
    for t in targets:
        try:
            get_access_token(t, force=True)
        except Exception as e:
            # non-fatal warmup
            print(f"[workGuru] Warmup failed for {t}: {e}")


    
        
def get_leads(tenant): #DR/CP
    """
    Example function to fetch leads from the CRM.
    Adjust URL/headers as per your CRM API.
    """
    if WORKGURU_OFFLINE:
        print(f"[OFFLINE MODE] Skipping get_leads({tenant})")
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


def add_cover(name: str, description: str):
    if WORKGURU_OFFLINE:
        print(f"[OFFLINE MODE] Skipping add_cover({name})")
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
        "ForecastCloseDate": get_forecastclose_date(),
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


def dr_make_lead(name: str, description: str, budget: int, category: str, go_percent: int = 100, client_wg_id: str = "178827"):

    print ("dr_make_lead:", "\nname:", name, "\ndescription:", description, "\nbudget:", budget, "\ncategory:", category, "\ngo_percent:", go_percent, "\nclient_wg_id:", client_wg_id)

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
        "ForecastCloseDate": get_forecastclose_date(),
        "ClientId": client_wg_id,    # STRING - Dynamic
        "ContactId": "",             # Empty string, not None
        "BillingClientId": client_wg_id, # STRING - Dynamic
        "BillingClientContactId": "",  # Empty string, not None
        "Budget": budget,       # STRING - generate with estimate
        "CustomFieldValues": [
            {
                "TenantId": "826",   # STRING
                "CustomFieldId": "3686",  # STRING
                "Value": get_category_display("DR", category),
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


def cp_make_lead(name: str, description: str, budget: int, category: str, go_percent: int = 100, client_wg_id: str = "194156"):

    print ("cp_make_lead:", "\nname:", name, "\ndescription:", description, "\nbudget:", budget, "\ncategory:", category, "\ngo_percent:", go_percent, "\nclient_wg_id:", client_wg_id)

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
        "ForecastCloseDate": get_forecastclose_date(),
        "ClientId": client_wg_id,    # From working example
        "ContactId": "",
        "BillingClientId": client_wg_id, # From working example
        "BillingClientContactId": "",
        "Budget": budget,
        "CustomFieldValues": [
            {
                "TenantId": "825",
                "CustomFieldId": "3553",
                "Value": get_category_display("CP", category) or "1a. Shade (Shade Cloth)"
            }
        ]
    }

    # Send JSON (not data=)
    res = wg_post("CP", "Lead/AddOrUpdateLead", body)

    print("CP LEAD CREATED/UPDATED:", res)
    return res


def wg_get(tenant: str, endpoint: str, params: dict | None = None):
    if WORKGURU_OFFLINE:
        print(f"[OFFLINE MODE] Skipping wg_get({tenant}, {endpoint})")
        return {"result": []} # Mock result to avoid errors

    url = f"{WG_BASE}/api/services/app/{endpoint}"
    token = get_access_token(tenant)

    #print (f"token: {token}")

    #return {}

    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(url, headers=headers, params=params, timeout=20)
    res.raise_for_status()

    #print("Response JSON:", res.json())

    return res.json()

def wg_post(tenant: str, endpoint: str, body: dict):
    if WORKGURU_OFFLINE:
        print(f"[OFFLINE MODE] Skipping wg_post({tenant}, {endpoint})")
        return {"result": {}} # Mock result

    url = f"{WG_BASE}/api/services/app/{endpoint}"
    headers = {
        "Authorization": f"Bearer {get_access_token(tenant)}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    res = requests.post(url, headers=headers, json=body, timeout=30)
    res.raise_for_status()
    return res.json()



def get_forecastclose_date():
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


DR_CATEGORIES = {
    "1a": {"id": 1,  "name": "Dam & Pond Liners",             "group": "Environmental"},
    "1b": {"id": 2,  "name": "Tank Liners",                   "group": "Environmental"},
    "1c": {"id": 3,  "name": "Spill Control and Containment", "group": "Environmental"},
    "1d": {"id": 4,  "name": "Waste Management",              "group": "Environmental"},

    "2a": {"id": 5,  "name": "Tarpaulins",                    "group": "Tarps and Covers"},
    "2b": {"id": 6,  "name": "Grain and Stockpile Covers",    "group": "Tarps and Covers"},
    "2c": {"id": 7,  "name": "Truck & Transport",             "group": "Tarps and Covers"},

    "3a": {"id": 8,  "name": "Marine Curtains",               "group": "Industrial Curtains"},
    "3b": {"id": 9,  "name": "Industrial Curtains",           "group": "Industrial Curtains"},
    "3c": {"id": 10, "name": "Cold Store Curtains",           "group": "Industrial Curtains"},

    "4a": {"id": 11, "name": "Fumigation Tarps",              "group": "Fumigation"},
    "4b": {"id": 12, "name": "Fumigation Chamber Covers",     "group": "Fumigation"},

    "5":  {"id": 13, "name": "Poultry",                       "group": "Poultry"},
    "6":  {"id": 14, "name": "Miscellaneous",                 "group": "Miscellaneous"},
}

CP_CATEGORIES = {

    "1a": {"id": 1,  "name": "Shade",             "group": "Shade Cloth"},
    "1b": {"id": 2,  "name": "Shade",              "group": "PVC Membranes"},

}

def get_category_display(tenant, code):
    """
    Returns a display string like:
    "1a. Dam & Pond Liners (Environmental)"

    """

    categories = DR_CATEGORIES if tenant == "DR" else CP_CATEGORIES

    item = categories.get(code)
    if not item:
        return None
    return f"{code}. {item['name'] } ({item['group']})"


def sync_wg_clients(db, User):
    """
    Fetch all clients from WorkGuru for each tenant and sync to User table.
    Only adds new clients that don't already exist (by wg_id + tenant).
    """
    if WORKGURU_OFFLINE:
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
