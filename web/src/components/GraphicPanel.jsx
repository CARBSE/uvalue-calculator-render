import React from 'react';
import Ruler from './Ruler';

const GraphicPanel = ({ graphicLayers, totalGraphicWidthPX, totalThicknessMM }) => {
  return (
    <div className="col-span-3">
      <div className="text-xs flex justify-between mb-1">
        <span>Outside</span>
        <span>Inside</span>
      </div>
      <div className="border rounded h-[500px] overflow-hidden bg-white relative pb-6">
        {/* This is the main container for the layers */}
        <div className="absolute inset-0 top-0 bottom-6 flex flex-row">
          {graphicLayers.map(g => (
            // Each layer is now a vertical container
            <div
              key={g.id}
              className="flex flex-col h-full border-r last:border-r-0"
              style={{ width: `${g.width}px`, minWidth: '24px' }} // Set a minimum width for readability
              title={`${g.materialName} (${g.thickness}mm)`}
            >
              {/* 1. Thickness Label Area */}
              <div className="h-5 text-center text-xs text-gray-600 border-b flex-shrink-0">
                {g.thickness}
              </div>

              {/* 2. Graphic Image Area */}
              <div
                className="flex-grow" // This div takes up the remaining vertical space
                style={{
                  backgroundColor: g.img ? 'transparent' : '#f0f0f0',
                  backgroundSize: g.img ? '100% auto' : '10px 10px',
                  backgroundRepeat: g.img ? 'repeat-y' : 'repeat',
                  backgroundImage: g.img
                    ? `url(/static/materials/graphic/${g.img})`
                    : 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%, #e0e0e0), linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%, #e0e0e0)',
                  backgroundPosition: '0 0, 5px 5px',
                }}
              />
            </div>
          ))}
        </div>
        <Ruler totalWidthPx={totalGraphicWidthPX} totalThicknessMm={totalThicknessMM} />
      </div>
    </div>
  );
};

export default GraphicPanel;