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


def _status_value(project):
    return project.status.name if hasattr(project.status, "name") else project.status


def _client_name(client_id):
    if not client_id:
        return None
    client_user = User.query.get(client_id)
    return client_user.username if client_user else None


def serialize_project(project, *, include_schema=False):
    project_dict = _row_to_dict(project)

    product_info = {
        "id": project.product.id if project.product else None,
        "name": project.product.name if project.product else None,
    }

    items = []
    for product in sorted(project.products, key=lambda row: row.item_index if row.item_index is not None else 0):
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

    data = {
        "id": project_dict.get("id"),
        "product": product_info,
        "general": {
            "id": project_dict.get("id"),
            "name": project_dict.get("name"),
            "client_id": project_dict.get("client_id"),
            "client_name": _client_name(project.client_id),
            "due_date": project_dict.get("due_date"),
            "info": project_dict.get("info"),
            "order_type": (project.project_attributes or {}).get("order_type", "job"),
            "status": _status_value(project),
        },
        "project_attributes": project.project_attributes or {},
        "products": items,
    }

    if include_schema:
        data["estimate_schema"] = project.estimate_schema or {}
        data["estimate_schema_evaluated"] = project.estimate_schema_evaluated or {}

    return data


def serialize_project_summary(project):
    return {
        "id": project.id,
        "product": {
            "id": project.product.id if project.product else None,
            "name": project.product.name if project.product else None,
        },
        "general": {
            "id": project.id,
            "name": project.name,
            "client_id": project.client_id,
            "client_name": _client_name(project.client_id),
            "due_date": project.due_date.isoformat() if project.due_date else None,
            "info": project.info,
            "order_type": (project.project_attributes or {}).get("order_type", "job"),
            "status": _status_value(project),
        },
    }
