#!/usr/bin/env python3
import subprocess
import sys
import os
import secrets

def run_command(cmd, cwd=None):
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        sys.exit(f"Command failed: {cmd}")

# 1. Install Python dependencies
print("Installing Python dependencies...")
run_command("pip install -r requirements.txt")

# 2. Install Node dependencies
print("Installing React dependencies...")
run_command("npm install", cwd="react")

# 3. Build and deploy React frontend
print("Building and deploying React frontend...")
run_command("python build_and_deploy.py", cwd="setup")

# 4. Create .env file in /instance with placeholder secrets
instance_dir = "instance"
os.makedirs(instance_dir, exist_ok=True)
env_path = os.path.join(instance_dir, ".env")
flask_secret = secrets.token_urlsafe(32)
jwt_secret = secrets.token_urlsafe(32)
with open(env_path, "w") as f:
    f.write(f'FLASK_SECRET_KEY="{flask_secret}"\n')
    f.write(f'JWT_SECRET_KEY="{jwt_secret}"\n')
print(f"Created {env_path} with placeholder secrets.")

# 5. Create users.db if not exists
db_path = os.path.join(instance_dir, "users.db")
if not os.path.exists(db_path):
    open(db_path, "a").close()
    print(f"Created {db_path}.")

# 6. Bootstrap admin user
print("Bootstrapping admin user...")
run_command("python bootstrap_admin.py", cwd="setup")

print("Setup complete.")