"""Start an isolated local SQLite demo; production continues to use PostgreSQL."""
from pathlib import Path
import argparse
import os
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--create-admin", action="store_true", help="Create a local administrator interactively")
    args = parser.parse_args()
    os.environ.setdefault("DATABASE_URL", "sqlite:///powerbill-local.sqlite3")
    if not os.environ["DATABASE_URL"].startswith("sqlite:///"):
        raise SystemExit("Local demo requires SQLite. Unset DATABASE_URL in this terminal; use the deployment guide for PostgreSQL.")
    os.environ["FLASK_ENV"] = "development"
    os.environ["COOKIE_SECURE"] = "false"
    os.environ["ALLOWED_ORIGINS"] = "http://localhost:3000,http://127.0.0.1:3000"
    sys.path.insert(0, str(Path(__file__).resolve().parent / "powerbill" / "backend"))
    from app import create_app
    from app.extensions import db
    app = create_app("development")
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    with app.app_context():
        db.create_all()
    if args.create_admin:
        from scripts.create_admin import main as create_admin
        create_admin()
        return
    print("Local API: http://127.0.0.1:5000 — SQLite demo database initialized", flush=True)
    app.run(host="127.0.0.1", port=5000, debug=False)


if __name__ == "__main__":
    main()
