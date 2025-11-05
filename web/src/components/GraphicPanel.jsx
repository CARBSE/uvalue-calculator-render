import React from 'react';
import Ruler from './Ruler';
import { graphicImageUrl } from '../lib/api';

const GraphicPanel = ({ graphicLayers, totalGraphicWidthPX, totalThicknessMM }) => {
  return (
    <div className="col-span-3">
      <div className="text-xs flex justify-between mb-1">
        <span>Outside</span>
        <span>Inside</span>
      </div>

      <div className="border rounded h-[500px] overflow-hidden bg-white relative pb-6">
        {/* main container for layers */}
        <div className="absolute inset-0 top-0 bottom-6 flex flex-row">
          {graphicLayers.map((g) => {
            const texUrl = g.img ? graphicImageUrl(g.img) : null;
            return (
              <div
                key={g.id}
                className="flex flex-col h-full border-r last:border-r-0"
                style={{ width: `${g.width}px`, minWidth: '24px' }}
                title={`${g.materialName} (${g.thickness}mm)`}
              >
                {/* thickness label */}
                <div className="h-5 text-center text-xs text-gray-600 border-b flex-shrink-0">
                  {g.thickness}
                </div>

                {/* graphic texture */}
                <div
                  className="flex-grow"
                  style={
                    texUrl
                      ? {
                          backgroundImage: `url(${texUrl})`,
                          backgroundSize: '100% auto',
                          backgroundRepeat: 'repeat-y',
                        }
                      : {
                          backgroundColor: '#f0f0f0',
                          backgroundImage:
                            'linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%, #e0e0e0), linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%, #e0e0e0)',
                          backgroundSize: '10px 10px',
                          backgroundPosition: '0 0, 5px 5px',
                          backgroundRepeat: 'repeat',
                        }
                  }
                />
              </div>
            );
          })}
        </div>

        <Ruler totalWidthPx={totalGraphicWidthPX} totalThicknessMm={totalThicknessMM} />
      </div>
    </div>
  );
};

export default GraphicPanel;
