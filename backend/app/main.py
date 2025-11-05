from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .routes import router

app = FastAPI()

# This is the new, more permissive CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

# static for material images
STATIC_DIR = (Path(__file__).resolve().parents[1] / "static").resolve()
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")