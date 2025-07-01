# Flask + React Fullstack Application

This is a fullstack application built with a **Flask** backend and a **React** frontend. The React project is located in the `/react` directory and is compiled into static assets which are served by Flask. Flask also provides RESTful API endpoints for the frontend to consume.

---

## 🔧 Project Structure

```
project-root/
├── app.py                # Flask entry point
├── api/                  # Flask Blueprints for API routes
├── static/               # Compiled React assets (copied here after build)
│   └── ...
├── templates/
│   └── index.html        # The React index.html (after build)
├── react/                # Source code for the React app
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── ...
├── build_and_deploy.py   # Script to build React and copy assets to Flask
└── ...
```

---

## 🚀 How It Works

- The React frontend is **built using Vite** with `npm run build` inside `/react/`.
- A deployment script (`build_and_deploy.py`) runs the build process and copies:
  - the built static files to `/static`
  - `index.html` to `/templates`
- Flask serves:
  - Static files (JS/CSS/images) from `/static`
  - The main React app via `render_template("index.html")` on unmatched routes
  - API endpoints under `/api/...`

---

## 🛠️ Setup & Development

### 1. Backend Setup (Flask)

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Frontend Setup (React)

```bash
cd react
npm install
```

---

## 🏗️ Building the Frontend

Always build the React app before running Flask in production:

```bash
# From project root
python build_and_deploy.py
```

This will:
- Run `npm run build` in `/react`
- Copy the output to the Flask `/static` and `/templates/index.html`

---

## 🧪 Running the App

```bash
python app.py
```

Access the app at [http://localhost:5001](http://localhost:5001).

---

## 🔐 API Endpoints

All API routes are prefixed with `/api/`, for example:

- `GET /api/projects`
- `POST /api/login`

---

## 📁 Deployment Notes

- You **should not use React’s dev server** (`npm run dev`) in production.
- The Flask server serves the compiled React app and handles routing via `index.html`.
- All API routes should avoid conflicting with React frontend routes.

---

## 📜 License

MIT License

---

## ✍️ Author

Built by Ryan.
