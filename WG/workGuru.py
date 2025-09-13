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

CP_KEY = os.getenv("CP_KEY")
CP_SECRET = os.getenv("CP_SECRET")

print ("CP_KEY:", CP_KEY)

input ("Press Enter to continue...")

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