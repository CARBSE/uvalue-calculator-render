import React, { useMemo } from "react";

export default function LayerRow({ layer, onChange, materials, onRemove, isFirst, isLast }) {
  const options = useMemo(
    () => [...materials].sort((a, b) => a.name.localeCompare(b.name)),
    [materials]
  );

  return (
    <div className="flex items-center gap-2 py-1">
      <select
        className="border rounded px-2 py-1 w-64"
        value={layer.material || ""}
        onChange={(e) => onChange({ ...layer, material: e.target.value })}
      >
        <option value="">-- Select material --</option>
        {options.map((m) => (
          <option key={m.name} value={m.name}>{m.name}</option>
        ))}
      </select>

      <input
        type="number"
        min="0"
        step="1"
        className="border rounded px-2 py-1 w-24"
        value={layer.thickness_mm ?? ""}
        onChange={(e) => onChange({ ...layer, thickness_mm: Number(e.target.value || 0) })}
      />
      <span className="text-sm text-gray-500">mm</span>

      <span className="text-xs text-gray-500">{isFirst ? "Outside" : isLast ? "Inside" : ""}</span>

      <button type="button" className="text-red-600 ml-2" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}
