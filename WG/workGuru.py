# app/crm/client.py
import os, time, requests
from typing import Optional, Dict, Any

import os
from pathlib import Path
from dotenv import load_dotenv

# WG/workGuru.py -> WG/ -> top-level/
TOP = Path(__file__).resolve().parent.parent
load_dotenv(TOP / "instance" / ".env")

WG_BASE = "https://api.workguru.io/"

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

def _fetch_access_token(tenant):

    print (f"Fetching new access token for tenant: {tenant}")
    creds = TENANTS.get(tenant)

    print ("Credentials: ", creds)

    url = f"{WG_BASE}/api/ClientTokenAuth/Authenticate/api/client/v1/tokenauth"
    res = requests.post(url, json={"apiKey": creds["key"], "secret": creds["secret"]}, timeout=20)
    res.raise_for_status()
    data = res.json()

    access = data.get("accessToken")
    if not access:
        raise RuntimeError(f"Token response missing access token for tenant '{tenant}'")

    expires_in = int(data.get("expiresInSeconds", data.get("expires_in", 3600)))
    exp = _now() + max(60, expires_in - 30)  # refresh a bit early

    TENANTS[tenant]["token"] = access  # cache it

    print ("Token: ", TENANTS[tenant]["token"])

    TENANTS[tenant]["token_exp"] = exp

def get_access_token(tenant):

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
        "ForecastCloseDate": "30/09/2025",  # match Postman format if that's what worked
        "ClientId": 178827,          # dr nsc
        "ContactId": None,           # or omit if not used
        "BillingClientId": 178827,
        "BillingClientContactId": None,
        "Budget": 0,
        "CustomFieldValues": [
            {
                "TenantId": 826,
                "CustomFieldId": 3686,
                "Value": "2a. Tarpaulins (Tarps and Covers)",
            },
            {
                "TenantId": 826,
                "CustomFieldId": 5385,
                "Value": "90",
            },
            {
                "TenantId": 826,
                "CustomFieldId": 5386,
                "Value": "90",
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



def wg_get(tenant: str, endpoint: str, token = "", params: dict | None = None):
    url = f"{WG_BASE}/api/services/app/{endpoint}"
    if token == "": token = get_access_token(tenant)
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(url, headers=headers, params=params, timeout=20)
    res.raise_for_status()
    return res.json()

def wg_post(tenant: str, endpoint: str, body: dict):
    url = f"{WG_BASE}/api/services/app/{endpoint}"
    headers = {
        "Authorization": f"Bearer {get_access_token(tenant)}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    res = requests.post(url, headers=headers, json=body, timeout=30)
    res.raise_for_status()
    return res.json()
