# AGENTS

This file outlines how a Codex/ChatGPT agent should interact with and manage this Flask + React project.

---

## 🔧 PROJECT OVERVIEW

This is a fullstack application using:
- **Flask** as the backend server, providing RESTful API endpoints and serving frontend assets.
- **React** for the frontend, located in `/react/`, compiled to static assets for deployment.

---

## AGENT RESPONSIBILITIES

### Build & Deploy Frontend
Agents should **never** use React in development mode (`npm run dev` is not supported in production).
Instead, always:
1. Ensure virtual python environment is active and all dependencies from `requirements.txt` are installed
2. From the project root, run:

```
python build_and_deploy.py
```

This script:
- Builds the React app
- Copies the output to:
  - `templates/index.html`
  - `static/` directory for JS/CSS/assets

---

### Run the Backend
To launch the application in production/test:

```
python app.py
```

---

### API Awareness
Agents should know that:
- All backend APIs are mounted under `/api/`
- React should consume data from these endpoints
- Static files are served under `/static/` (built automatically)
- The main route (`/`) returns `index.html` from the templates folder

---

### File Locations
- React code: `/react`
- Flask entry point: `app.py`
- Build script: `build_and_deploy.py`
- Final frontend assets:
  - HTML: `templates/index.html`
  - Assets: `static/`

---

### Security & State
- Authentication is handled via tokens (e.g., JWT) and stored client-side.
- Agents should never embed secrets or credentials in frontend source files.
- React routes are public and controlled via frontend logic.

---

### Guidelines for Development
- Avoid direct manipulation of `static/` or `templates/` — use the build script.
- Do not run two servers (Flask and React dev server) in production mode.
- Ensure that API endpoints do not conflict with frontend routes.

---

## CODING STYLE

- React components should follow functional component style.
- Use modern React (hooks, `useState`, `useEffect`, etc.)
- All navigation is handled via `react-router-dom`.

---

## SUMMARY

| Task                  | How                                      |
|-----------------------|-------------------------------------------|
| Build React frontend  | `npm run build` in `/react`               |
| Deploy assets         | `python build_and_deploy.py`              |
| Run backend server    | `flask run`                               |
| API prefix            | `/api/`                                   |
| React location        | `/react`                                  |
| Final assets          | `static/` and `templates/index.html`      |

