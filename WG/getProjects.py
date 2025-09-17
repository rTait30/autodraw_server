import datetime
import requests

from workGuru import wg_get

import json

import csv
from pathlib import Path

# Replace with your actual API base URL and authentication details
BASE_URL = "https://api.workguru.io"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjE1ODU4IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3IiwiQXNwTmV0LklkZW50aXR5LlNlY3VyaXR5U3RhbXAiOiJTU0pNTU9QRVRUUDdPTFZPT1dNWlg1Q1dFNExVSjI3WiIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFQSSIsImh0dHA6Ly93d3cuYXNwbmV0Ym9pbGVycGxhdGUuY29tL2lkZW50aXR5L2NsYWltcy90ZW5hbnRJZCI6IjgyNSIsIkFwcGxpY2F0aW9uX1VzZXJFbWFpbCI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3QG5vcmVwbHkuY29tIiwiQXBwbGljYXRpb25fVXNlckZpcnN0TmFtZSI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3IiwiQXBwbGljYXRpb25fVXNlckxhc3ROYW1lIjoiQ1BfV0dfQVVUT01BVElPTiIsInN1YiI6IjE1ODU4IiwianRpIjoiNzM5YWY0ZDgtMDc2ZS00YWI5LTgxMzEtYmQ5ZWExM2QyZDBiIiwiaWF0IjoxNzU4MDYwOTM1LCJuYmYiOjE3NTgwNjA5MzUsImV4cCI6MTc1ODE0NzMzNSwiaXNzIjoiUnlwZSIsImF1ZCI6IlJ5cGUifQ.Bagiu4Um7U6BtWQ3wqNIQHgMc06A5f2UMk2Vzrm03H8"
AUTH_DR = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjE1ODU3IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IjBmMDg4OWIwMGExNjQ2MzI5MzU3NjExZDg3YTllZGNlIiwiQXNwTmV0LklkZW50aXR5LlNlY3VyaXR5U3RhbXAiOiJMQUU2WlZRSlo1TEtaM1lYUlpXNTVLQzdYUVBCRTMyWCIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFQSSIsImh0dHA6Ly93d3cuYXNwbmV0Ym9pbGVycGxhdGUuY29tL2lkZW50aXR5L2NsYWltcy90ZW5hbnRJZCI6IjgyNiIsIkFwcGxpY2F0aW9uX1VzZXJFbWFpbCI6IjBmMDg4OWIwMGExNjQ2MzI5MzU3NjExZDg3YTllZGNlQG5vcmVwbHkuY29tIiwiQXBwbGljYXRpb25fVXNlckZpcnN0TmFtZSI6IjBmMDg4OWIwMGExNjQ2MzI5MzU3NjExZDg3YTllZGNlIiwiQXBwbGljYXRpb25fVXNlckxhc3ROYW1lIjoiRFJfV0dfQVVUT01BVElPTiIsInN1YiI6IjE1ODU3IiwianRpIjoiNDJhYWZlMTItOWViZS00MzIzLWE4ODItNTQ0NmNiMmNkN2E0IiwiaWF0IjoxNzU4MDY5NTg2LCJuYmYiOjE3NTgwNjk1ODYsImV4cCI6MTc1ODE1NTk4NiwiaXNzIjoiUnlwZSIsImF1ZCI6IlJ5cGUifQ.yuJPWCy7nnsPvqfGgqJNdKgRMniVkg9TcA529WxE1-Q"

