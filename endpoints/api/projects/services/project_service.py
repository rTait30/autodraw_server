from endpoints.api.projects.services.project_crud import (
    create_project,
    update_project,
    list_projects,
    list_deleted_projects,
    get_project,
    list_all_products,
    list_pricelist_items,
    list_client_users,
    list_project_products_for_editor,
    generate_document_for_project,
    delete_project,
    delete_project_product,
    recover_project,
    hard_delete_project,
)

from endpoints.api.projects.services.project_calculator import (
    generate_record_template
)

# Re-exporting for backward compatibility
