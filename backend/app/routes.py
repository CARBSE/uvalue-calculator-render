# backend/app/routes.py
import os, json, secrets
from fastapi import APIRouter, HTTPException, Query, Request
from .models import (
    CalcRequest,
    DualCalcResponse,
    SingleCalcResponse,
    SaveDesignRequest,
    SaveDesignResponse,
    LoadDesignResponse,
)
from . import dataio
from .calculator import compute
from .db import get_conn

router = APIRouter()

# Special row in CSV for static calc
STATIC_CITY_NAME = "Design Builder"


@router.get("/health", summary="Lightweight health check")
def health():
    try:
        mats = dataio.load_materials()
        films = dataio.load_films()
        return {
            "ok": True,
            "materials_count": len(mats),
            "films_count": len(films),
        }
    except Exception as e:
        raise HTTPException(500, f"health check failed: {e}")


@router.get("/materials", summary="Public list of materials (safe fields only)")
def get_materials():
    mats = dataio.load_materials()
    # don’t send k, rho, c
    safe = [
        {
            "name": m["name"],
            "descriptionImage": m.get("descriptionImage") or "",
            "graphicImage": m.get("graphicImage") or "",
        }
        for m in mats
    ]
    return safe


@router.get("/cities")
def get_cities():
    films = dataio.load_films()
    cities = sorted(
        {
            row["City"]
            for row in films
            if row.get("City") and row["City"] != STATIC_CITY_NAME
        }
    )
    return {"cities": cities}


@router.get("/films")
def get_films(city: str = Query(...), assembly: str = Query(...)):
    """
    IMPORTANT:
    - dataio.load_films() already normalized CSV assemblies:
        "roof" -> "roof_up"
    - so here we must look up exactly the same key
    """
    films_idx = dataio.index_films(dataio.load_films())

    asm_in = assembly.lower()
    if asm_in == "roof" or asm_in == "roof_up":
        asm_key = "roof_up"
    else:
        asm_key = asm_in

    row = films_idx.get((city.lower(), asm_key))
    if not row:
        raise HTTPException(404, "No Hi/Ho found for the selected city + assembly")
    return {
        "Hi": float(row["Hi"] or 0.0),
        "Ho": float(row["Ho"] or 0.0),
    }


@router.post("/calculate", response_model=DualCalcResponse)
def post_calculate(req: CalcRequest):
    mats_by_name = dataio.index_materials_by_name(dataio.load_materials())

    # 1) validate materials
    for L in req.layers:
        if L.material not in mats_by_name:
            raise HTTPException(400, f"Material not found: {L.material}")

    # 2) build film index
    films_index = dataio.index_films(dataio.load_films())

    # 3) normalize assembly EXACTLY like dataio
    asm_in = req.assembly.lower()
    if asm_in == "roof" or asm_in == "roof_up":
        assembly_key = "roof_up"
        display_assembly = "Roof"
    else:
        assembly_key = asm_in
        display_assembly = req.assembly

    # ---------- STATIC (Design Builder) ----------
    static_films = films_index.get((STATIC_CITY_NAME.lower(), assembly_key))
    if not static_films:
        # this was the error you saw
        raise HTTPException(
            400,
            f"Static calculation data not found for '{STATIC_CITY_NAME}' and assembly '{assembly_key}'",
        )

    static_Rsi, static_Rse, static_Rs, static_Us, static_Ua, static_cap, static_layers = compute(
        mats_by_name,
        static_films,
        [L.dict() for L in req.layers],
        dynamic=True,
    )

    static_result = SingleCalcResponse(
        city=STATIC_CITY_NAME,
        assembly=display_assembly,
        Rsi=static_Rsi,
        Rse=static_Rse,
        Rs=static_Rs,
        U_surface_to_surface=static_Us,
        U_overall=static_Ua,
        heat_capacity_kJ_m2K=static_cap,
        method="Static",
        layers=static_layers,
    )

    # ---------- DYNAMIC (user city) ----------
    dynamic_films = films_index.get((req.city.lower(), assembly_key))
    if not dynamic_films:
        raise HTTPException(
            400,
            f"Dynamic calculation data not found for city: {req.city} and assembly: {assembly_key}",
        )

    dynamic_Rsi, dynamic_Rse, dynamic_Rs, dynamic_Us, dynamic_Ua, dynamic_cap, dynamic_layers = compute(
        mats_by_name,
        dynamic_films,
        [L.dict() for L in req.layers],
        dynamic=True,
    )

    dynamic_result = SingleCalcResponse(
        city=req.city,
        assembly=display_assembly,
        Rsi=dynamic_Rsi,
        Rse=dynamic_Rse,
        Rs=dynamic_Rs,
        U_surface_to_surface=dynamic_Us,
        U_overall=dynamic_Ua,
        heat_capacity_kJ_m2K=dynamic_cap,
        method="Dynamic",
        layers=dynamic_layers,
    )

    return DualCalcResponse(static=static_result, dynamic=dynamic_result)


@router.post("/save-design", response_model=SaveDesignResponse)
def save_design(req: SaveDesignRequest, request: Request):
    public_id = secrets.token_urlsafe(8)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO designs (public_id, title, city, assembly, layers, result)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    public_id,
                    req.title,
                    req.city,
                    req.assembly,
                    json.dumps(req.layers),
                    json.dumps(req.result),
                ),
            )

    frontend_base = os.getenv("FRONTEND_BASE", "")
    url = f"{frontend_base}?design={public_id}" if frontend_base else public_id
    return SaveDesignResponse(public_id=public_id, url=url)


@router.get("/design/{public_id}", response_model=LoadDesignResponse)
def get_design(public_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT title, city, assembly, layers, result, created_at
                FROM designs
                WHERE public_id=%s
                """,
                (public_id,),
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(404, "Design not found")

    title, city, assembly, layers, result, created_at = row
    return LoadDesignResponse(
        title=title,
        city=city,
        assembly=assembly,
        layers=layers,
        result=result,
        created_at=str(created_at),
    )
