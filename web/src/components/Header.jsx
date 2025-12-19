// web/src/components/Header.jsx
import React from "react";

import carbseLogo from "../assets/carbse-logo.png";
import crdfLogo from "../assets/crdf-logo.png";
import ceptLogo from "../assets/cept-logo.png";

const Header = () => {
  return (
    <header className="w-full bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* LEFT: CARBSE */}
        <div className="flex items-center gap-3">
          <img
            src={carbseLogo}
            alt="CARBSE"
            className="h-12 w-auto"
          />
        </div>

        {/* RIGHT: Partner Logos */}
        <div className="flex items-center gap-6">
          <img src={crdfLogo} alt="CRDF" className="h-10 w-auto" />
          <img src={ceptLogo} alt="CEPT University" className="h-10 w-auto" />
        </div>

      </div>
    </header>
  );
};

export default Header;
