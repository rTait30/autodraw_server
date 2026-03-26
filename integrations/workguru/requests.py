import requests
from typing import Optional

import os

# Calculate forecast close date: last day of month, or next month if in last week
from datetime import datetime
from calendar import monthrange

from .auth import WG_BASE, WORKGURU_ENABLED, get_access_token

import requests

def wg_get(tenant: str, endpoint: str, params: dict | None = None):
    if not WORKGURU_ENABLED:
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
    if not WORKGURU_ENABLED:
        print(f"[OFFLINE MODE] Skipping wg_post({tenant}, {endpoint})")
        return {"result": {}} # Mock result

    url = f"{WG_BASE}/api/services/app/{endpoint}"
    print(f"[workGuru] POST {url} for tenant {tenant}")
    headers = {
        "Authorization": f"Bearer {get_access_token(tenant)}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    res = requests.post(url, headers=headers, json=body, timeout=30)
    print(f"[workGuru] Response status: {res.status_code}")
    try:
        print("[workGuru] Response body preview:")
        print((res.text or "")[:2000])
    except Exception as exc:
        print(f"[workGuru] Failed to read response body: {exc}")
    res.raise_for_status()
    return res.json()
