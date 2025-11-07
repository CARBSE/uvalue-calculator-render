import React from 'react';
import { descriptionImageUrl } from '../lib/api';

const ResultsTable = ({ layers, matsByName }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800">Thermal Properties of Individual Layers</h3>
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
            {layers.map((layer, index) => {
              const materialData = matsByName.get(layer.material);
              const density = materialData ? materialData.rho : 'N/A';
              const filename = materialData?.descriptionImage || '';
              const rawUrl = filename ? descriptionImageUrl(filename) : '';
              const imgUrl = rawUrl ? `${rawUrl}?v=${encodeURIComponent(filename)}` : '';

              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-2 border">{layer.material}</td>
                  <td className="p-2 border">
                    {imgUrl ? (
                      <div className="flex flex-col items-center gap-1">
                        <img
                          src={imgUrl}
                          alt={layer.material}
                          className="h-12 w-20 object-cover rounded-sm"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        {/* Debug: show final URL so you can check path/case */}
                        <div className="text-[10px] text-gray-400 break-all">{imgUrl}</div>
                      </div>
                    ) : (
                      <div className="h-12 w-20 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="p-2 border">{layer.thickness_mm}</td>
                  <td className="p-2 border">{layer.k_W_mK.toFixed(4)}</td>
                  <td className="p-2 border">{density}</td>
                  <td className="p-2 border">{layer.R_layer.toFixed(4)}</td>
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
