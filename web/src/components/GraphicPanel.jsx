import React from "react";
import Ruler from "./Ruler";
import { graphicImageUrl } from "../lib/api";

function resolveGraphicSrc(filename) {
  if (!filename) return "";
  if (/^https?:\/\//i.test(filename)) return filename;
  return graphicImageUrl(filename);
}

const GraphicPanel = ({ graphicLayers, totalGraphicWidthPX, totalThicknessMM }) => {
  return (
    <div className="col-span-3">
      <div className="text-xs flex justify-between mb-1">
        <span>Outside</span>
        <span>Inside</span>
      </div>

      <div className="border rounded h-[500px] overflow-hidden bg-white relative pb-6">
        {/* main layers container */}
        <div className="absolute inset-0 top-0 bottom-6 flex flex-row">
          {graphicLayers.map((g) => {
            const src = resolveGraphicSrc(g.img);

            return (
              <div
                key={g.id}
                className="flex flex-col h-full border-r last:border-r-0"
                style={{ width: `${g.width}px`, minWidth: "24px" }}
                title={`${g.materialName} (${g.thickness}mm)`}
              >
                {/* thickness label */}
                <div className="h-5 text-center text-xs text-gray-600 border-b flex-shrink-0">
                  {g.thickness}
                </div>

                {/* pattern/image area */}
                <div
                  className="flex-grow"
                  style={{
                    backgroundColor: src ? "transparent" : "#f0f0f0",
                    backgroundImage: src
                      ? `url("${src}")`
                      : 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%, #e0e0e0), linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%, #e0e0e0)',
                    backgroundSize: src ? "100% auto" : "10px 10px",
                    backgroundRepeat: src ? "repeat-y" : "repeat",
                    backgroundPosition: "0 0, 5px 5px",
                  }}
                />
              </div>
            );
          })}
        </div>

        <Ruler
          totalWidthPx={totalGraphicWidthPX}
          totalThicknessMm={totalThicknessMM}
        />
      </div>
    </div>
  );
};

export default GraphicPanel;
