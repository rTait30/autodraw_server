from models import Project
from endpoints.api.products import dispatch_document, get_product_documents
from endpoints.api.projects.services.project_serialization import serialize_project


STAFF_ROLES = {"admin", "estimator", "designer"}


def _is_staff(user):
    return user.role in STAFF_ROLES


def _get_project(project_id):
    project = Project.query.filter_by(id=project_id, deleted=False).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")
    return project


def _assert_project_access(user, project):
    if user.role == "client" and project.client_id != user.id:
        raise PermissionError("Unauthorized")


def _with_readiness(project, doc):
    result = {
        **doc,
        "disabled": False,
        "reason": None,
    }

    product_name = (project.product.name if project.product else "").upper()
    if product_name == "COVER" and doc.get("id") == "plot_file":
        attrs = project.project_attributes or {}
        has_nest_data = bool(
            attrs.get("nest") and
            (attrs.get("nested_panels") or attrs.get("all_meta_map"))
        )
        if not has_nest_data:
            result["disabled"] = True
            result["reason"] = "Run Check to generate nesting."

    return result


def _available_documents(user, project):
    if not project.product:
        return []

    documents = get_product_documents(
        project.product.name,
        include_staff_only=_is_staff(user),
    )
    return [_with_readiness(project, doc) for doc in documents]


def list_project_documents(user, project_id):
    project = _get_project(project_id)
    _assert_project_access(user, project)
    return _available_documents(user, project)


def generate_project_document(user, project_id, doc_id, **kwargs):
    project = _get_project(project_id)
    _assert_project_access(user, project)

    if not project.product:
        raise ValueError("Project has no product type")

    document = next(
        (doc for doc in _available_documents(user, project) if doc.get("id") == doc_id),
        None,
    )
    if not document:
        raise PermissionError("Document not available")

    if document.get("disabled"):
        raise ValueError(document.get("reason") or "Document is not ready")

    payload_project = kwargs.pop("project", None)
    if isinstance(payload_project, dict):
        plain_project = {
            **payload_project,
            "id": project.id,
            "product": {
                "id": project.product.id,
                "name": project.product.name,
            },
            "general": {
                **(payload_project.get("general") or {}),
                "id": project.id,
            },
        }
    else:
        plain_project = serialize_project(project)

    return dispatch_document(project.product.name, doc_id, plain_project, **kwargs)
