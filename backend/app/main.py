# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router
from .db import get_conn

app = FastAPI()

# CORS (adjust your frontend origin if you want to restrict it)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # or ["https://uvalue-calculator-render.onrender.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-create table/indexes so you don't need the psql shell
@app.on_event("startup")
def ensure_schema():
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
        cur.execute("CREATE INDEX IF NOT EXISTS designs_created_at_idx ON designs(created_at DESC);")
        cur.execute("CREATE INDEX IF NOT EXISTS designs_public_id_idx ON designs(public_id);")

app.include_router(router, prefix="/api")

