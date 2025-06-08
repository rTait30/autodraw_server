# AutoDraw Server

This repository contains the backend and client assets for a small Flask application used internally by **Copelands**.  It exposes a REST API, HTML pages and client‑side JavaScript used for creating and managing canvas based projects such as covers or shade sails.

## Features

- **User authentication** – API endpoints allow users to register and login.  JWT tokens are issued for subsequent authenticated requests.  Roles include `admin`, `designer`, `estimator` and `client`.
- **Project management** – Users can create projects of different types (e.g. `cover`, `sail`).  Each project can store attributes and calculated values.  Projects are listed and viewed through the web UI.
- **Interactive forms** – The `New Project` pages provide forms for entering project parameters.  A canvas visualiser updates based on the values entered, and estimators can run extra calculation steps such as nesting panels.
- **Nesting API** – A dedicated endpoint `/copelands/nest_panels` calculates how to nest rectangular panels efficiently using the `rectpack` library.
- **Dashboard and roles** – Different HTML dashboards exist for admins, clients, estimators and designers.  The logged in role is stored in local storage and displayed in the navigation bar.
- **Discrepancy calculator** – A standalone page under `/copelands/discrepancy` allows checking sail corner discrepancies.

## Running

The application is a standard Flask project.  The main entry point is `app.py`.  When executed it starts a development server on port `5001` using SQLite databases.  The models are defined in `models.py` and tables are created automatically on the first request.

Static assets live in `static/` and HTML templates in `templates/`.

## Directory overview

- `app.py` – Flask application setup and route registration
- `endpoints/` – Blueprints for API and web routes
- `models.py` – SQLAlchemy models (`User`, `Project`, `ProjectAttribute`, `Log`)
- `static/js/` – Front‑end JavaScript including canvas utilities and project rendering logic
- `templates/` – Jinja templates for the web interface

## Development notes

There is no `requirements.txt` provided, but the project relies on typical Flask packages (`flask`, `flask_sqlalchemy`, `flask_jwt_extended`, `passlib`, `rectpack`).  A local Python environment should be set up with these dependencies installed.

## License

This project does not currently include an explicit license file.