tokens = {
    "CP": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjE1ODU4IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3IiwiQXNwTmV0LklkZW50aXR5LlNlY3VyaXR5U3RhbXAiOiJTU0pNTU9QRVRUUDdPTFZPT1dNWlg1Q1dFNExVSjI3WiIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFQSSIsImh0dHA6Ly93d3cuYXNwbmV0Ym9pbGVycGxhdGUuY29tL2lkZW50aXR5L2NsYWltcy90ZW5hbnRJZCI6IjgyNSIsIkFwcGxpY2F0aW9uX1VzZXJFbWFpbCI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3QG5vcmVwbHkuY29tIiwiQXBwbGljYXRpb25fVXNlckZpcnN0TmFtZSI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3IiwiQXBwbGljYXRpb25fVXNlckxhc3ROYW1lIjoiQ1BfV0dfQVVUT01BVElPTiIsInN1YiI6IjE1ODU4IiwianRpIjoiNzM5YWY0ZDgtMDc2ZS00YWI5LTgxMzEtYmQ5ZWExM2QyZDBiIiwiaWF0IjoxNzU4MDYwOTM1LCJuYmYiOjE3NTgwNjA5MzUsImV4cCI6MTc1ODE0NzMzNSwiaXNzIjoiUnlwZSIsImF1ZCI6IlJ5cGUifQ.Bagiu4Um7U6BtWQ3wqNIQHgMc06A5f2UMk2Vzrm03H8",
    "DR": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjE1ODU3IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IjBmMDg4OWIwMGExNjQ2MzI5MzU3NjExZDg3YTllZGNlIiwiQXNwTmV0LklkZW50aXR5LlNlY3VyaXR5U3RhbXAiOiJMQUU2WlZRSlo1TEtaM1lYUlpXNTVLQzdYUVBCRTMyWCIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFQSSIsImh0dHA6Ly93d3cuYXNwbmV0Ym9pbGVycGxhdGUuY29tL2lkZW50aXR5L2NsYWltcy90ZW5hbnRJZCI6IjgyNiIsIkFwcGxpY2F0aW9uX1VzZXJFbWFpbCI6IjBmMDg4OWIwMGExNjQ2MzI5MzU3NjExZDg3YTllZGNlQG5vcmVwbHkuY29tIiwiQXBwbGljYXRpb25fVXNlckZpcnN0TmFtZSI6IjBmMDg4OWIwMGExNjQ2MzI5MzU3NjExZDg3YTllZGNlIiwiQXBwbGljYXRpb25fVXNlckxhc3ROYW1lIjoiRFJfV0dfQVVUT01BVElPTiIsInN1YiI6IjE1ODU3IiwianRpIjoiNDJhYWZlMTItOWViZS00MzIzLWE4ODItNTQ0NmNiMmNkN2E0IiwiaWF0IjoxNzU4MDY5NTg2LCJuYmYiOjE3NTgwNjk1ODYsImV4cCI6MTc1ODE1NTk4NiwiaXNzIjoiUnlwZSIsImF1ZCI6IlJ5cGUifQ.yuJPWCy7nnsPvqfGgqJNdKgRMniVkg9TcA529WxE1-Q"
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

def get_project_line_items(tenant, project_id):

    headers = {
        "Authorization": f"Bearer {tokens[tenant]}",
        "Content-Type": "application/json"
    }

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

def physical_check():



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

def get_stock_usage_by_id(tenant, id):

    data = wg_get(tenant, "/Stock/GetStockUsageByProjectId", tokens[tenant], {"ProjectId": id, "MaxResultCount": 50})

    items = []

    for item in data["result"]["items"]:

        itemList = []

        itemList.append(item["productId"])

        itemList.append(item['product']['sku'])

        itemList.append(item['product']['name'])

        itemList.append(item['quantity'])

        items.append({
            
            "productId": itemList[0],

            "sku": itemList[1],

            "name": itemList[2],

            "quantity": itemList[3]
        })

    return items

def disc_report(tenant, results, skipCount):

    data = wg_get(tenant, "/Project/GetAllCompletedProjects", tokens[tenant], {"MaxResultCount": results, "sorting": "completedDate asc", "skipCount": skipCount})

    # Access the top-level result
    print("Total projects:", data["result"]["totalCount"])

    # Iterate through each project in items
    for item in data["result"]["items"]:

        #print (item)

        problem = False

        project_no = item.get("projectNo")
        name = item.get("projectName")
        status = item.get("status")
        id = item.get("id")
        startDate = item.get("startDate")
        completedDate = item.get("completedDate")
        
        line_items = (get_project_line_items(tenant, id)).get("line_items")

        #print ("Line items: ", line_items)

        stock_usage = get_stock_usage_by_id(tenant, id)

        stock_dict = {s["sku"]: s["quantity"] for s in stock_usage}
        message = ""

        for item in line_items:
            # Skip SKUs starting with "3"
            if not item["sku"]:
                continue

            if item["sku"].startswith("3"):
                continue

            if "freight" in item["sku"].lower():
                continue

            if "freight" in item["name"].lower():
                continue
        
            if "ship" in item["sku"].lower():
                continue

            if "ship" in item["name"].lower():
                continue

            sku = item["sku"]
            qty = item["quantity"]

            if sku not in stock_dict:
                message += (
                    f"missing stock usage for {sku} {item['name']} qty: {qty}\n"
                )
                problem = True
            else:
                stock_qty = stock_dict[sku]
                if qty != stock_qty:
                    message += (
                        f"quantity mismatch for {sku} {item['name']} (line_items qty: {qty}, stock_usage qty: {stock_qty})\n"
                    )
                    problem = True

        if problem:
            print(
                f"ID: {id} {project_no} - {name} ({status}) "
                f"Start: {startDate} Completed: {completedDate}"
            )
            print(message)
            # print("LINE:\n", line_items)
            # print("STOCK:\n", stock_dict)

def get_completed_project_ids_csv(csv_path, results=5):
    data = wg_get(
        "DR",
        "/Project/GetAllCompletedProjects",
        AUTH_DR,
        {"MaxResultCount": results, "sorting": "completedDate asc", "skipCount": 800},
    )

    rows = []  # will hold: [project number, project name, project line qty, issue, product code, product name, stock usage]

    print("Total projects:", data["result"]["totalCount"])

    # Iterate through each project in items
    for proj in data["result"]["items"]:
        problem = False

        project_no = proj.get("projectNo")
        proj_name = proj.get("projectName")
        proj_id = proj.get("id")
        proj_completed = proj.get("completedDate")

        # Pull project lines and stock usage for this project
        line_items = (get_project_line_items(proj_id) or {}).get("line_items", []) or []
        stock_usage = get_stock_usage_by_id(proj_id) or []

        # Fast lookup: sku -> quantity used
        stock_dict = {str(s.get("sku", "")).strip(): s.get("quantity", 0) for s in stock_usage}

        for li in line_items:
            sku = str(li.get("sku", "")).strip()
            name = li.get("name", "")
            qty = li.get("quantity", 0)

            # Skip SKUs starting with "3"
            if sku.startswith("3"):
                continue

            if sku not in stock_dict:
                # Missing stock usage
                rows.append([
                    project_no,
                    proj_name,
                    proj_completed,
                    qty,
                    "missing",
                    sku,
                    name,
                    ""  # no stock usage qty available
                ])
                problem = True
            else:
                stock_qty = stock_dict[sku]
                if qty != stock_qty:
                    # Quantity mismatch
                    rows.append([
                        project_no,
                        proj_name,
                        proj_completed,
                        qty,
                        "quantity",
                        sku,
                        name,
                        stock_qty
                    ])
                    problem = True

        if problem:
            print(f"Project {project_no} ({proj_name}) has issues")

    # Reverse order so older issues are at the top
    #rows.reverse()

    # Write CSV
    csv_path = Path(csv_path)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "project number",
            "project name",
            "completed date",
            "project line qty",
            "issue",
            "product code",
            "product name",
            "stock usage"
        ])
        writer.writerows(rows)

    print(f"Wrote {len(rows)} issue rows to {csv_path.resolve()}")



def main():

    csv_filename = f"{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}-stock_discrepancy.csv"

    #get_completed_project_ids_csv(csv_filename, 500)

    disc_report("CP", 100, 1100)

if __name__ == "__main__":
    main()
