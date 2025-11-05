from fastapi import APIRouter, HTTPException, Query
from .models import CalcRequest, DualCalcResponse, SingleCalcResponse
from . import dataio
from .calculator import compute

router = APIRouter()
STATIC_CITY_NAME = "Design Builder"

@router.get("/materials")
def get_materials():
    return dataio.load_materials()

@router.get("/cities")
def get_cities():
    films = dataio.load_films()
    cities = sorted({row["City"] for row in films if row["City"] != STATIC_CITY_NAME})
    return {"cities": cities}

@router.get("/films")
def get_films(city: str = Query(...), assembly: str = Query(...)):
    assembly_key = "roof" if assembly.lower() == "roof_up" else assembly.lower()
    row = dataio.index_films(dataio.load_films()).get((city.lower(), assembly_key))
    if not row:
        raise HTTPException(404, "No Hi/Ho found for the selected city + assembly")
    return {"Hi": float(row["Hi"] or 0.0), "Ho": float(row["Ho"] or 0.0)}

@router.post("/calculate", response_model=DualCalcResponse)
def post_calculate(req: CalcRequest):
    mats_by_name = dataio.index_materials_by_name(dataio.load_materials())
    for L in req.layers:
        if L.material not in mats_by_name:
            raise HTTPException(400, f"Material not found: {L.material}")

    all_films_indexed = dataio.index_films(dataio.load_films())
    
    assembly_key = "roof" if req.assembly.lower() == "roof_up" else req.assembly.lower()

    # Get films for STATIC calculation
    static_films = all_films_indexed.get((STATIC_CITY_NAME.lower(), assembly_key))
    if not static_films:
        raise HTTPException(400, f"Static calculation data not found for '{STATIC_CITY_NAME}' and assembly '{assembly_key}'")

    # Get films for DYNAMIC calculation
    dynamic_films = all_films_indexed.get((req.city.lower(), assembly_key))
    if not dynamic_films:
        raise HTTPException(400, f"Dynamic calculation data not found for city: {req.city} and assembly: {assembly_key}")
        
    display_assembly = "Roof" if req.assembly == "roof_up" else req.assembly

    # Perform STATIC calculation
    static_Rsi, static_Rse, static_Rs, static_Us, static_Ua, static_cap, static_layers = compute(
        mats_by_name, static_films, [L.dict() for L in req.layers], dynamic=True
    )
    static_result = SingleCalcResponse(
        city=STATIC_CITY_NAME, assembly=display_assembly, Rsi=static_Rsi, Rse=static_Rse, Rs=static_Rs,
        U_surface_to_surface=static_Us, U_overall=static_Ua, heat_capacity_kJ_m2K=static_cap,
        method="Static", layers=static_layers,
    )

    # Perform DYNAMIC calculation
    dynamic_Rsi, dynamic_Rse, dynamic_Rs, dynamic_Us, dynamic_Ua, dynamic_cap, dynamic_layers = compute(
        mats_by_name, dynamic_films, [L.dict() for L in req.layers], dynamic=True
    )
    dynamic_result = SingleCalcResponse(
        city=req.city, assembly=display_assembly, Rsi=dynamic_Rsi, Rse=dynamic_Rse, Rs=dynamic_Rs,
        U_surface_to_surface=dynamic_Us, U_overall=dynamic_Ua, heat_capacity_kJ_m2K=dynamic_cap,
        method="Dynamic", layers=dynamic_layers,
    )

    return DualCalcResponse(static=static_result, dynamic=dynamic_result)