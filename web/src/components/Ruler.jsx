import React from 'react';

const Ruler = ({ totalWidthPx, totalThicknessMm }) => {
  if (totalThicknessMm <= 0) {
    return null;
  }

  // Create a tick mark every 50mm, for example
  const tickIntervalMm = 50;
  const numTicks = Math.floor(totalThicknessMm / tickIntervalMm);
  const pixelsPerMm = totalWidthPx / totalThicknessMm;

  const ticks = [];
  for (let i = 1; i <= numTicks; i++) {
    const mmValue = i * tickIntervalMm;
    ticks.push({
      mm: mmValue,
      px: mmValue * pixelsPerMm,
    });
  }

  return (
    <div className="absolute -bottom-5 left-0 h-5 w-full">
      {/* Main ruler line */}
      <div 
        className="absolute top-0 h-px bg-gray-500"
        style={{ width: `${totalWidthPx}px` }}
      ></div>

      {/* Start tick */}
      <div className="absolute top-0 left-0 h-2 w-px bg-gray-500"></div>
      <span className="absolute top-2 left-0 -translate-x-1/2 text-[10px] text-gray-600">0</span>

      {/* Intermediate ticks */}
      {ticks.map(tick => (
        <div key={tick.mm}>
          <div
            className="absolute top-0 h-2 w-px bg-gray-500"
            style={{ left: `${tick.px}px` }}
          ></div>
          <span
            className="absolute top-2 text-[10px] text-gray-600 -translate-x-1/2"
            style={{ left: `${tick.px}px` }}
          >
            {tick.mm}
          </span>
        </div>
      ))}

      {/* End tick */}
      <div
        className="absolute top-0 h-2 w-px bg-gray-500"
        style={{ left: `${totalWidthPx}px` }}
      ></div>
      <span
        className="absolute top-2 text-[10px] text-gray-600 -translate-x-1/2"
        style={{ left: `${totalWidthPx}px` }}
      >
        {Math.round(totalThicknessMm)}
      </span>
    </div>
  );
};

export default Ruler;