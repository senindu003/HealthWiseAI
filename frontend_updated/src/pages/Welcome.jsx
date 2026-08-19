import React from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  // Starts the limited, unauthenticated assessment walkthrough.
  const handleDemoModeActivation = () => {
    sessionStorage.setItem("isDemoMode", "true");
    sessionStorage.setItem("isLoggedIn", "false");
    navigate("/assessment/profile");
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 to-slate-100 font-sans text-slate-800 antialiased flex flex-col justify-between">
      {/* Header navigation */}
      <header className="w-full px-6 py-4 max-w-7xl mx-auto flex justify-between items-center z-20 relative">
        <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-slate-900">
          <div className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold text-xs shadow-md">
            🧠
          </div>
          <span>HealthWise AI</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/signin")}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5"
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="text-xs font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 py-2.5 shadow-md transition-all hover:scale-[1.01] uppercase tracking-wider"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Split Bento Layout */}
      <main className="flex-grow flex items-center justify-center px-4 md:px-8 max-w-7xl mx-auto w-full py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          <div className="flex flex-col gap-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs w-fit">
              <span className="text-emerald-500 text-xs select-none">🛡️</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Personalised health insights
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-none">
              Know more. Worry less.
              <br />
              <span className="text-indigo-600 bg-clip-text">
                Take the next step with confidence.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xl">
              Turn everyday health details and laboratory reports into
              personalised, easy-to-understand guidance designed around you.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={() => {
                  sessionStorage.setItem("isDemoMode", "false");
                  navigate("/signup");
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl px-8 py-3.5 shadow-lg shadow-indigo-600/20 uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01] transition-all"
              >
                Create your health profile <span>→</span>
              </button>

              <button
                onClick={handleDemoModeActivation}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl px-8 py-3.5 transition-all shadow-xs flex items-center justify-center"
              >
                Explore the assessment
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2.5 text-slate-400 font-medium text-[11px] leading-normal max-w-md">
              <span className="text-sm select-none pt-0.5">🔒</span>
              <p>
                Your privacy matters. HealthWise AI is a supportive tool for
                exploring your health, not a substitute for professional medical
                advice.
              </p>
            </div>
          </div>

          <div className="relative w-full h-full min-h-[440px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-emerald-500/5 rounded-full blur-3xl -z-10" />
            <div className="grid grid-cols-2 gap-4 w-full max-w-md relative z-10 font-sans">
              <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/50 flex flex-col gap-3 transform translate-y-6 hover:-translate-y-0.5 transition-all duration-300">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  🫀
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Personal health profile
                  </h3>
                  <p className="text-xl font-black text-slate-900 mt-0.5">
                    Your baseline
                  </p>
                </div>
                <div className="h-6 w-full rounded-md bg-slate-50 border border-slate-100 overflow-hidden flex items-end">
                  <div className="h-1/3 w-1/3 bg-indigo-500 border-r border-white" />
                  <div className="h-2/3 w-1/3 bg-indigo-500 border-r border-white" />
                  <div className="h-full w-1/3 bg-indigo-500" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200/50 flex flex-col justify-between transform -translate-y-2 hover:-translate-y-8 transition-all duration-300">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm">
                  🧠
                </div>
                <div className="space-y-1 py-2">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    AI-guided review
                  </h3>
                  <p className="text-sm font-black text-emerald-600 uppercase tracking-wide">
                    Personalised insights
                  </p>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  Clear next steps
                </p>
              </div>

              <div className="col-span-2 bg-white rounded-2xl p-4 border border-slate-200/50 shadow-md flex items-center justify-between gap-4 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-base">
                    📋
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 tracking-tight">
                      Report analysis
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Structured findings to help you prepare for your next
                      healthcare conversation.
                    </p>
                  </div>
                </div>
                <span className="text-emerald-500 text-lg font-bold select-none">
                  ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-slate-200/60 bg-white py-5 px-6 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-wide text-slate-400">
        <div className="text-slate-900 font-black tracking-wider">
          HealthWise AI
        </div>
        <div>
          &copy; 2026 HealthWise AI. Personal health insights, thoughtfully
          presented.
        </div>
        <div className="flex gap-4">
          <a className="hover:text-indigo-600 transition-colors" href="#">
            Medical disclaimer
          </a>
          <a className="hover:text-indigo-600 transition-colors" href="#">
            Platform status
          </a>
          <a className="hover:text-indigo-600 transition-colors" href="#">
            Privacy
          </a>
        </div>
      </footer>
    </div>
  );
}
