# backend/app/routes.py
import os, json, secrets
from fastapi import APIRouter, HTTPException, Query, Request, Response, BackgroundTasks
from .models import (
    CalcRequest, DualCalcResponse, SingleCalcResponse,
    SaveDesignRequest, SaveDesignResponse, LoadDesignResponse
)
from . import dataio
from .calculator import compute
from .db import get_conn

router = APIRouter()

# This row exists in your films CSV to carry the "static" (Design Builder) values
STATIC_CITY_NAME = "Design Builder"

@router.get("/health", summary="Lightweight health check")
def health():
    """Verify CSVs can be loaded and return short counts for monitors."""
    try:
        mats = dataio.load_materials()
        films = dataio.load_films()
        return {"ok": True, "materials_count": len(mats), "films_count": len(films)}
    except Exception as e:
        raise HTTPException(500, f"health check failed: {e}")

@router.get("/materials", summary="Public list of materials (safe fields only)")
def get_materials():
    """
    Return only non-sensitive fields required by the UI for dropdowns and images.
    Thermo properties (k, rho, c) are NOT exposed here; they’re used server-side.
    """
    mats = dataio.load_materials()
    return [
        {
            "name": m["name"],
            "descriptionImage": m.get("descriptionImage") or "",
            "graphicImage": m.get("graphicImage") or "",
        }
        for m in mats
    ]

@router.get("/cities")
def get_cities():
    films = dataio.load_films()
    cities = sorted({row["City"] for row in films if row.get("City") and row["City"] != STATIC_CITY_NAME})
    return {"cities": cities}

@router.get("/films")
def get_films(city: str = Query(...), assembly: str = Query(...)):
    assembly_key = "roof" if assembly.lower() == "roof_up" else assembly.lower()
    row = dataio.index_films(dataio.load_films()).get((city.lower(), assembly_key))
    if not row:
        raise HTTPException(404, "No Hi/Ho found for the selected city + assembly")
    return {"Hi": float(row["Hi"] or 0.0), "Ho": float(row["Ho"] or 0.0)}

# ---------- helper to save a design (used by autosave + manual save) ----------
def _save_design(public_id: str, city: str, assembly: str, layers: list, result: dict, title: str | None = None):
    """Insert one design row. Safe to call in BackgroundTasks (autocommit)."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO designs (public_id, title, city, assembly, layers, result)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (public_id) DO NOTHING
            """,
            (public_id, title, city, assembly, json.dumps(layers), json.dumps(result)),
        )

@router.post("/calculate", response_model=DualCalcResponse)
def post_calculate(
    req: CalcRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    request: Request,
):
    """
    Perform STATIC (Design Builder) and DYNAMIC (selected city) calculations.
    Then auto-save the calculation in the background.
    Response body remains the same; headers include:
      - X-Design-Id
      - X-Design-URL (only if FRONTEND_BASE is set)
    """
    mats_by_name = dataio.index_materials_by_name(dataio.load_materials())

    # Validate materials
    for L in req.layers:
        if L.material not in mats_by_name:
            raise HTTPException(400, f"Material not found: {L.material}")

    films_index = dataio.index_films(dataio.load_films())
    assembly_key = "roof" if req.assembly.lower() == "roof_up" else req.assembly.lower()
    display_assembly = "Roof" if req.assembly == "roof_up" else req.assembly

    # STATIC (Design Builder)
    static_films = films_index.get((STATIC_CITY_NAME.lower(), assembly_key))
    if not static_films:
        raise HTTPException(400, f"Static calculation data not found for '{STATIC_CITY_NAME}' and assembly '{assembly_key}'")

    static_Rsi, static_Rse, static_Rs, static_Us, static_Ua, static_cap, static_layers = compute(
        mats_by_name, static_films, [L.dict() for L in req.layers], dynamic=True
    )
    static_result = SingleCalcResponse(
        city=STATIC_CITY_NAME, assembly=display_assembly,
        Rsi=static_Rsi, Rse=static_Rse, Rs=static_Rs,
        U_surface_to_surface=static_Us, U_overall=static_Ua,
        heat_capacity_kJ_m2K=static_cap, method="Static", layers=static_layers,
    )

    # DYNAMIC (Selected city)
    dynamic_films = films_index.get((req.city.lower(), assembly_key))
    if not dynamic_films:
        raise HTTPException(400, f"Dynamic calculation data not found for city: {req.city} and assembly: {assembly_key}")

    dynamic_Rsi, dynamic_Rse, dynamic_Rs, dynamic_Us, dynamic_Ua, dynamic_cap, dynamic_layers = compute(
        mats_by_name, dynamic_films, [L.dict() for L in req.layers], dynamic=True
    )
    dynamic_result = SingleCalcResponse(
        city=req.city, assembly=display_assembly,
        Rsi=dynamic_Rsi, Rse=dynamic_Rse, Rs=dynamic_Rs,
        U_surface_to_surface=dynamic_Us, U_overall=dynamic_Ua,
        heat_capacity_kJ_m2K=dynamic_cap, method="Dynamic", layers=dynamic_layers,
    )

    out = DualCalcResponse(static=static_result, dynamic=dynamic_result)

    # ---- AUTO-SAVE (non-blocking) ----
    public_id = secrets.token_urlsafe(8)
    background_tasks.add_task(
        _save_design,
        public_id=public_id,
        city=req.city,
        assembly=req.assembly,
        layers=[L.dict() for L in req.layers],
        result=out.dict(),
        title=None,
    )

    # Return the id via headers for optional future use (share link etc.)
    response.headers["X-Design-Id"] = public_id
    frontend_base = os.getenv("FRONTEND_BASE", "")
    if frontend_base:
        response.headers["X-Design-URL"] = f"{frontend_base}?design={public_id}"

    return out

@router.post("/save-design", response_model=SaveDesignResponse)
def save_design(req: SaveDesignRequest, request: Request):
    public_id = secrets.token_urlsafe(8)
    _save_design(public_id, req.city, req.assembly, req.layers, req.result, title=req.title)
    frontend_base = os.getenv("FRONTEND_BASE", "")
    url = f"{frontend_base}?design={public_id}" if frontend_base else public_id
    return SaveDesignResponse(public_id=public_id, url=url)

@router.get("/design/{public_id}", response_model=LoadDesignResponse)
def get_design(public_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT title, city, assembly, layers, result, created_at FROM designs WHERE public_id=%s",
                (public_id,),
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(404, "Design not found")

    title, city, assembly, layers, result, created_at = row
    return LoadDesignResponse(
        title=title, city=city, assembly=assembly,
        layers=layers, result=result, created_at=str(created_at),
    )
