import requests

# Replace with your actual API base URL and authentication details
BASE_URL = "https://api.workguru.io"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjE1ODU4IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3IiwiQXNwTmV0LklkZW50aXR5LlNlY3VyaXR5U3RhbXAiOiJTU0pNTU9QRVRUUDdPTFZPT1dNWlg1Q1dFNExVSjI3WiIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFQSSIsImh0dHA6Ly93d3cuYXNwbmV0Ym9pbGVycGxhdGUuY29tL2lkZW50aXR5L2NsYWltcy90ZW5hbnRJZCI6IjgyNSIsIkFwcGxpY2F0aW9uX1VzZXJFbWFpbCI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3QG5vcmVwbHkuY29tIiwiQXBwbGljYXRpb25fVXNlckZpcnN0TmFtZSI6ImI5ODAzMmY5MzQ1ODQ2NTQ4N2RjMjk4MmUwYTU0NmI3IiwiQXBwbGljYXRpb25fVXNlckxhc3ROYW1lIjoiQ1BfV0dfQVVUT01BVElPTiIsInN1YiI6IjE1ODU4IiwianRpIjoiMWZjZTllMTEtZDliYi00YWU4LWI5YTktMDIwMmZkY2Q3ZTlhIiwiaWF0IjoxNzU3NTQyMTM3LCJuYmYiOjE3NTc1NDIxMzcsImV4cCI6MTc1NzYyODUzNywiaXNzIjoiUnlwZSIsImF1ZCI6IlJ5cGUifQ.ofS6d-DEhy4QlcnDHVWP194a3Z8YRred2MfkF7a7Esw"

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

        return productLineItemsSummary
    
    except requests.RequestException as e:
        print(f"Error fetching line items for project {project_id}: {e}")
        return []

def main():
    
    
    projects = get_all_projects()

    for project in projects:
        print ()
        print (project["projectName"])
        print (project["projectNo"])
        print ("Line items:")

        line_items = get_project_line_items(project["id"])

        print (line_items)

        if (len(line_items) < 1):
            input("Problem")

if __name__ == "__main__":
    main()
