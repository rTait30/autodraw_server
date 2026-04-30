from models import User


def _row_to_dict(row):
    out = {}
    for key, value in dict(row.__dict__).items():
        if key.startswith("_"):
            continue
        if hasattr(value, "isoformat"):
            try:
                out[key] = value.isoformat()
                continue
            except Exception:
                pass
        out[key] = value
    return out


def serialize_project_plain(project):
    project_dict = _row_to_dict(project)

    product_info = {
        "id": project.product.id if project.product else None,
        "name": project.product.name if project.product else None,
    }

    items = []
    for product in project.products:
        if getattr(product, "deleted", False):
            continue

        item = _row_to_dict(product)
        items.append({
            "id": item.get("id"),
            "name": item.get("label"),
            "productIndex": item.get("item_index"),
            "attributes": item.get("attributes") or {},
            "calculated": item.get("calculated") or {},
            "autodraw_record": item.get("autodraw_record") or {},
            "autodraw_meta": item.get("autodraw_meta") or {},
            "status": item.get("status", "pending"),
        })

    client_name = None
    if project.client_id:
        client_user = User.query.get(project.client_id)
        if client_user:
            client_name = client_user.username

    return {
        "id": project_dict.get("id"),
        "product": product_info,
        "general": {
            "id": project_dict.get("id"),
            "name": project_dict.get("name"),
            "client_id": project_dict.get("client_id"),
            "client_name": client_name,
            "due_date": project_dict.get("due_date"),
            "info": project_dict.get("info"),
            "order_type": (project.project_attributes or {}).get("order_type", "job"),
            "status": project.status.name if hasattr(project.status, "name") else project_dict.get("status"),
        },
        "project_attributes": project.project_attributes or {},
        "project_calculated": project.project_calculated or {},
        "products": items,
    }
