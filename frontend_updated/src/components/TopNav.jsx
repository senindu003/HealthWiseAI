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
    { label: "Report analysis", to: "/report-analysis" },
  ];

  // Robust route verification matching dynamic parameters strings
  const isActivePath = (path) => {
    if (path === "/dashboard" && location.pathname === "/dashboard")
      return true;
    if (path.includes("assessment") && location.pathname.includes("assessment"))
      return true;
    if (
      path.includes("recommendations") &&
      location.pathname.includes("recommendations")
    )
      return true;
    return false;
  };

  const handleLogoutActionSequence = () => {
    // Completely purge both volatile memory cells and authorization flags tracking frameworks
    sessionStorage.clear();
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("isDemoMode");

    setShowProfileMenu(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950 text-white border-b border-slate-900 shadow-md backdrop-blur-xl">
      <div className="mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Core Application Branding */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-white"
        >
          <div className="w-7 h-7 rounded-lg bg-white text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
            🧠
          </div>
          <span>HealthWise AI</span>
        </Link>

        {/* Center Desktop Context Nav Links Navigation Bar Links Links */}
        <nav className="hidden md:flex items-center gap-1.5 h-full">
          {navLinks.map((link) => {
            const active = isActivePath(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                  active
                    ? "bg-white/10 text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side Workflow Utility Control Stack Panel Row Elements */}
        <div className="flex items-center gap-4">
          {/* Explicit Quick Logout Button Icon directly placed in the navbar frame track */}
          <button
            onClick={handleLogoutActionSequence}
            title="Terminate Session"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-bold transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">
              logout
            </span>
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* Interactive User Profile Profile Avatar Cluster */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs hover:border-indigo-400 transition-colors focus:outline-none"
            >
              <span className="material-symbols-outlined">person</span>
            </button>

            {/* Dropdown Menu Overlay Structure Box */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200/80 rounded-2xl shadow-xl text-xs font-semibold text-slate-700 animate-fadeIn z-50 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50">
                  Active Session
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/dashboard");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    space_dashboard
                  </span>{" "}
                  My Dashboard
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/assessment/profile");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    edit_note
                  </span>{" "}
                  Intake Wizard
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  onClick={handleLogoutActionSequence}
                  className="w-full text-left px-4 py-2.5 text-rose-600 hover:bg-rose-50/50 transition-colors font-bold flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[14px] text-rose-600">
                    logout
                  </span>{" "}
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
