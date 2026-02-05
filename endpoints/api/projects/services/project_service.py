from datetime import datetime, timezone
from http.client import HTTPException
from dateutil.parser import parse as parse_date
from flask import json
from pydantic_core import ValidationError
from sqlalchemy.orm.attributes import flag_modified
import math

from models import db, Project, ProjectProduct, User, Product, ProjectStatus
from endpoints.api.projects.services.calculation_service import calculate_project
from endpoints.api.projects.services.estimation_service import estimate_project_total
from endpoints.api.products import dispatch_document
from WG.workGuru import cp_make_lead, dr_make_lead
from WG.workGuru import wg_get
from WG.workGuru import wg_post

from autodraw_objects import *


def _enrich_wg_data(wg_data):
    """
    Enrich wg_data with additional information from WorkGuru API.
    
    Args:
        wg_data: dict containing at minimum 'project_number' and 'tenant'
        
    Returns:
        dict: The enriched wg_data with additional fields from the API response
    """
    project_number = wg_data.get("project_number")
    tenant = wg_data.get("tenant")
    
    if not project_number or not tenant:
        return wg_data
    
    try:
        # TODO: Implement actual WorkGuru API call here
        # Example structure:
        # response = requests.get(
        #     f"https://{tenant}.workguru.io/api/v1/projects/{project_number}",
        #     headers={"Authorization": f"Bearer {API_KEY}"}
        # )
        # if response.ok:
        #     api_data = response.json()
        #     wg_data.update(api_data)
        
        # Placeholder for API response data

        if tenant == "Copelands":
            tenant_code = "CP"
        if tenant == "D&R Liners":
            tenant_code = "DR"

        GetProjectId = wg_get(tenant_code, f"/Project/GetProjectIdByNumber?number=PR-{tenant_code}-{project_number}")

        projectId = GetProjectId.get("result", None)

        print (f"WorkGuru API: Fetched project ID {projectId} for project number {project_number} under tenant {tenant}")

        GetProjectById = wg_get(tenant_code, f"/Project/GetProjectById?id={projectId}")



        '''

        dueDate
        price
        description
        friehgtMethod
        
        '''

        api_response = {
            
            "projectId": projectId,
            "dueDate": GetProjectById.get("result", {}).get("dueDate", None),
            "PO": GetProjectById.get("result", {}).get("invoices", [{}])[0].get("clientPurchaseOrder", None),
            "description": GetProjectById.get("result", {}).get("description", None),
            "freightMethod": GetProjectById.get("result", {}).get("freightMethod", None),
        }  # Replace with actual API response
        
        # Merge API response into wg_data
        if api_response:
            wg_data = {**wg_data, **api_response}
            
    except Exception as e:
        print(f"Failed to enrich wg_data from WorkGuru API: {e}")
    
    return wg_data


