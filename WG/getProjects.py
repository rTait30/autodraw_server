import requests

# Replace with your actual API base URL and authentication details
BASE_URL = "https://api.workguru.io"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjE1ODU4IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3IiwiQXNwTmV0LklkZW50aXR5LlNlY3VyaXR5U3RhbXAiOiJTU0pNTU9QRVRUUDdPTFZPT1dNWlg1Q1dFNExVSjI3WiIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFQSSIsImh0dHA6Ly93d3cuYXNwbmV0Ym9pbGVycGxhdGUuY29tL2lkZW50aXR5L2NsYWltcy90ZW5hbnRJZCI6IjgyNSIsIkFwcGxpY2F0aW9uX1VzZXJFbWFpbCI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3QG5vcmVwbHkuY29tIiwiQXBwbGljYXRpb25fVXNlckZpcnN0TmFtZSI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3IiwiQXBwbGljYXRpb25fVXNlckxhc3ROYW1lIjoiQ1BfV0dfQVVUT01BVElPTiIsInN1YiI6IjE1ODU4IiwianRpIjoiY2MwZDZlNzItZTA3OS00ZGZjLTgwMTItOGZhYTJjMjIyOTI0IiwiaWF0IjoxNzU3NjMzNzIyLCJuYmYiOjE3NTc2MzM3MjIsImV4cCI6MTc1NzcyMDEyMiwiaXNzIjoiUnlwZSIsImF1ZCI6IlJ5cGUifQ.eaKdB9wwd1bNv_Bq5QgWTpN-ufo0PlHy5Se08iwH1eg"
# Headers for API requests
headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

def get_all_projects():
    url = f"{BASE_URL}/api/services/app/Project/GetAllCurrentProjectsWithoutFilter"
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise an error for bad status codes
        data = response.json()
        # Extract projects from 'results' header
        projects = data.get("result", [])
        # Extract only projectNo, projectName, and id
        return [
            {
                "id": project.get("id"),
                "projectNo": project.get("projectNo"),
                "projectName": project.get("projectName")
            }
            for project in projects
        ]
    except requests.RequestException as e:
        print(f"Error fetching projects: {e}")
        return []

def get_project_line_items(project_id):
    url = f"{BASE_URL}/api/services/app/Project/GetProjectById"
    params = {"id": project_id}
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        result = data.get("result", [])

        productLineItems = result.get("productLineItems", [])

        productLineItemsSummary = []

        for item in productLineItems:

            smallProductLineItem = {
                "name": item.get("name"),
                "quantity": item.get("quantity"),
                "sku": item.get("sku")
            }
            productLineItemsSummary.append(smallProductLineItem)

        return {
            "job": result.get("projectName"),
            "line_items": productLineItemsSummary
        }

    except requests.RequestException as e:
        print(f"Error fetching line items for project {project_id}: {e}")
        return []
    
def get_prID_by_prNo(prNo):
    url = f"{BASE_URL}/api/services/app/Project/GetProjectIdByNumber"
    params = {"number": prNo}

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("result")  # it's just the ID, not an object
    except requests.RequestException as e:
        print(f"Error fetching project ID for {prNo}: {e}")
        return None


    
    
    projects = get_all_projects()

    '''
    for project in projects:
        print ()
        print (project["projectName"])
        print (project["projectNo"])
        print ("Line items:")

        line_items = get_project_line_items(project["id"])

        print (line_items)

        if (len(line_items) < 1):
            input("Problem")
    '''
            
from collections import defaultdict

def consolidate_materials(project_numbers):
    materials = {}
    job_names = {}

    for prNo in project_numbers:
        prID = get_prID_by_prNo(prNo)
        if not prID:
            print(f"[warn] No ID for {prNo}")
            continue

        data = get_project_line_items(prID) or {}
        job_name = data.get("job", "")
        items = data.get("line_items", [])

        job_names[prNo] = job_name

        for it in items:
            sku = (it.get("sku") or "").strip()
            if not sku:
                sku = f"NO-SKU::{(it.get('name') or 'Unknown').strip()}"

            qty = float(it.get("quantity") or 0)
            name = (it.get("name") or "").strip()

            rec = materials.setdefault(
                sku, {"name": name, "total": 0.0, "by_job": defaultdict(float)}
            )
            if name and name != rec["name"]:
                rec["name"] = name
            rec["total"] += qty
            rec["by_job"][prNo] += qty

    # convert defaultdicts to plain dicts
    for rec in materials.values():
        rec["by_job"] = dict(rec["by_job"])

    return materials, job_names




def main():

    # ---------- Example usage ----------
    check = ["PR-CP-1204", "PR-CP-1248", "PR-CP-1266", "PR-CP-1264", "PR-CP-1258",
              "PR-CP-1259", "PR-CP-1263", "PR-CP-1272", "PR-CP-1277", "PR-CP-1281",
              "PR-CP-1282", "PR-CP-1285"]
    
    materials_needed, job_names = consolidate_materials(check)

    for jobb in sorted(job_names.items()):
        print(f"{jobb[0]}: {jobb[1]}")

    input()
    
    for sku, rec in sorted(materials_needed.items(), key=lambda kv: kv[1]["total"], reverse=True):

        if sku[0] != "3":

            print(f"{sku} {rec['name']}")
            print(f"total={rec['total']}")
            for prNo, qty in sorted(rec["by_job"].items()):
                pname = job_names.get(prNo, "")
                suffix = f" ({pname})" if pname else ""
                print(f"  - {prNo}{suffix}: {qty}")
            print()

if __name__ == "__main__":
    main()
