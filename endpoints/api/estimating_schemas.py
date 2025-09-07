# api/estimating_schemas_api.py
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required

from models import db, EstimatingSchema, ProjectType
from endpoints.api.auth.utils import role_required, _json, _user_by_credentials

estimating_schemas_api_bp = Blueprint(
    "est_schemas_api",
    __name__,
    url_prefix="/api/est_schemas"
)

@estimating_schemas_api_bp.route("/create", methods=["POST"])
@role_required("estimator")
def create_schema():
    """
    Create a new estimating schema attached to a project type.

    Body:
    {
      "project_type_id": 3,          // required
      "data": { ... schema JSON ... }, // required
      "name": "Cover Estimating v1", // optional (defaults to 'Untitled Schema')
      "version": 1                   // optional (default 1)
    }

    Returns: { "id": <new_schema_id> }
    """
    user = g.current_user(required=True)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    project_type_id = payload.get("project_type_id")
    data = payload.get("data")
    name = (payload.get("name") or "Untitled Schema").strip()
    version = int(payload.get("version") or 1)

    if not project_type_id:
        return jsonify({"error": "project_type_id is required"}), 400
    if data is None:
        return jsonify({"error": "data (schema JSON) is required"}), 400

    pt = ProjectType.query.get(project_type_id)
    if not pt:
        return jsonify({"error": f"ProjectType {project_type_id} not found"}), 404

    schema = EstimatingSchema(
        project_id=None,
        project_type_id=project_type_id,
        name=name,
        data=data,
        is_default=False,
        version=version,
    )
    db.session.add(schema)
    db.session.commit()

    return jsonify({"id": schema.id}), 201



@estimating_schemas_api_bp.route("/get_by_type", methods=["POST"])
@role_required("estimator")
def get_schemas_by_type():
    """
    Get all estimating schemas for a specific project type.

    Body:
    {
      "project_type_id": 3
    }

    Returns: [ { "id": <schema_id>, "name": <schema_name>, "version": <schema_version> }, ... ]
    """
    user = current_user(required=True)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    project_type_id = payload.get("project_type_id")

    if not project_type_id:
        return jsonify({"error": "project_type_id is required"}), 400

    schemas = EstimatingSchema.query.filter_by(project_type_id=project_type_id).all()
    return jsonify([{"id": s.id, "name": s.name, "version": s.version} for s in schemas]), 200
