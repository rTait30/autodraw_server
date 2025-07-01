# build_and_deploy.py
import subprocess
import shutil
import os

# 1. Build the React project
subprocess.run("npm run build", cwd="react", check=True, shell=True)

# 2. Remove old files
try:
    os.remove("templates/index.html")
except FileNotFoundError:
    pass

shutil.rmtree("static/assets", ignore_errors=True)

# 3. Copy new files
shutil.copy("react/dist/index.html", "templates/index.html")
shutil.copytree("react/dist/assets", "static/assets")

print("Build and deploy complete.")