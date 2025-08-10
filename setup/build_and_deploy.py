# setup/build_and_deploy.py
import subprocess
import shutil
import os
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
REACT_DIR = BASE_DIR / "react"
DIST_DIR = REACT_DIR / "dist"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
ASSETS_DST = STATIC_DIR / "assets"
ASSETS_SRC = DIST_DIR / "assets"

def run(cmd, cwd=None):
    print(f"$ {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    subprocess.run(cmd, cwd=cwd, check=True, shell=isinstance(cmd, str))

def main():
    # 0) Ensure destination dirs exist
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    # 1) Build React app
    # If node_modules might be missing on server, you can uncomment npm ci:
    # run(["npm", "ci"], cwd=REACT_DIR)
    run(["npm", "run", "build"], cwd=REACT_DIR)

    # 2) Validate build output
    if not DIST_DIR.exists():
        print(f"ERROR: Build output not found at {DIST_DIR}", file=sys.stderr)
        sys.exit(1)
    if not (DIST_DIR / "index.html").exists():
        print(f"ERROR: {DIST_DIR/'index.html'} not found", file=sys.stderr)
        sys.exit(1)
    if not ASSETS_SRC.exists():
        print(f"ERROR: {ASSETS_SRC} not found", file=sys.stderr)
        sys.exit(1)

    # 3) Remove old files (optional: only the assets folder)
    shutil.rmtree(ASSETS_DST, ignore_errors=True)

    # 4) Copy new files
    shutil.copy2(DIST_DIR / "index.html", TEMPLATES_DIR / "index.html")
    shutil.copytree(ASSETS_SRC, ASSETS_DST)

    print("Build and deploy complete.")

if __name__ == "__main__":
    main()
