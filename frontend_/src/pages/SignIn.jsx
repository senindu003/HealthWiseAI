import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorState, setErrorState] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Hardcoded sandbox credentials for local authentication evaluation loops
    if (email === "admin@healthwise.com" && password === "password123") {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("isDemoMode", "false"); // Upgrade out of restricted walkthrough parameters
      setErrorState("");
      navigate("/dashboard");
    } else {
      setErrorState(
        "Invalid credentials. Hint: use admin@healthwise.com / password123",
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 antialiased">
      <div className="w-full flex min-h-screen">
        {/* Left Graphics Panel Banner */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 text-white p-12 flex-col justify-between border-r border-slate-900">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <div className="w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl absolute -top-12 -left-12" />
          </div>

          <div className="relative z-10">
            <Link
              to="/"
              className="flex items-center gap-3 text-sm font-black uppercase tracking-wider text-white"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center font-bold text-xs">
                🧠
              </div>
              <span>HealthWise AI</span>
            </Link>
          </div>

          <div className="relative z-10 max-w-md space-y-4">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-400">
              Clinical Integration Engine
            </span>
            <h2 className="text-3xl font-black tracking-tight leading-tight">
              Precision Intelligence Conjoined with Human Excellence.
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Empowering global practitioners and patient metrics mapping with
              scalable, evidence-based code architectures and clear analytical
              checkpoints.
            </p>
          </div>

          <div className="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            HIPAA Data Encrypted Channel &bull; Secure Session Core
          </div>
        </div>

        {/* Right Interaction Interactive Portal Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100 relative">
          <div className="absolute top-6 left-6 lg:hidden">
            <Link
              to="/"
              className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                🧠
              </div>
              <span>HealthWise AI</span>
            </Link>
          </div>

          <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-xl shadow-slate-200/30 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                Welcome Back
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Verify credentials to open the clinical overview matrix.
              </p>
            </div>

            {/* Sandbox Testing Assistance Message Callout */}
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] font-semibold text-indigo-800 leading-normal">
              🔑 <strong>Sandbox Test Account Indicators:</strong>
              <br />
              Email:{" "}
              <code className="bg-white/80 px-1 rounded">
                admin@healthwise.com
              </code>
              <br />
              Password:{" "}
              <code className="bg-white/80 px-1 rounded">password123</code>
            </div>

            {errorState && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl animate-fadeIn">
                {errorState}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Email Address Identifier
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40 select-none">
                    ✉️
                  </span>
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Secure Account Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40 select-none">
                    🔒
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-500 select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Maintain Session</span>
                </label>
                <a
                  href="#"
                  className="text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Recover Access?
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl py-3 shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                Authorize Session <span>→</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
