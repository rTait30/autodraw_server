# setup/build_and_deploy.py
import subprocess
import shutil
import os
from pathlib import Path

# Base path = repo root (parent of the setup folder)
BASE_DIR = Path(__file__).resolve().parent.parent

REACT_DIR = BASE_DIR / "react"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

# 1. Build the React project
subprocess.run("npm run build", cwd=REACT_DIR, check=True, shell=True)

# 2. Remove old files
try:
    (TEMPLATES_DIR / "index.html").unlink()
except FileNotFoundError:
    pass

shutil.rmtree(STATIC_DIR / "assets", ignore_errors=True)

# 3. Copy new files
shutil.copy(REACT_DIR / "dist" / "index.html", TEMPLATES_DIR / "index.html")
shutil.copytree(REACT_DIR / "dist" / "assets", STATIC_DIR / "assets")

print("Build and deploy complete.")
