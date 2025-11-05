# backend/app/smoketest.py
from . import dataio

if __name__ == "__main__":
    mats = dataio.load_materials()
    films = dataio.load_films()
    print("Materials CSV:", dataio.MATERIALS_CSV.resolve())
    print("Materials count:", len(mats))
    print("First 5:", [m["name"] for m in mats[:5]])
    print("Films CSV:", dataio.FILMS_CSV.resolve())
    cities = sorted({r["City"] for r in films})
    print("Cities count:", len(cities))
    print("First 5 cities:", cities[:5])
