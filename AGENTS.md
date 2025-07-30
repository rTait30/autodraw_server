# AGENTS GUIDE

This file is for agents working with this Flask + React project.

## Quick Overview

- **Backend:** Flask REST API, serves static files.
- **Frontend:** React app in `/react/`, built assets go to `/static/` and `/templates/index.html`.

## How to Build & Run

- Build everything:  
  ```
  python setup.py
  ```
- Start the backend:  
  ```
  python app.py
  ```

## API & Files

- APIs are under `/api/`
- React uses these APIs for data
- Static files: `/static/`
- Main HTML: `/templates/index.html`
- React code: `/react`
- Flask entry: `app.py`
- Build script: `build_and_deploy.py`

## Security

- Auth uses JWT tokens, stored client-side.
- Never put secrets in frontend code.

## Development Rules

- Only use the build script for static and template files.
- Do not run Flask and React dev servers together in production.
- Avoid API/frontend route conflicts.

## Coding Style

- Use React functional components and hooks.
- Navigation: `react-router-dom`.

---

**Agents should NOT read `README.md` or anything in
