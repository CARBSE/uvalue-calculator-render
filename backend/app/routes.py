# backend/app/routes.py
from fastapi import APIRouter, HTTPException, Query
from .models import CalcRequest, DualCalcResponse, SingleCalcResponse
from . import dataio
from .calculator import compute

router = APIRouter()

# This row exists in your films CSV to carry the "static" (Design Builder) values
STATIC_CITY_NAME = "Design Builder"


@router.get("/health", summary="Lightweight health check")
def health():
    """
    Simple health endpoint:
    - Verifies CSVs can be loaded
    - Returns counts so monitors can assert non-empty
    """
    try:
        mats = dataio.load_materials()
        films = dataio.load_films()
        return {
            "ok": True,
            "materials_count": len(mats),
            "films_count": len(films),
        }
    except Exception as e:
        # Keep response short so monitors can show the reason quickly
        raise HTTPException(500, f"health check failed: {e}")


@router.get("/materials", summary="Public list of materials (safe fields only)")
def get_materials():
    """
    Return only non-sensitive fields required by the UI for dropdowns and images.
    Sensitive thermo properties (k, rho, c) are NOT exposed here.
    They are used internally by the server when /calculate is called.
    """
    mats = dataio.load_materials()
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
    """
    Returns distinct city names from films CSV, excluding the special
    static entry (Design Builder).
    """
    films = dataio.load_films()
    cities = sorted(
        {row["City"] for row in films if (row.get("City") and row["City"] != STATIC_CITY_NAME)}
    )
    return {"cities": cities}


@router.get("/films")
def get_films(city: str = Query(...), assembly: str = Query(...)):
    """
    Return the (Hi, Ho) pair for a given city + assembly.
    Normalizes "roof_up" -> "roof" to match your CSV mapping.
    """
    assembly_key = "roof" if assembly.lower() == "roof_up" else assembly.lower()
    row = dataio.index_films(dataio.load_films()).get((city.lower(), assembly_key))
    if not row:
        raise HTTPException(404, "No Hi/Ho found for the selected city + assembly")
    return {"Hi": float(row["Hi"] or 0.0), "Ho": float(row["Ho"] or 0.0)}


@router.post("/calculate", response_model=DualCalcResponse)
def post_calculate(req: CalcRequest):
    """
    Perform both STATIC (Design Builder) and DYNAMIC (selected city) calculations.
    Uses full materials data on the server side; the client never sees raw k/rho/c.
    """
    mats_by_name = dataio.index_materials_by_name(dataio.load_materials())

    # Validate materials are known
    for L in req.layers:
        if L.material not in mats_by_name:
            raise HTTPException(400, f"Material not found: {L.material}")

    films_index = dataio.index_films(dataio.load_films())
    assembly_key = "roof" if req.assembly.lower() == "roof_up" else req.assembly.lower()
    display_assembly = "Roof" if req.assembly == "roof_up" else req.assembly

    # STATIC (Design Builder)
    static_films = films_index.get((STATIC_CITY_NAME.lower(), assembly_key))
    if not static_films:
        raise HTTPException(
            400,
            f"Static calculation data not found for '{STATIC_CITY_NAME}' and assembly '{assembly_key}'",
        )
    static_Rsi, static_Rse, static_Rs, static_Us, static_Ua, static_cap, static_layers = compute(
        mats_by_name, static_films, [L.dict() for L in req.layers], dynamic=True
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

    # DYNAMIC (Selected city)
    dynamic_films = films_index.get((req.city.lower(), assembly_key))
    if not dynamic_films:
        raise HTTPException(
            400,
            f"Dynamic calculation data not found for city: {req.city} and assembly: {assembly_key}",
        )
    dynamic_Rsi, dynamic_Rse, dynamic_Rs, dynamic_Us, dynamic_Ua, dynamic_cap, dynamic_layers = compute(
        mats_by_name, dynamic_films, [L.dict() for L in req.layers], dynamic=True
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
