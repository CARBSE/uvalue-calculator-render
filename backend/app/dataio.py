# backend/app/dataio.py
from pathlib import Path
from typing import Dict, List, Optional
import csv, unicodedata, os, re

# folder: backend/
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

MATERIALS_CSV = Path(os.getenv("MATERIALS_CSV", str(DATA_DIR / "materials.csv")))
FILMS_CSV     = Path(os.getenv("FILMS_CSV",     str(DATA_DIR / "cityweather_hi&h0.csv")))

def _sniff_reader(path: Path) -> csv.reader:
    if not path.exists():
        raise FileNotFoundError(f"CSV not found: {path}")
    f = path.open("r", encoding="utf-8-sig", newline="")
    sample = f.read(4096); f.seek(0)
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except Exception:
        class D(csv.Dialect):
            delimiter=","; quotechar='"'; doublequote=True; skipinitialspace=True
            lineterminator="\n"; quoting=csv.QUOTE_MINIMAL
        dialect = D
    return csv.reader(f, dialect)

def _n(s: str) -> str:
    if s is None: return ""
    s = s.strip().lower()
    s = s.replace("³","3").replace("²","2").replace("μ","u").replace("µ","u").replace("°","")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch if ch.isalnum() or ch.isspace() else " " for ch in s)
    return " ".join(s.split())

def _f(x) -> Optional[float]:
    if x is None: return None
    s = str(x).strip()
    if not s: return None
    s = re.sub(r'(?i)\s*[x×]\s*10\^?\s*([+-]?\d+)', r'e\1', s)
    s = s.replace(" ", "")
    if s.count(",")==1 and s.count(".")==0: s = s.replace(",", ".")
    if s.count(".") > 1: s = s.split(".",1)[0]+"."+("".join(s.split(".")[1:]))
    if s.count(",") > 1: s = s.split(",",1)[0]+"."+("".join(s.split(",")[1:]))
    try: return float(s)
    except ValueError: return None

def _bn(v: Optional[str]) -> str:
    v = (v or "").strip()
    return os.path.basename(v) if v else ""

def load_materials() -> List[dict]:
    rdr = _sniff_reader(MATERIALS_CSV)
    rows = list(rdr)
    if not rows: return []
    hdr, data = rows[0], rows[1:]
    idx = { _n(h): i for i,h in enumerate(hdr) }

    def gv(row, keys):
        for k in keys:
            j = idx.get(k)
            if j is not None and j < len(row):
                v = row[j]
                if v is not None and str(v).strip()!="":
                    return v
        return None

    out = []
    for row in data:
        if not any(str(x).strip() for x in row): continue
        name = gv(row, ["material name","material","name"])
        if not name: continue

        k   = _f(gv(row, ["thermal conductivity w mk","thermal conductivity","w mk","conductivity"]))
        rho = _f(gv(row, ["density kg m3","density kg m 3","density kg m³","density"]))
        c_m = _f(gv(row, ["specific heat j kgk","c j kgk","specific heat capacity j kg k","c"]))
        c_v = _f(gv(row, ["specific heat mj m3k","specific heat mj m 3 k"]))
        if c_m is None and c_v is not None and rho not in (None,0):
            c_m = (c_v * 1_000_000.0) / rho  # MJ/m³K -> J/kgK

        out.append({
            "name": str(name).strip(),
            "k":   0.0 if k   is None else k,
            "rho": 0.0 if rho is None else rho,
            "c":   0.0 if c_m is None else c_m,
            "descriptionImage": _bn(gv(row, ["description image filename","image","photo"])),
            "graphicImage":     _bn(gv(row, ["graphic image filename","graphic","tile","pattern"])),
        })
    return out

def load_films() -> List[dict]:
    rdr = _sniff_reader(FILMS_CSV)
    rows = list(rdr)
    if not rows: return []
    hdr, data = rows[0], rows[1:]
    idx = { _n(h): i for i,h in enumerate(hdr) }

    def gv(row, keys):
        for k in keys:
            j = idx.get(k)
            if j is not None and j < len(row):
                v = row[j]
                if v is not None and str(v).strip()!="":
                    return v
        return None

    out = []
    for row in data:
        if not any(str(x).strip() for x in row): continue
        city = gv(row, ["city"])
        asm  = gv(row, ["assembly","assembly type"])
        hi   = gv(row, ["hi","rsi"])
        ho   = gv(row, ["ho","rse"])
        if not city or not asm: continue
        a = _n(str(asm)).replace(" ","_")
        mapping = {"roof":"roof_up","roof_up":"roof_up","roof_down":"roof_down","wall":"wall","floor":"floor"}
        a = mapping.get(a, a)
        out.append({"City": str(city).strip(), "Assembly": a, "Hi": _f(hi), "Ho": _f(ho)})
    return out

def index_materials_by_name(materials: List[dict]) -> Dict[str,dict]:
    return {m["name"]: m for m in materials}

def index_films(films: List[dict]) -> Dict[tuple,dict]:
    return {(r["City"].lower(), r["Assembly"].lower()): r for r in films}
