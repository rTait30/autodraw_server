# setup/build_and_deploy.py
import subprocess
import shutil
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
REACT_DIR = BASE_DIR / "react"
DIST_DIR = REACT_DIR / "dist"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
ASSETS_SRC = DIST_DIR / "assets"
ASSETS_DST = STATIC_DIR / "assets"

def _print_cmd(cmd, cwd=None):
    text = cmd if isinstance(cmd, str) else " ".join(cmd)
    print(f"$ {text}  (cwd={cwd or os.getcwd()})")

def run(cmd, cwd=None, env=None):
    _print_cmd(cmd, cwd)
    subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        env=env,
        check=True
    )

def which_npm():
    # Prefer Windows launchers if on Windows
    if os.name == "nt":
        for name in ("npm.cmd", "npm.exe", "npm"):
            p = shutil.which(name)
            if p:
                return p
        return None
    # POSIX
    return shutil.which("npm")

def run_npm(*args):
    """Run npm in a cross-platform safe way."""
    npm = which_npm()
    if not npm:
        raise FileNotFoundError(
            "npm not found on PATH. Install Node.js or add it to PATH."
        )
    # On Windows, .cmd/.bat should be invoked via cmd.exe when shell=False
    if os.name == "nt" and npm.lower().endswith((".cmd", ".bat")):
        cmd = ["cmd.exe", "/c", npm, *args]
    else:
        cmd = [npm, *args]
    run(cmd, cwd=REACT_DIR)

def main():
    # 0) Ensure destination dirs exist
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    # 1) Build React app (install deps if missing)
    if not (REACT_DIR / "node_modules").exists():
        try:
            run_npm("ci")
        except Exception as e:
            print(f"Warning: 'npm ci' failed or skipped ({e}). Continuing...", file=sys.stderr)
    run_npm("run", "build")

    # 2) Validate build output
    problems = []
    if not DIST_DIR.exists():
        problems.append(f"- build directory not found: {DIST_DIR}")
    if not (DIST_DIR / "index.html").exists():
        problems.append(f"- missing file: {DIST_DIR / 'index.html'}")
    if not ASSETS_SRC.exists():
        problems.append(f"- missing assets folder: {ASSETS_SRC}")
    if problems:
        print("Build appears incomplete:\n" + "\n".join(problems), file=sys.stderr)
        sys.exit(1)

    # 3) Remove old files
    (TEMPLATES_DIR / "index.html").unlink(missing_ok=True)
    shutil.rmtree(ASSETS_DST, ignore_errors=True)

    # 4) Copy new files
    shutil.copy2(DIST_DIR / "index.html", TEMPLATES_DIR / "index.html")
    shutil.copytree(ASSETS_SRC, ASSETS_DST)

    print("Build and deploy complete.")

if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as e:
        print(f"\nCommand failed with exit code {e.returncode}\n{e}", file=sys.stderr)
        sys.exit(e.returncode)
