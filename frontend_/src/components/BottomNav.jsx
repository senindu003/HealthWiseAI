import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();

  const activeSegmentMatches = (segment) => {
    return location.pathname.includes(segment);
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200/80 shadow-2xl z-40 px-3 pb-safe pt-2 backdrop-blur-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Route Target: Dashboard */}
        <Link
          to="/dashboard"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            location.pathname === "/dashboard"
              ? "text-indigo-600 font-black"
              : "text-slate-400 font-bold"
          }`}
        >
          <span className="text-lg">📊</span>
          <span className="text-[9px] uppercase tracking-wider">Overview</span>
        </Link>

        {/* Route Target: Assessment Intake Framework */}
        <Link
          to="/assessment/profile"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeSegmentMatches("assessment")
              ? "text-indigo-600 font-black"
              : "text-slate-400 font-bold"
          }`}
        >
          <span className="text-lg">🩺</span>
          <span className="text-[9px] uppercase tracking-wider">
            Intake Portal
          </span>
        </Link>

        {/* Route Target: Structural Lab Target Reports */}
        <Link
          to="/recommended-tests"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeSegmentMatches("recommended")
              ? "text-indigo-600 font-black"
              : "text-slate-400 font-bold"
          }`}
        >
          <span className="text-lg">🔬</span>
          <span className="text-[9px] uppercase tracking-wider">
            Biomedical Map
          </span>
        </Link>
      </div>
    </nav>
  );
}
