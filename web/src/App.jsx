import React, { useEffect, useMemo, useState } from "react";

import Header from "./components/Header";
import TitleStrip from "./components/TitleStrip";

import LayerRow from "./components/LayerRow";
import ResultsTable from "./components/ResultsTable";
import CoefficientsTable from "./components/CoefficientsTable";
import SummaryTable from "./components/SummaryTable";
import GraphicPanel from "./components/GraphicPanel";

import {
  getMaterials,
  getCities,
  getFilms,
  postCalculate,
  waitForHealth,
  saveDesign,
} from "./lib/api";

const INITIAL_ASSEMBLY = "wall";

/* ------------------------------------------------------------------ */
/* Landing Screen                                                      */
/* ------------------------------------------------------------------ */
function LandingIntro({ warming, onStart }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="bg-white rounded-xl border shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800">
              Welcome
            </h2>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              This tool computes U-values, thermal resistance, and heat capacity
              of building envelope assemblies using CARBSE research datasets.
            </p>
          </div>

          <button
            onClick={onStart}
            className={`px-6 py-2 rounded-lg text-sm font-medium shadow-sm ${
              warming
                ? "bg-blue-500 text-white opacity-90"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {warming ? "Starting…" : "Start Tool"}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            {
              title: "1. Select City & Assembly",
              desc: "Choose the city and wall/roof assembly.",
            },
            {
              title: "2. Define Layers",
              desc: "Add materials and thickness for each layer.",
            },
            {
              title: "3. Calculate",
              desc: "Instantly get U-values and thermal properties.",
            },
          ].map((c, i) => (
            <div key={i} className="p-4 rounded-lg border bg-gray-50">
              <div className="text-sm font-semibold text-gray-800">
                {c.title}
              </div>
              <div className="text-xs text-gray-600 mt-1">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main App                                                            */
/* ------------------------------------------------------------------ */
export default function App() {
  const [started, setStarted] = useState(false);
  const [warmReady, setWarmReady] = useState(false);

  const [materials, setMaterials] = useState([]);
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState("");
  const [assembly, setAssembly] = useState(INITIAL_ASSEMBLY);
  const [layers, setLayers] = useState([]);
  const [result, setResult] = useState(null);
  const [films, setFilms] = useState({ Hi: 0, Ho: 0 });
  const [errorBanner, setErrorBanner] = useState("");

  /* ---------- Warm backend ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await waitForHealth({ maxWaitMs: 90000, pollMs: 3000 });
        if (!cancelled) setWarmReady(true);
      } catch {
        if (!cancelled) setWarmReady(false);
      }
    })();
    return () => (cancelled = true);
  }, []);

  /* ---------- Load base data ---------- */
  useEffect(() => {
    if (!started) return;
    (async () => {
      try {
        setMaterials(await getMaterials());
        const c = await getCities();
        setCities(c?.cities || []);
      } catch {
        setErrorBanner("Failed to load initial data.");
      }
    })();
  }, [started]);

  /* ---------- Films ---------- */
  useEffect(() => {
    if (!started || !city) return;
    getFilms(city, assembly)
      .then(setFilms)
      .catch(() => setFilms({ Hi: 0, Ho: 0 }));
  }, [started, city, assembly]);

  const matsByName = useMemo(() => {
    const map = new Map();
    materials.forEach((m) => map.set(m.name, m));
    return map;
  }, [materials]);

  async function onCalculate() {
  try {
    const payload = {
      city,
      assembly,
      layers: layers.map((l) => ({
        material: l.material,
        thickness_mm: Number(l.thickness_mm),
      })),
    };

    const r = await postCalculate(payload);
    setResult(r);

    // ---- SILENT AUTO SAVE (no alert on failure) ----
    try {
      const saved = await saveDesign({
        title: null,
        city,
        assembly,
        layers: payload.layers,
        result: r,
      });
      setLastSaved(saved);
    } catch (e) {
      console.warn("Auto-save failed (non-blocking):", e);
    }

  } catch (e) {
    alert("Calculation failed. Please try again.");
  }
}

      await saveDesign({
        title: null,
        city,
        assembly,
        layers: payload.layers,
        result: r,
      });
    } catch (e) {
      alert(e.message);
    }
  }

  /* ------------------------------------------------------------------ */
  /* UI                                                                 */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gray-50 text-base">
      {/* 🔷 Global Header */}
      <Header />

      {/* 🔷 Title Strip */}
      <TitleStrip title="U-Value Calculator" />

      {/* 🔷 Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {!started ? (
          <LandingIntro
            warming={!warmReady}
            onStart={() => setStarted(true)}
          />
        ) : (
          <>
            {errorBanner && (
              <div className="mb-4 p-3 text-sm text-red-800 bg-red-100 rounded border">
                {errorBanner}
              </div>
            )}

            <div className="grid grid-cols-12 gap-6">
              {/* Graphic */}
              <div className="col-span-3">
                <GraphicPanel
                  graphicLayers={layers.map((l) => ({
                    id: l.id,
                    width: l.thickness_mm * 2,
                    img: matsByName.get(l.material)?.graphicImage,
                    materialName: l.material,
                    thickness: l.thickness_mm,
                  }))}
                  totalGraphicWidthPX={200}
                  totalThicknessMM={layers.reduce(
                    (s, l) => s + Number(l.thickness_mm || 0),
                    0
                  )}
                />
              </div>

              {/* Controls + Results */}
              <div className="col-span-9 space-y-6">
                {/* Inputs */}
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">City</label>
                      <select
                        className="border rounded px-2 py-1"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      >
                        <option value="">Select City</option>
                        {cities.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      {["wall", "roof_up"].map((a) => (
                        <label
                          key={a}
                          className="flex items-center gap-1 text-sm"
                        >
                          <input
                            type="radio"
                            checked={assembly === a}
                            onChange={() => setAssembly(a)}
                          />
                          {a.replace("_up", "")}
                        </label>
                      ))}
                    </div>

                    <button
                      className="px-3 py-1 border rounded"
                      onClick={() =>
                        setLayers((p) => [
                          ...p,
                          {
                            id: crypto.randomUUID(),
                            material: "",
                            thickness_mm: 10,
                          },
                        ])
                      }
                    >
                      Add Layer
                    </button>
                  </div>
                </div>

                {/* Layers */}
                <div className="space-y-2">
                  {layers.map((l, i) => (
                    <LayerRow
                      key={l.id}
                      layer={l}
                      materials={materials}
                      isFirst={i === 0}
                      isLast={i === layers.length - 1}
                      onChange={(n) =>
                        setLayers((p) =>
                          p.map((x) => (x.id === l.id ? n : x))
                        )
                      }
                      onRemove={() =>
                        setLayers((p) => p.filter((x) => x.id !== l.id))
                      }
                    />
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onCalculate}
                    className="px-5 py-2 text-base bg-blue-600 text-white rounded-md"
                  >
                    Calculate
                  </button>
                  <button
                    onClick={() => window.print()}
                    disabled={!result}
                    className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                  >
                    Save as PDF
                  </button>
                </div>

                {/* Results */}
                {result && (
                  <div className="space-y-6 pt-4 border-t">
                    <ResultsTable
                      layers={result.dynamic.layers}
                      matsByName={matsByName}
                    />
                    <CoefficientsTable result={result} films={films} />
                    <SummaryTable
                      result={result}
                      layerCount={layers.length}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
