import os
import subprocess
import sys

def run_command(cmd, use_python=False):
    if use_python:
        cmd = f'"{sys.executable}" {cmd}'
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"Error running command: {cmd}")
        sys.exit(result.returncode)

def main():
    # Set FLASK_APP environment variable for the subprocess
    os.environ['FLASK_APP'] = 'app:create_app'

    # Check if migrations directory exists
    if not os.path.exists('migrations'):
        print("Initializing migrations directory...")
        run_command('-m flask db init', use_python=True)
    
    print("Generating migration script...")
    # Using a generic message. In production, you might want to ask for a message.
    run_command('-m flask db migrate -m "Schema update"', use_python=True)
    
    print("Applying migrations...")
    run_command('-m flask db upgrade', use_python=True)
    
    print("Database updated successfully.")

if __name__ == '__main__':
    main()
