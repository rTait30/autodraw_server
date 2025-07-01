#!/usr/bin/env python3
import subprocess
import sys
import os

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
run_command("python build_and_deploy.py")

print("Setup complete.")
