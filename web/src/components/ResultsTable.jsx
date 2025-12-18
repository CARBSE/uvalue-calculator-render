import React from "react";
import { descriptionImageUrl } from "../lib/api";

function resolveDescriptionSrc(materialData) {
  if (!materialData) return "";
  const val = materialData.descriptionImage || "";
  if (!val) return "";
  // if a full URL was stored, use it as-is; else build the backend URL
  if (/^https?:\/\//i.test(val)) return val;
  return descriptionImageUrl(val);
}

const ResultsTable = ({ layers, matsByName }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800">
        Thermal Properties of Individual Layers
      </h3>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Material</th>
              <th className="p-2 border">Image</th>
              <th className="p-2 border">Thickness (mm)</th>
              <th className="p-2 border">k (W/m·K)</th>
              <th className="p-2 border">Density (ρ) (kg/m³)</th>
              <th className="p-2 border">R-value (m²·K/W)</th>
            </tr>
          </thead>

          <tbody>
            {layers.map((layer, idx) => {
              const m = matsByName.get(layer.material);
              const density = layer.density_kg_m3;
              <td className="p-2 border text-right">
                  {Number.isFinite(density) ? density : "N/A"}
                  </td>

              const imgSrc = resolveDescriptionSrc(m);

              return (
                <tr key={idx} className="hover:bg-gray-50 align-middle">
                  <td className="p-2 border whitespace-nowrap">{layer.material}</td>

                  <td className="p-2 border">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={layer.material}
                        className="h-14 w-24 object-cover rounded-sm border"
                        onError={(e) => {
                          // hide the image completely if it fails
                          e.currentTarget.style.display = "none";
                        }}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-14 w-24 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </td>

                  <td className="p-2 border text-right">{layer.thickness_mm}</td>
                  <td className="p-2 border text-right">
                    {Number.isFinite(layer.k_W_mK) ? layer.k_W_mK.toFixed(4) : "—"}
                  </td>
                  <td className="p-2 border text-right">
                    {Number.isFinite(density) ? density : "N/A"}
                  </td>
                  <td className="p-2 border text-right">
                    {Number.isFinite(layer.R_layer) ? layer.R_layer.toFixed(4) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
