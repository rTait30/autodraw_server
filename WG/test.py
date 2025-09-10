import requests

BASE_URL = "https://api.workguru.io"

def add_or_update_lead(token, input_payload):
    import json
    url = f"{BASE_URL}/api/services/app/Lead/AddOrUpdateLead"
    headers = {
        "Authorization": f"Bearer {token}",
        "accept": "text/plain",
        "Content-Type": "application/json-patch+json",
    }
    try:
        r = requests.post(url, json={"input": input_payload}, headers=headers, timeout=30)
        
    except requests.RequestException as e:
        print("\n--- DEBUG ---")
        print("URL:", url)
        print("Request headers:", headers)
        print("Request body:", json.dumps({"input": input_payload}, indent=2))
        print("Exception:", str(e))
        print("--- /DEBUG ---\n")
        raise

    if r.status_code >= 400:
        print("\n--- DEBUG ---")
        print("URL:", url)
        print("Status:", r.status_code)
        print("Request headers:", headers)
        print("Request body:", json.dumps({"input": input_payload}, indent=2))
        print("Raw response text:", r.text)
        print("--- /DEBUG ---\n")

    try:
        data = r.json()
    except Exception as e:
        r.raise_for_status()
        raise RuntimeError(f"Failed to parse response: {str(e)}")

    if r.status_code != 200 or not data.get("success", False):

        error_details = data.get("error", {})
        message = error_details.get("message", "Unknown error")
        details = error_details.get("details", "No details provided")
        validation_errors = error_details.get("validationErrors", "No validation errors provided")
        raise RuntimeError(
            f"Lead request failed: HTTP {r.status_code} | {message} | Details: {details} | Validation Errors: {validation_errors}"
        )
    
    return data["result"]

if __name__ == "__main__":

    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjE1ODU4IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3IiwiQXNwTmV0LklkZW50aXR5LlNlY3VyaXR5U3RhbXAiOiJTU0pNTU9QRVRUUDdPTFZPT1dNWlg1Q1dFNExVSjI3WiIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFQSSIsImh0dHA6Ly93d3cuYXNwbmV0Ym9pbGVycGxhdGUuY29tL2lkZW50aXR5L2NsYWltcy90ZW5hbnRJZCI6IjgyNSIsIkFwcGxpY2F0aW9uX1VzZXJFbWFpbCI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3QG5vcmVwbHkuY29tIiwiQXBwbGljYXRpb25fVXNlckZpcnN0TmFtZSI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3IiwiQXBwbGljYXRpb25fVXNlckxhc3ROYW1lIjoiQ1BfV0dfQVVUT01BVElPTiIsInN1YiI6IjE1ODU4IiwianRpIjoiNjcwZTUzYjItZmY3Yi00MTVlLWE1MzMtNjdmYWMwNmUxNzRmIiwiaWF0IjoxNzU3Mzg0OTA3LCJuYmYiOjE3NTczODQ5MDcsImV4cCI6MTc1NzQ3MTMwNywiaXNzIjoiUnlwZSIsImF1ZCI6IlJ5cGUifQ.8z0i_qgRMDyRneApCDTKReoSbMP2suqZz_DxYiuFpLw"

    safe_minimum = {
        "tenantId": 825,
        "clientId": 194156,
        "name": "Test Lead 2025-09-09",
        "description": "api",
        "categoryId": 1735,
        "stageId": 2124,  # "Lead"
        "status": "Open",
        "customFieldValues": [
            {
                "customFieldId": 3553,
                "value": "1b. Shade (PVC Membranes)"
            },
            {
                "customFieldId": 5289,
                "value": 50
            },
            {
                "customFieldId": 5290,
                "value": 50
            }
        ]
    }

    created = add_or_update_lead(token, safe_minimum)
