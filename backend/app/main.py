# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .routes import router
from .db import get_conn, get_db_url

app = FastAPI(title="CARBSE U-Value API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- serve static images ----
ROOT = Path(__file__).resolve().parents[1]   # backend/
STATIC_DIR = ROOT / "static"                 # backend/static
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def ensure_schema():
    """
    Create DB schema ONLY if database is configured.
    App must not crash if DB is missing.
    """
    if not get_db_url():
        print("⚠️ DATABASE_URL not set — skipping database setup")
        return

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS designs (
                  id BIGSERIAL PRIMARY KEY,
                  public_id TEXT UNIQUE NOT NULL,
                  title TEXT,
                  city TEXT NOT NULL,
                  assembly TEXT NOT NULL,
                  layers JSONB NOT NULL,
                  result JSONB NOT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """)
            cur.execute(
                "CREATE INDEX IF NOT EXISTS designs_created_at_idx ON designs(created_at DESC);"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS designs_public_id_idx ON designs(public_id);"
            )
        print("✅ Database schema ensured")
    except Exception as e:
        print("⚠️ Database setup failed — continuing without DB")
        print(e)


app.include_router(router, prefix="/api")
