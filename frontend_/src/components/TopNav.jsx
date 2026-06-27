import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navLinks = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Assessment", to: "/assessment/profile" },
    { label: "Recommendations", to: "/recommendations" },
  ];

  // Helper function to resolve structural path active states
  const isActivePath = (path) => {
    if (path === "/dashboard" && location.pathname === "/dashboard")
      return true;
    if (path.includes("assessment") && location.pathname.includes("assessment"))
      return true;
    if (
      path.includes("recommended") &&
      location.pathname.includes("recommended")
    )
      return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950 text-white border-b border-slate-900 shadow-md backdrop-blur-xl">
      <div className="mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Core Application Branding */}
        <Link
          to="/dashboard"
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105">
            🧠
          </div>
          <span className="text-sm font-black uppercase tracking-wider text-white select-none">
            HealthWise AI
          </span>
        </Link>

        {/* Desktop Iterative Navigation Menu Link Trays */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const active = isActivePath(link.to);
            return (
              <Link
                key={link.label}
                to={link.to}
                className={`text-[11px] font-black uppercase tracking-widest transition-all pb-1 border-b-2 ${
                  active
                    ? "text-indigo-400 border-indigo-500"
                    : "text-slate-400 border-transparent hover:text-white hover:border-slate-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* System Diagnostics & Utilities Interface Grid */}
        <div className="flex items-center gap-4">
          {/* Diagnostic Notification Flag Hub */}
          <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-900 focus:outline-none">
            <span className="text-base select-none">🔔</span>
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
          </button>

          {/* User Account Session Context Dropdown Container */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 shadow-md focus:ring-2 focus:ring-indigo-500/50 outline-none transition-transform hover:scale-102"
            >
              <span className="sr-only">Toggle Profile Menu</span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200/80 rounded-2xl shadow-xl py-2 text-xs font-semibold text-slate-700 animate-fadeIn z-50">
                <div className="px-4 py-2 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Session Token Access
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/dashboard");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  My Summary Board
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/assessment/profile");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  Intake Gate Checklist
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/");
                  }}
                  className="w-full text-left px-4 py-2.5 text-rose-600 hover:bg-rose-50/50 transition-colors font-bold"
                >
                  Terminate Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
