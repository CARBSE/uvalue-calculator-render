from typing import List, Optional
from pydantic import BaseModel, Field

class Layer(BaseModel):
    material: str = Field(..., min_length=1)
    thickness_mm: float = Field(..., gt=0)

class CalcRequest(BaseModel):
    city: str = Field(..., min_length=1)
    assembly: str = Field(..., min_length=1)
    dynamic_coefficients: bool = True
    override_Rsi: Optional[float] = None
    override_Rse: Optional[float] = None
    layers: List[Layer] = Field(..., min_length=1)

class LayerOut(BaseModel):
    material: str
    thickness_mm: float
    k_W_mK: float
    R_layer: float

class SingleCalcResponse(BaseModel):
    city: str
    assembly: str
    Rsi: float
    Rse: float
    Rs: float
    U_surface_to_surface: float
    U_overall: float
    heat_capacity_kJ_m2K: float
    method: str
    layers: List[LayerOut]

class DualCalcResponse(BaseModel):
    static: SingleCalcResponse
    dynamic: SingleCalcResponse