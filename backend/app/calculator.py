from typing import List, Tuple, Dict, Optional

STATIC_RSI = 0.13
STATIC_RSE = 0.04

def _to_float(x, default=0.0):
    try:
        return float(x)
    except Exception:
        return default

def compute(
    materials_index: Dict[str, Dict[str, float]],
    films: Optional[Dict[str, float]],
    layers: List[Dict[str, float]],
    dynamic: bool = True,
    override_Rsi: Optional[float] = None,
    override_Rse: Optional[float] = None,
) -> Tuple[float, float, float, float, float, float, list]:
    # --- Films: accept Hi/Ho or Rsi/Rse ---
    Rsi = override_Rsi if override_Rsi is not None else None
    Rse = override_Rse if override_Rse is not None else None

    if dynamic and films:
        Hi = _to_float(films.get("Hi"))
        Ho = _to_float(films.get("Ho"))
        if 0.0 < Hi <= 1.0 and 0.0 < Ho <= 1.0:   # looks like resistances
            Rsi = Hi
            Rse = Ho
        else:                                     # treat as coefficients
            Rsi = (1.0 / Hi) if Hi > 0 else 0.0
            Rse = (1.0 / Ho) if Ho > 0 else 0.0

    if Rsi is None: Rsi = STATIC_RSI
    if Rse is None: Rse = STATIC_RSE

    # --- Layers ---
    Rs = 0.0
    cap_kJ = 0.0
    out_layers = []

    for L in layers:
        mat = materials_index[L["material"]]
        t_m = _to_float(L["thickness_mm"]) / 1000.0
        k   = _to_float(mat.get("k", 0))
        rho = _to_float(mat.get("rho", 0))
        c   = _to_float(mat.get("c", 0))

        R_layer = (t_m / k) if k > 0 else 0.0
        Rs += R_layer
        cap_kJ += rho * t_m * c / 1000.0  # kJ/m²·K

        out_layers.append({
            "material": L["material"],
            "thickness_mm": _to_float(L["thickness_mm"]),
            "k_W_mK": k,
            "R_layer": round(R_layer, 6),
        })

    U_s2s = (1.0 / Rs) if Rs > 0 else 0.0
    Rt = Rsi + Rs + Rse
    U_overall = (1.0 / Rt) if Rt > 0 else 0.0

    return Rsi, Rse, Rs, U_s2s, U_overall, cap_kJ, out_layers
