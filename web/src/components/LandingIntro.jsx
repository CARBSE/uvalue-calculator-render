// web/src/components/LandingIntro.jsx
import React from "react";

export default function LandingIntro({
  warming,
  warmMsg,
  onStart,
  demo
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl md:text-3xl font-semibold">U-Value Calculator</h1>
        <p className="text-gray-600 mt-1">
          Quickly estimate U-values and layerwise properties for walls, roofs and floors.
        </p>

        {/* How-to steps */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl border bg-gray-50">
            <div className="text-sm font-semibold">1) Choose City & Assembly</div>
            <div className="text-xs text-gray-600 mt-1">Pick your city (for Rsi/Rse) and assembly type (wall/roof/floor).</div>
          </div>
          <div className="p-4 rounded-2xl border bg-gray-50">
            <div className="text-sm font-semibold">2) Add Layers</div>
            <div className="text-xs text-gray-600 mt-1">Select materials and set thickness. Drag to reorder if needed.</div>
          </div>
          <div className="p-4 rounded-2xl border bg-gray-50">
            <div className="text-sm font-semibold">3) Calculate</div>
            <div className="text-xs text-gray-600 mt-1">We compute Rs, U (s-s & overall), and heat capacity on the server.</div>
          </div>
        </div>

        {/* Demo preview block */}
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
                {demo.layers.map((L,i)=>(
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

        {/* Start button / warmup indicator */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={onStart}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-60"
            disabled={false}
          >
            {warming ? "Starting…" : "Start"}
          </button>
          <div className="text-sm text-gray-600">
            {warming ? (warmMsg || "Waking the server… this can take ~30–60s on free plan") :
              "Click to proceed to the live calculator"}
          </div>
        </div>
      </div>
    </div>
  );
}
