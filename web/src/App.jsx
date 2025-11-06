// web/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";

import LayerRow from "./components/LayerRow";
import ResultsTable from "./components/ResultsTable";
import CoefficientsTable from "./components/CoefficientsTable";
import SummaryTable from "./components/SummaryTable";
import GraphicPanel from "./components/GraphicPanel";

import { getMaterials, getCities, getFilms, postCalculate, waitForHealth } from "./lib/api";

const INITIAL_ASSEMBLY = "wall";

// ---------- Landing / Intro (inline component) ----------
function LandingIntro({ warming, warmMsg, onStart, demo }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl md:text-3xl font-semibold">U-Value Calculator</h1>
        <p className="text-gray-600 mt-1">
          Estimate U-values and layerwise properties for walls and roofs. The live calculator loads after you click Start.
        </p>

        {/* How-to steps */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl border bg-gray-50">
            <div className="text-sm font-semibold">1) Choose City & Assembly</div>
            <div className="text-xs text-gray-600 mt-1">
              Pick your city (Rsi/Rse) and the assembly (wall/roof).
            </div>
          </div>
          <div className="p-4 rounded-2xl border bg-gray-50">
            <div className="text-sm font-semibold">2) Add Layers</div>
            <div className="text-xs text-gray-600 mt-1">
              Select materials and set thickness. Drag to reorder if needed.
            </div>
          </div>
          <div className="p-4 rounded-2xl border bg-gray-50">
            <div className="text-sm font-semibold">3) Calculate</div>
            <div className="text-xs text-gray-600 mt-1">
              We compute Rs, U (s-s & overall), and heat capacity on the server.
            </div>
          </div>
        </div>

        {/* Demo preview */}
        <div className="mt-8 p-4 rounded-2xl border">
          <div className="flex items-center justify-between">
            <div className="font-medium">Sample result (demo)</div>
            <span className="text-xs text-gray-500">Values are illustrative</span>
          </div>
          <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded bg-gray-50 border">
              <div className="text-gray-500 text-xs">City / Assembly</div>
              <div className="font-medium">{demo.city} / {demo.assembly}</div>
            </div>
            <div className="p-3 rounded bg-gray-50 border">
              <div className="text-gray-500 text-xs">U (surface-to-surface)</div>
              <div className="font-medium">{demo.Uss} W/m²·K</div>
            </div>
            <div className="p-3 rounded bg-gray-50 border">
              <div className="text-gray-500 text-xs">U (overall)</div>
              <div className="font-medium">{demo.Ua} W/m²·K</div>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left">Layer</th>
                  <th className="p-2 border">Thickness (mm)</th>
                  <th className="p-2 border">R (m²·K/W)</th>
                </tr>
              </thead>
              <tbody>
                {demo.layers.map((L, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-2 border">{L.material}</td>
                    <td className="p-2 border text-center">{L.thickness_mm}</td>
                    <td className="p-2 border text-center">{L.R_layer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Start button / warmup text */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={onStart}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
          >
            {warming ? "Starting…" : "Start"}
          </button>
          <div className="text-sm text-gray-600">
            {warming
              ? (warmMsg || "Waking the server… this can take ~30–60s on the free plan")
              : "Click to proceed to the live calculator"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- App ----------
const DEMO = {
  city: "Ahmedabad",
  assembly: "Wall",
  Uss: "0.42",
  Ua: "0.38",
  layers: [
    { material: "Acrylic Sheet", thickness_mm: 6, R_layer: "0.02" },
    { material: "Calcium Silicate Board", thickness_mm: 10, R_layer: "0.05" },
    { material: "Mineral Wool", thickness_mm: 50, R_layer: "1.25" },
    { material: "Gypsum", thickness_mm: 12, R_layer: "0.08" },
  ],
};

const getInitialState = () => ({
  layers: [],
  city: "",
  assembly: INITIAL_ASSEMBLY,
});

export default function App() {
  // Landing / warmup states
  const [started, setStarted] = useState(false);
  const [warmReady, setWarmReady] = useState(false);
  const [warmMsg, setWarmMsg] = useState("Waking the server…");

  // App states
  const [materials, setMaterials] = useState([]);
  const [cities, setCities] = useState([]);
  const initialState = getInitialState();
  const [city, setCity] = useState(initialState.city);
  const [assembly, setAssembly] = useState(initialState.assembly);
  const [layers, setLayers] = useState(initialState.layers);
  const [result, setResult] = useState(null);
  const [films, setFilms] = useState({ Hi: 0, Ho: 0 });
  const [validationErrors, setValidationErrors] = useState([]);
  const [errorBanner, setErrorBanner] = useState("");

  // Begin warming backend immediately on first load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setWarmMsg("Initializing…");
        await waitForHealth({ maxWaitMs: 90000, pollMs: 3000 });
        if (!cancelled) setWarmReady(true);
      } catch (e) {
        if (!cancelled) {
          setWarmMsg("Server is taking longer than usual… You can still start and it will retry.");
          setWarmReady(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load initial data after user starts (so intro page has time to warm backend)
  useEffect(() => {
    if (!started) return;
    let mounted = true;

    (async () => {
      try {
        const mats = await getMaterials();
        const citiesRes = await getCities();
        if (!mounted) return;
        setMaterials(mats || []);
        setCities(Array.isArray(citiesRes?.cities) ? citiesRes.cities : []);
      } catch (e) {
        if (!mounted) return;
        setErrorBanner(e?.message || "Failed to load initial data.");
      }
    })();

    return () => { mounted = false; };
  }, [started]);

  // Films depend on city & assembly
  useEffect(() => {
    if (!started) return;
    if (!city) { setFilms({ Hi: 0, Ho: 0 }); return; }
    getFilms(city, assembly)
      .then(setFilms)
      .catch(() => setFilms({ Hi: 0, Ho: 0 }));
  }, [started, city, assembly]);

  // Persist app state locally
  useEffect(() => {
    if (!started) return;
    const stateToSave = { layers, city, assembly };
    localStorage.setItem("uvalue-calculator-state", JSON.stringify(stateToSave));
  }, [started, layers, city, assembly]);

  // Validation
  useEffect(() => {
    if (!started) return;
    const errors = [];
    if (!city) errors.push("Please select a city.");
    if (layers.length === 0) errors.push("Please add at least one layer.");
    layers.forEach((layer, index) => {
      if (!layer.material) errors.push(`Layer #${index + 1} is missing a material.`);
      if (!(Number(layer.thickness_mm) > 0)) errors.push(`Layer #${index + 1} must have a thickness greater than 0.`);
    });
    setValidationErrors(errors);
  }, [started, city, layers]);

  // Clear results when inputs change
  useEffect(() => {
    if (!started) return;
    setResult(null);
  }, [started, layers, city, assembly]);

  function addLayer() {
    const id = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setLayers(prev => [...prev, { id, material: "", thickness_mm: 10 }]);
  }
  function removeLayer(id) {
    setLayers(prev => prev.filter(l => l.id !== id));
  }

  const matsByName = useMemo(() => {
    const map = new Map();
    materials.forEach(m => map.set(m.name, m));
    return map;
  }, [materials]);

  const SCALE = 2;
  const graphicLayers = useMemo(() => layers.map(l => ({
    id: l.id,
    width: Math.max(1, (Number(l.thickness_mm) || 0) * SCALE),
    img: (matsByName.get(l.material)?.graphicImage || null),
    materialName: l.material,
    thickness: l.thickness_mm
  })), [layers, matsByName]);

  const assemblyMetrics = useMemo(() => {
    const totalThicknessMM = layers.reduce((sum, l) => sum + (Number(l.thickness_mm) || 0), 0);
    const totalGraphicWidthPX = totalThicknessMM * SCALE;
    return { totalThicknessMM, totalGraphicWidthPX };
  }, [layers]);

  const canCalculate = useMemo(() =>
    !!city &&
    layers.length > 0 &&
    layers.every(l => l.material && Number(l.thickness_mm) > 0),
  [city, layers]);

  async function onCalculate() {
    if (!canCalculate) return;
    const payload = {
      city, assembly,
      dynamic_coefficients: true,
      override_Rsi: null, override_Rse: null,
      layers: layers.map(l => ({ material: l.material, thickness_mm: Number(l.thickness_mm) || 0 })),
    };
    try {
      const apiResult = await postCalculate(payload);
      setResult(apiResult);
    } catch (e) {
      alert(e.message);
    }
  }

  const handleSave = () => {
    window.print();
  };

  // Landing screen until user starts
  async function handleStart() {
    // If not warm yet, wait a bit so transition feels smooth
    if (!warmReady) {
      setWarmMsg("Almost there…");
      try { await waitForHealth({ maxWaitMs: 20000, pollMs: 2000 }); } catch (_) {}
    }
    setStarted(true);
  }

  if (!started) {
    return (
      <LandingIntro
        warming={!warmReady}
        warmMsg={warmMsg}
        onStart={handleStart}
        demo={DEMO}
      />
    );
  }

  // Live app
  return (
    <div className="p-4 max-w-6xl mx-auto">
      {errorBanner && (
        <div className="p-3 mb-3 text-sm text-red-800 bg-red-100 rounded-lg border border-red-200">
          {errorBanner}
        </div>
      )}

      <div id="capture-area" className="grid grid-cols-12 gap-4">
        <GraphicPanel
          graphicLayers={graphicLayers}
          totalGraphicWidthPX={assemblyMetrics.totalGraphicWidthPX}
          totalThicknessMM={assemblyMetrics.totalThicknessMM}
        />

        <div className="col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-100 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">City</label>
              <select className="border rounded px-2 py-1" value={city} onChange={(e)=>setCity(e.target.value)}>
                <option value="">-- Select City --</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Assembly Type:</span>
              {["wall", "roof_up"].map(a => (
                <label key={a} className="flex items-center gap-1 text-sm capitalize">
                  <input type="radio" name="asm" value={a} checked={assembly===a} onChange={()=>setAssembly(a)} />
                  {a.replace("_up", "")}
                </label>
              ))}
            </div>

            <button className="px-4 py-1 bg-white border rounded shadow-sm hover:bg-gray-50" onClick={addLayer}>
              Add Layer
            </button>
          </div>

          <div className="mb-2 text-sm">Selected No. of Layers: {layers.length}</div>

          <div className="space-y-1 mb-3">
            {layers.map((l, i) => (
              <LayerRow
                key={l.id}
                layer={l}
                materials={materials}
                isFirst={i===0}
                isLast={i===layers.length-1}
                onChange={(next)=> setLayers(prev => prev.map(x => x.id===l.id ? next : x))}
                onRemove={()=> removeLayer(l.id)}
              />
            ))}
          </div>

          {!canCalculate && validationErrors.length > 0 && (
            <div className="p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-lg" role="alert">
              <span className="font-medium">Please fix the following issues:</span>
              <ul className="mt-1.5 list-disc list-inside">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-4 mb-4">
            <button
              className={`px-4 py-2 rounded ${canCalculate ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 cursor-not-allowed"}`}
              onClick={onCalculate}
              disabled={!canCalculate}
            >
              Calculate
            </button>

            <button
              onClick={handleSave}
              disabled={!result}
              className={`px-4 py-2 rounded ${!result ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-green-600 text-white"}`}
            >
              Save as PDF
            </button>
          </div>

          <div id="results-section">
            {result && result.static && result.dynamic && (
              <div className="space-y-6 mt-4 border-t pt-4">
                <ResultsTable layers={result.dynamic.layers} matsByName={matsByName} />
                <CoefficientsTable result={result} films={films} />
                <SummaryTable result={result} layerCount={layers.length} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
