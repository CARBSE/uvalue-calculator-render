import React from 'react';

const SummaryTable = ({ result, layerCount }) => {
  const staticData = result.static;
  const dynamicData = result.dynamic;
  
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800">Thermal Properties of Assemblies</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Assembly</th>
              <th className="p-2 border">Surf Heat Trans Coeff Calc Method</th>
              <th className="p-2 border">Surface to Surface U-factor (W/m²·K)</th>
              <th className="p-2 border">Overall U-factor (W/m²·K)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50">
              <td className="p-2 border">{`Layers 1-${layerCount}`}</td>
              <td className="p-2 border">Static</td>
              <td className="p-2 border">{staticData.U_surface_to_surface.toFixed(3)}</td>
              <td className="p-2 border">{staticData.U_overall.toFixed(3)}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-2 border">{`Layers 1-${layerCount}`}</td>
              <td className="p-2 border">Dynamic</td>
              <td className="p-2 border">{dynamicData.U_surface_to_surface.toFixed(3)}</td>
              <td className="p-2 border">{dynamicData.U_overall.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-xs text-gray-600 mt-2">
          Rs (layers only): {dynamicData.Rs.toFixed(3)} m²·K/W &nbsp; | &nbsp;
          Heat capacity: {dynamicData.heat_capacity_kJ_m2K} kJ/m²·K
        </div>
      </div>
    </div>
  );
};

export default SummaryTable;