def _as_int(v):
    try:
        return int(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None

def create_project(user, data):
    general = data.get("general") or {}
    project_attributes = data.get("project_attributes") or {}
    project_calculated = data.get("project_calculated") or {}
    products_payload = data.get("products") or []

    # Only allow these fields from "general" to map directly to Project
    allowed_fields = {"name", "status", "due_date", "info", "client_id"}
    project_data = {k: v for k, v in general.items() if k in allowed_fields}

    # ---- validate & normalize name ----
    name = (project_data.get("name") or "").strip()
    if not name or len(name) == 0 or len(name) > 200:
        raise ValueError("name is required and must be between 1 and 200 characters")
    project_data["name"] = name

    # ---- normalize due_date (string -> date or None) ----
    due_date = project_data.get("due_date")
    if due_date:
        try:
            project_data["due_date"] = parse_date(due_date)
        except Exception:
            raise ValueError(f"Invalid due_date format: {due_date}")
    else:
        project_data["due_date"] = None

    # ---- coerce status into ProjectStatus enum if present ----
    if "status" in project_data and project_data["status"] is not None:
        st = project_data["status"]
        if not isinstance(st, ProjectStatus):
            try:
                project_data["status"] = ProjectStatus(st)
            except Exception:
                try:
                    project_data["status"] = ProjectStatus[st]
                except Exception:
                    raise ValueError(f"Invalid status: {st}")

    # ---- unified product id (required on create) ----
    product_id = _as_int(data.get("product_id"))
    if product_id is None:
        raise ValueError("product_id is required")
    if not db.session.get(Product, product_id):
        raise ValueError(f"Product id {product_id} not found")

    # ---- determine client_id ----
    if user.role == "client":
        target_client_id = user.id
    else:
        target_client_id = _as_int(project_data.get("client_id"))
        if target_client_id is None:
            # Fallback: if staff creates a project without specifying a client, assign it to themselves
            target_client_id = user.id

    # --- CREATE ---
    project = Project(
        name=project_data["name"],
        status=project_data.get("status") or ProjectStatus.awaiting_deposit,
        due_date=project_data.get("due_date"),
        info=project_data.get("info"),
        client_id=target_client_id,
        product_id=product_id,
        project_attributes=project_attributes,
        project_calculated=project_calculated,
    )
    db.session.add(project)
    db.session.flush()  # get project.id for products

    # After we know product_id, copy default schema into project.estimate_schema
    product = db.session.get(Product, product_id) if product_id is not None else None
    if product and product.default_schema:
        project.schema_id = product.default_schema.id       # optional "came from" pointer
        project.estimate_schema = product.default_schema.data

        # Optionally compute an initial estimate_total
        # REMOVED: This was causing "variable not defined" errors because it runs the product schema 
        # against global project attributes only, missing per-product fields like cableSize.
        # The real calculation happens in estimate_project_total(project) below.
        pass

    # ---------- Unified enrichment (single raw format) ----------
    if project.product:
        try:
            calc_input = {
                "product_id": project.product_id,
                "product_type": project.product.name,
                "type": project.product.name,
                "general": general,
                "project_attributes": project_attributes,
                "products": products_payload,
            }
            enriched = calculate_project(project.product.name, calc_input)
            if isinstance(enriched.get("project_attributes"), dict):
                project.project_attributes = enriched["project_attributes"]
            else:
                project.project_attributes = project_attributes
            if isinstance(enriched.get("products"), list):
                products_payload = enriched["products"]
            flag_modified(project, "project_attributes")
        except Exception as e:
            print(f"Enrichment failed for project {project.id}: {e}")
            project.project_attributes = project_attributes
    else:
        project.project_attributes = project_attributes

    # ---------- Enrich wg_data from WorkGuru API if present ----------
    if project.project_attributes and isinstance(project.project_attributes.get("wg_data"), dict):
        wg_data = project.project_attributes["wg_data"]
        if wg_data.get("project_number") and wg_data.get("tenant"):
            enriched_wg_data = _enrich_wg_data(wg_data)
            project.project_attributes["wg_data"] = enriched_wg_data
            flag_modified(project, "project_attributes")
    
    # ---------- Check for discrepancy problems in shade_sail (product_id == 2) on create ----------
    if product_id == 2:  # Only on create for shade_sail
        discrepancy_sails = []
        for idx, p in enumerate(products_payload):
            if p.get("attributes", {}).get("discrepancyProblem") == True:
                label = p.get("name") or p.get("attributes", {}).get("label") or f"Item {idx + 1}"
                discrepancy_sails.append(label)
        if discrepancy_sails:
            raise ValueError(f"Discrepancy problems in sails: {', '.join(discrepancy_sails)}")
    
    # Deprecated: keep project_calculated for backward compat but consider empty
    project.project_calculated = project_calculated or {}

    # ---------- Replace products from payload ----------
    # Mark existing products as deleted instead of hard deleting
    ProjectProduct.query.filter_by(project_id=project.id, deleted=False).update({"deleted": True})

    for idx, p in enumerate(products_payload):
        if not isinstance(p, dict):
            raise ValueError("each product must be an object")

        attrs = p.get("attributes") or {}
        if not isinstance(attrs, dict):
            raise ValueError("product.attributes must be an object")

        item_index = p.get("productIndex", idx)
        label = p.get("name") or attrs.get("label") or f"Item {idx + 1}"
        calc = p.get("calculated") or {}
        autodraw_record = p.get("autodraw_record") or {}
        autodraw_meta = p.get("autodraw_meta") or {}
        status = p.get("status", "pending")

        pp = ProjectProduct(
            project_id=project.id,
            item_index=item_index,
            label=label,
            attributes=attrs,
            calculated=calc,
            autodraw_record=autodraw_record,
            autodraw_meta=autodraw_meta,
            status=status,
        )
        db.session.add(pp)

    # --- Compute per-item and project totals (row-only evaluator) ---
    try:
        db.session.flush() # Ensure products are visible
        estimate_project_total(project)
    except Exception as e:
        print(f"Item/project estimate failed: {e}")
        import traceback
        traceback.print_exc()
 
    db.session.commit()

    # WorkGuru submission
    if (data.get("product_id") == 1 and data.get("submitToWG") == True):
        # Resolve WorkGuru Client ID
        wg_client_id = "178827" # Default NSC for DR
        if project.client_id:
            from models import User
            client_user = db.session.get(User, project.client_id)
            if client_user and client_user.wg_id and client_user.tenant == "DR":
                 wg_client_id = str(client_user.wg_id)

        print (f"Submitting cover project to WorkGuru (Client WG ID: {wg_client_id})...")
        name = (data.get("general").get("name") or "").strip()
        description = ""
        for cover in data.get("products", []):
            attributes = cover.get("attributes", {})
            cover_quantity = attributes.get("quantity", 0)
            cover_length = attributes.get("length", 0)
            cover_width = attributes.get("width", 0)
            cover_height = attributes.get("height", 0)

            stay_puts = attributes.get("stayputs", False)
            stay_puts_str = "; Stay Puts" if stay_puts else ""

            description += (f"{cover_quantity} x PVC Cover\n{cover_length}x{cover_width}x{cover_height}mm {stay_puts_str}\n")


        estimated_price = project.estimate_total or 0.0
        
        dr_make_lead(
            name=name,
            description=description,
            budget=math.ceil(estimated_price) if estimated_price else 0,
            category="2a",
            go_percent=100,
            client_wg_id=wg_client_id
        )

    if (data.get("product_id") == 2 and data.get("submitToWG") == True):
        # Resolve WorkGuru Client ID
        wg_client_id = "194156" # Default for CP
        wg_name = None
        if project.client_id:
            from models import User
            client_user = db.session.get(User, project.client_id)
            if client_user and client_user.wg_id and client_user.tenant == "CP":
                 wg_client_id = str(client_user.wg_id)
                 wg_name = str(client_user.username)
                 
        print (f"Submitting shade sail project to WorkGuru (Client WG ID: {wg_client_id})...")
        project_name = data.get("general").get("name") or ""
        
        if wg_name:
            name = (f"{wg_name} - {project_name}")
        else:
            name = project_name
            
        description = ""
        sailCount = len(data.get("products", []))
        for sail in data.get("products", []):

            sail_name = sail.get("name", "")
            if sail_name[:4] == "Item":
                productIndex = sail.get("productIndex", 0)
                sail_name = f"Sail {productIndex + 1}"
            attributes = sail.get("attributes", {})
            
            edgeMeter = attributes.get("edgeMeter", 0)

            fabric_type = attributes.get("fabricType", "")

            colour = attributes.get("colour", "")

            corners = attributes.get("pointCount", "")

            cableSize = attributes.get("cableSize", "")

            if attributes.get("fabricCategory", "") == "PVC":
                description += "PVC Membrane "

            if sailCount > 1: description += (f"{sail_name}: {edgeMeter}EM, {fabric_type} {colour}, {corners}C, {cableSize}mm Cable")
            else: description += (f"{edgeMeter}EM, {fabric_type} {colour}, {corners}C, {cableSize}mm Cable")

            for sailtrack in (attributes.get("sailTracks", [])):
                
                description += (f", ST From {sailtrack[0]} to {sailtrack[1]}")

            description += "\n"

        estimated_price = project.estimate_total or 0.0

        if attributes.get("fabricCategory", "") == "PVC":
            category = "1b"
        else:
            category = "1a"
        
        cp_make_lead(
            name=name,
            description=description,
            budget=math.ceil(estimated_price) if estimated_price else 0,
            category=category,
            go_percent=100,
            client_wg_id=wg_client_id
        )

    #autodraw

    # 1. GET THE CONFIG (The Recipe)
    # Fetch the specific product type definition from SQL
    '''
    if project.product:
        print(project.product.autodraw_config)
    else:
        print(f"Product type id {project.product_id} not found for autodraw setup.")


    record_template = generate_record_template(
        product_id=str(project.product_id),
        product_type=project.product.name,
        config=project.product.autodraw_config
    )

    print ("Generated autodraw_record template:\n", record_template)

    '''
    return project

def update_project(user, project_id, data):
    print(f"[DEBUG] update_project: user_id={user.id if user else 'None'}, project_id={project_id}")
    general = data.get("general") or {}
    project_attributes = data.get("project_attributes")
    project_calculated = data.get("project_calculated")
    products_payload = data.get("products")
    new_product_id = data.get("product_id")
    estimate_total = data.get("estimate_total")
    
    if new_product_id is not None:
        try:
            new_product_id = int(new_product_id)
        except (TypeError, ValueError):
            raise ValueError("product_id must be an integer")

    # Ensure project exists
    project = Project.query.filter_by(id=project_id, deleted=False).first()
    if not project:
        raise ValueError("Project not found")

    # Clients may only update their own projects
    if user.role == "client":
        if project.client_id != user.id:
            raise ValueError("Unauthorized")

    # ---------- Update general (Project) fields ----------
    if general.get("enabled", True):
        if "name" in general:
            project.name = (general["name"] or "").strip()
        if "client_id" in general:
            cid = general["client_id"]
            if cid in (None, "", "null"):
                project.client_id = None
            else:
                try:
                    project.client_id = int(cid)
                except (TypeError, ValueError):
                    raise ValueError("client_id must be an integer or empty")
        if "due_date" in general:
            dd = general["due_date"]
            if dd in (None, "", "null"):
                project.due_date = None
            elif isinstance(dd, str):
                try:
                    project.due_date = parse_date(dd)
                except Exception:
                    raise ValueError(f"Invalid due_date format: {dd}")
            else:
                project.due_date = dd
        if "info" in general:
            project.info = general["info"]
        if "status" in general:
            st = general["status"]
            if st is not None:
                if isinstance(st, ProjectStatus):
                    project.status = st
                elif isinstance(st, str):
                    try:
                        project.status = ProjectStatus[st]
                    except KeyError:
                        try:
                            project.status = ProjectStatus(st)
                        except ValueError:
                            raise ValueError(f"Invalid status: {st}")

    # ---------- Optional product change ----------
    if new_product_id is not None and new_product_id != project.product_id:
        if not db.session.get(Product, new_product_id):
            raise ValueError(f"Product id {new_product_id} not found")
        project.product_id = new_product_id

    # ---------- Update estimate total if provided ----------
    if estimate_total is not None:
        try:
            project.estimate_total = float(estimate_total)
        except (TypeError, ValueError):
            print(f"Invalid estimate_total: {estimate_total}")

    # ---------- Update project-level JSON if provided ----------
    if project_attributes is not None and project.product:
        try:
            calc_input = {
                "product_id": project.product_id,
                "product_type": project.product.name,
                "type": project.product.name,
                "general": general,
                "project_attributes": project_attributes,
                "products": products_payload if products_payload is not None else [],
            }
            enriched = calculate_project(project.product.name, calc_input)
            if isinstance(enriched.get("project_attributes"), dict):
                project.project_attributes = enriched["project_attributes"]
            else:
                project.project_attributes = project_attributes
            if isinstance(enriched.get("products"), list) and products_payload is not None:
                products_payload = enriched["products"]
            flag_modified(project, "project_attributes")
        except Exception as e:
            print(f"Enrichment failed for project {project.id}: {e}")
            project.project_attributes = project_attributes
    elif project_attributes is not None:
        project.project_attributes = project_attributes

    # Deprecated: project_calculated kept for backward compat
    if project_calculated is not None:
        project.project_calculated = project_calculated

    # ---------- Update products if provided ----------
    if products_payload is not None:
        # Collect item_indices from payload
        payload_item_indices = {p.get("productIndex", idx) for idx, p in enumerate(products_payload)}
        
        for idx, p in enumerate(products_payload):
            if not isinstance(p, dict):
                raise ValueError("each product must be an object")

            attrs = p.get("attributes") or {}
            if not isinstance(attrs, dict):
                raise ValueError("product.attributes must be an object")

            item_index = p.get("productIndex", idx)
            label = p.get("name") or attrs.get("label") or f"Item {idx + 1}"
            calc = p.get("calculated") or {}
            autodraw_record = p.get("autodraw_record") or {}
            autodraw_meta = p.get("autodraw_meta") or {}
            status = p.get("status", "pending")

            pp = ProjectProduct.query.filter_by(project_id=project.id, item_index=item_index, deleted=False).first()
            if pp:
                # Update existing
                pp.label = label
                pp.attributes = attrs
                pp.calculated = calc
                pp.autodraw_record = autodraw_record
                pp.autodraw_meta = autodraw_meta
                pp.status = status
                flag_modified(pp, "attributes")
                flag_modified(pp, "calculated")
                flag_modified(pp, "autodraw_record")
                flag_modified(pp, "autodraw_meta")
            else:
                # Create new
                pp = ProjectProduct(
                    project_id=project.id,
                    item_index=item_index,
                    label=label,
                    attributes=attrs,
                    calculated=calc,
                    autodraw_record=autodraw_record,
                    autodraw_meta=autodraw_meta,
                    status=status,
                )
                db.session.add(pp)

        # Mark products with item_indices not in payload as deleted
        ProjectProduct.query.filter_by(project_id=project.id, deleted=False).filter(
            ProjectProduct.item_index.not_in(payload_item_indices)
        ).update({"deleted": True})

    # Check for discrepancies and raise error if found - enforces valid state on save
    if project.project_attributes and project.project_attributes.get("discrepancyProblem"):
         raise ValueError("Project has global discrepancies. Please resolve before saving.")
         
    if products_payload is not None:
         # ProjectProduct objects are not flushed yet so checking payload directly
         for idx, p in enumerate(products_payload):
             attrs = p.get("attributes") or {}
             if attrs.get("discrepancyProblem"):
                 raise ValueError(f"Product #{idx+1} ({p.get('label', 'Item')}) has dimension discrepancies.")

    # ---------- Enrich wg_data from WorkGuru API if present ----------
    if project.project_attributes and isinstance(project.project_attributes.get("wg_data"), dict):
        wg_data = project.project_attributes["wg_data"]
        if wg_data.get("project_number") and wg_data.get("tenant"):
            enriched_wg_data = _enrich_wg_data(wg_data)
            project.project_attributes["wg_data"] = enriched_wg_data
            flag_modified(project, "project_attributes")

    db.session.commit()
    return project

def list_projects(user, client_id=None):
    query = Project.query.filter_by(deleted=False)
    if user.role == "client":
        query = query.filter_by(client_id=user.id)
    else:
        if client_id:
            try:
                query = query.filter_by(client_id=int(client_id))
            except ValueError:
                raise ValueError("client_id must be an integer")

    projects = query.all()
    result = []

    for project in projects:
        client_user = User.query.get(project.client_id)

        result.append({
            "id": project.id,
            "name": project.name,
            "type": project.product.name if project.product else None,
            "status": project.status.name if hasattr(project.status, "name") else project.status,
            "due_date": project.due_date.isoformat() if project.due_date else None,
            "info": project.info,
            "client": client_user.username if client_user else None,
        })
    return result

def list_deleted_projects(user, client_id=None):
    """List soft deleted projects (same authorization as list_projects)."""
    query = Project.query.filter_by(deleted=True)
    if user.role == "client":
        query = query.filter_by(client_id=user.id)
    else:
        if client_id:
            try:
                query = query.filter_by(client_id=int(client_id))
            except ValueError:
                raise ValueError("client_id must be an integer")

    projects = query.all()
    result = []

    for project in projects:
        client_user = User.query.get(project.client_id)

        result.append({
            "id": project.id,
            "name": project.name,
            "type": project.product.name if project.product else None,
            "status": project.status.name if hasattr(project.status, "name") else project.status,
            "due_date": project.due_date.isoformat() if project.due_date else None,
            "info": project.info,
            "client": client_user.username if client_user else None,
        })

    return result

def get_project(user, project_id):
    project = Project.query.filter_by(id=project_id, deleted=False).first()
    if not project:
        raise ValueError("Project not found")

    # --- Authorization ---
    if user.role == "client" and project.client_id != user.id:
        raise ValueError("Unauthorized")

    return project


def list_all_products():
    """Return all Product rows."""
    return Product.query.all()


def list_pricelist_items():
    """Return products formatted for /pricelist API."""
    products = Product.query.all()
    return [
        {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "description": p.description,
            "price": p.price,
            "unit": p.unit,
            "active": p.active,
        }
        for p in products
    ]


def list_client_users():
    """Return all client User rows."""
    return User.query.filter_by(role="client").all()


def list_project_products_for_editor(project_id, order_by_item_index=False):
    """Return ProjectProduct rows formatted for save/edit responses."""
    query = ProjectProduct.query.filter_by(project_id=project_id, deleted=False)
    if order_by_item_index:
        query = query.order_by(ProjectProduct.item_index)

    return [
        {
            "id": pp.id,
            "itemIndex": pp.item_index,
            "name": pp.label,
            "attributes": pp.attributes,
            "calculated": pp.calculated,
            "autodraw_record": pp.autodraw_record or {},
            "autodraw_meta": pp.autodraw_meta or {},
            "status": pp.status or "pending",
        }
        for pp in query.all()
    ]

def _serialize_project_plain(prj):
    # Generic SQLAlchemy row -> plain dict (columns only)
    def _row_to_dict(row):
        out = {}
        for k, v in dict(row.__dict__).items():
            if k.startswith("_"):
                continue
            # Convert datetimes safely
            if hasattr(v, "isoformat"):
                try:
                    out[k] = v.isoformat()
                    continue
                except Exception:
                    pass
            out[k] = v
        return out

    proj_dict = _row_to_dict(prj)

    # Normalize product info to simple name/id for consumers
    product_info = {
        "id": prj.product.id if prj.product else None,
        "name": prj.product.name if prj.product else None,
    }

    # Serialize related products rows generically
    items = []
    for p in prj.products:
        # Skip deleted products
        if getattr(p, 'deleted', False):
            continue
            
        item = _row_to_dict(p)
        # Keep only fields commonly used on the frontend
        item = {
            "id": item.get("id"),
            "name": item.get("label"),
            "productIndex": item.get("item_index"),
            "attributes": item.get("attributes") or {},
            "calculated": item.get("calculated") or {},
            "autodraw_record": item.get("autodraw_record") or {},
            "autodraw_meta": item.get("autodraw_meta") or {},
            "status": item.get("status", "pending"),
        }
        items.append(item)

    # Look up client_name from database
    client_name = None
    if prj.client_id:
        client_user = User.query.get(prj.client_id)
        if client_user:
            client_name = client_user.username

    # Build final plain object; include project JSON blobs untouched
    return {
        "id": proj_dict.get("id"),
        "product": product_info,
        "general": {
            "id": proj_dict.get("id"),
            "name": proj_dict.get("name"),
            "client_id": proj_dict.get("client_id"),
            "client_name": client_name,
            "due_date": proj_dict.get("due_date"),
            "info": proj_dict.get("info"),
            "status": prj.status.name if hasattr(prj.status, "name") else proj_dict.get("status"),
        },
        "project_attributes": prj.project_attributes or {},
        "project_calculated": prj.project_calculated or {},
        "products": items,
    }



def generate_document_for_project(user, project_id, doc_id, **kwargs):
    project = Project.query.filter_by(id=project_id, deleted=False).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    if not project.product:
        raise ValueError("Project has no product type")

    # Basic authorization check (can be refined per document type if needed)
    # For now, assume if you can see the project, you can generate docs, 
    # unless specific docs have restrictions (handled in generator or here).
    
    product_type = project.product.name
    plain_project = _serialize_project_plain(project)
    
    return dispatch_document(product_type, doc_id, plain_project, **kwargs)





# ----------- AUTODRAW ---------------------


# --- THE GENERATOR ---
def generate_record_template(product_id: str, product_type: str, config: dict) -> dict:
    """
    Generates a blank 'autodraw_record' from the config.
    Returns a CLEAN DICTIONARY (JSON Compatible) with dates as strings.
    """
    
    # --- A. Build the Raw Data Structure ---
    steps_dict = {}
    
    for i, step_conf in enumerate(config["steps"]):
        step_key = step_conf["key"]
        
        # LOGIC: First step is "waiting_for_input", others "locked"
        step_status = "waiting_for_input" if i == 0 else "locked"
        
        substeps_dict = {}
        for j, sub_conf in enumerate(step_conf["substeps"]):
            sub_key = sub_conf["key"]
            
            # LOGIC: First substep of active step is "pending", others "locked"
            if step_status == "waiting_for_input" and j == 0:
                sub_status = "pending"
            else:
                sub_status = "locked"
            
            substeps_dict[sub_key] = {
                "status": sub_status,
                "label": sub_conf["label"],
                "geometry_data": [],
                "metadata": {}
            }
            
        steps_dict[step_key] = {
            "status": step_status,
            "label": step_conf["label"],
            "substeps": substeps_dict
        }

    raw_record = {
        "product_id": product_id,
        "product_type": product_type,
        "created_at": datetime.now(timezone.utc),
        "steps": steps_dict
    }

    # --- B. Validation & Serialization ---
    try:
        # 1. Validate structure using Pydantic
        model = ProductRecord(**raw_record)
        
        # 2. Convert to JSON String (Handles DateTime -> String conversion automatically)
        json_str = model.json()
        
        # 3. Convert back to Python Dict (Now it's pure JSON data)
        clean_dict = json.loads(json_str)
        
        return clean_dict

    except ValidationError as e:
        print(f"CRITICAL: Template generation failed validation.\n{e}")
        raise e


def delete_project(user, project_id):
    """Mark a project as deleted (soft delete)."""
    project = Project.query.filter_by(id=project_id, deleted=False).first()
    if not project:
        raise ValueError("Project not found")

    # Authorization check
    if user.role == "client" and project.client_id != user.id:
        raise ValueError("Unauthorized")

    # Mark the project as deleted
    project.deleted = True

    # Also mark all associated project products as deleted
    ProjectProduct.query.filter_by(project_id=project_id, deleted=False).update({"deleted": True})

    db.session.commit()
    return project


def delete_project_product(user, project_product_id):
    """Mark a project product as deleted (soft delete)."""
    product = ProjectProduct.query.filter_by(id=project_product_id, deleted=False).first()
    if not product:
        raise ValueError("Project product not found")

    # Check if user has access to the project
    project = Project.query.filter_by(id=product.project_id, deleted=False).first()
    if not project:
        raise ValueError("Project not found")

    if user.role == "client" and project.client_id != user.id:
        raise ValueError("Unauthorized")

    product.deleted = True
    db.session.commit()
    return product


def recover_project(user, project_id):
    """Recover a soft deleted project and all its products."""
    project = Project.query.filter_by(id=project_id, deleted=True).first()
    if not project:
        raise ValueError("Project not found or not deleted")

    # Authorization check
    if user.role == "client" and project.client_id != user.id:
        raise ValueError("Unauthorized")

    # Mark the project as not deleted
    project.deleted = False

    # Also recover all associated project products
    ProjectProduct.query.filter_by(project_id=project_id, deleted=True).update({"deleted": False})

    db.session.commit()
    return project
