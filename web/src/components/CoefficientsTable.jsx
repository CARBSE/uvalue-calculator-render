import React from 'react';

const CoefficientsTable = ({ result, films }) => {
  const staticData = result.static;
  const dynamicData = result.dynamic;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800">Surface Heat Transfer Coefficient Calculations</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border-b">Method</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 border-b">City</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-600 border-b">Rsi (m²·K/W)</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-600 border-b">Rse (m²·K/W)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-bold text-gray-700 border-b">Static</td>
              <td className="px-4 py-2 text-sm text-gray-700 border-b">{staticData.city}</td>
              <td className="px-4 py-2 text-right text-sm text-gray-700 border-b">{staticData.Rsi.toFixed(3)}</td>
              <td className="px-4 py-2 text-right text-sm text-gray-700 border-b">{staticData.Rse.toFixed(3)}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-bold text-gray-700 border-b">Dynamic</td>
              <td className="px-4 py-2 text-sm text-gray-700 border-b">{dynamicData.city}</td>
              <td className="px-4 py-2 text-right text-sm text-gray-700 border-b">{dynamicData.Rsi.toFixed(3)}</td>
              <td className="px-4 py-2 text-right text-sm text-gray-700 border-b">{dynamicData.Rse.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CoefficientsTable;