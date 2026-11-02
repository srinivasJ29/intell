"""Local development runner script."""

import os
import subprocess
import sys


def main():
    print("=" * 60)
    print(" IntelliResearch — Local Platform Environment Startup")
    print("=" * 60)

    # Set PYTHONPATH
    os.environ["PYTHONPATH"] = os.path.abspath(".")

    # Run DB migrations
    print("\n[1/3] Running database migrations...")
    alembic_cmd = [
        os.path.join(".venv", "Scripts", "alembic.exe") if os.name == "nt" else ".venv/bin/alembic",
        "-c",
        "backend/alembic.ini",
        "upgrade",
        "head",
    ]
    subprocess.run(alembic_cmd, check=True)

    # Print backend launch instructions
    print("\n[2/3] Backend API server ready to start.")
    print("Command: uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload")

    print("\n[3/3] Frontend development server ready to start.")
    print("Command: npm run dev --prefix frontend (Port 5173)")
    print("\nAccess application at: http://localhost:5173")
    print("=" * 60)


if __name__ == "__main__":
    main()
