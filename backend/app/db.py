# backend/app/db.py
import os
import psycopg


def get_db_url() -> str | None:
    """
    Returns database URL if configured, else None.
    Supports both Render internal and external DB env vars.
    """
    return os.getenv("DATABASE_URL") or os.getenv("EXTERNAL_DATABASE_URL")


def get_conn():
    """
    Get a PostgreSQL connection.
    Raises RuntimeError ONLY when DB is actually required.
    """
    db_url = get_db_url()
    if not db_url:
        raise RuntimeError("DATABASE_URL not configured")
    return psycopg.connect(db_url, autocommit=True)
