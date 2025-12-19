// web/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";

import Header from "./components/Header";
import TitleStrip from "./components/TitleStrip";
import LandingIntro from "./components/LandingIntro";

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

const DEMO = {
  city: "Ahmedabad",
  assembly: "Wall",
  Uss: "0.42",
  Ua: "0.38",
  layers: [],
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [warmReady, setWarmReady] = useState(false);
  const [warmMsg, setWarmMsg] = useState("Waking the server…");

  const [materials, setMaterials] = useState([]);
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState("");
  const [assembly, setAssembly] = useState(INITIAL_ASSEMBLY);
  const [layers, setLayers] = useState([]);
  const [result, setResult] = useState(null);
  const [films, setFilms] = useState({ Hi: 0, Ho: 0 });
  const [errorBanner, setErrorBanner] = useState("");

  /* ---------------- warm backend ---------------- */
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

  /* ---------------- load base data ---------------- */
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

  /* ---------------- films ---------------- */
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

  /* ---------------- LANDING ---------------- */
  if (!started) {
    return (
      <>
        <Header />
        <TitleStrip />
        <LandingIntro
          warming={!warmReady}
          warmMsg={warmMsg}
          demo={DEMO}
          onStart={() => setStarted(true)}
        />
      </>
    );
  }

  /* ---------------- LIVE TOOL ---------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <TitleStrip />

      <main className="max-w-7xl mx-auto px-4 py-6">
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

          {/* Controls */}
          <div className="col-span-9 space-y-6">
            <div className="bg-white rounded-lg border p-4 flex gap-4 items-center">
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

              {["wall", "roof_up"].map((a) => (
                <label key={a} className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    checked={assembly === a}
                    onChange={() => setAssembly(a)}
                  />
                  {a.replace("_up", "")}
                </label>
              ))}

              <button
                className="px-3 py-1 border rounded"
                onClick={() =>
                  setLayers((p) => [
                    ...p,
                    { id: crypto.randomUUID(), material: "", thickness_mm: 10 },
                  ])
                }
              >
                Add Layer
              </button>
            </div>

            {layers.map((l, i) => (
              <LayerRow
                key={l.id}
                layer={l}
                materials={materials}
                isFirst={i === 0}
                isLast={i === layers.length - 1}
                onChange={(n) =>
                  setLayers((p) => p.map((x) => (x.id === l.id ? n : x)))
                }
                onRemove={() =>
                  setLayers((p) => p.filter((x) => x.id !== l.id))
                }
              />
            ))}

            <button
              onClick={onCalculate}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Calculate
            </button>

            {result && (
              <div className="space-y-6 pt-4 border-t">
                <ResultsTable
                  layers={result.dynamic.layers}
                  matsByName={matsByName}
                />
                <CoefficientsTable result={result} films={films} />
                <SummaryTable result={result} layerCount={layers.length} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
