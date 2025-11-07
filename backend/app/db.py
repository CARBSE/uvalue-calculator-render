# backend/app/db.py
import os
import psycopg

DB_URL = os.getenv("DATABASE_URL") or os.getenv("EXTERNAL_DATABASE_URL")
if not DB_URL:
    raise RuntimeError("DATABASE_URL not set")

def get_conn():
    # autocommit for simple inserts/selects
    return psycopg.connect(DB_URL, autocommit=True)
