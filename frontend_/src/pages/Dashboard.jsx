import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

const navLinks = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Assessment", to: "/assessment/profile" },
  { label: "Recommendations", to: "/recommendations" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  // Read the active form cache out of the local storage boundary framework
  const cachedData = useMemo(() => {
    const rawDataJson = localStorage.getItem("healthwise_form_data");
    if (rawDataJson) {
      try {
        return JSON.parse(rawDataJson);
      } catch (e) {
        console.error("Unable to parse cached dataset indicators", e);
      }
    }
    return null;
  }, []);

  // Compute live scores and risk levels adaptively derived from real user metrics inside the session
  const dynamicMetricsSummary = useMemo(() => {
    let personalConditionsCount = 0;
    let hereditaryFlagsCount = 0;
    let activeSymptomsCount = 0;
    let heightCm = 0;
    let weightKg = 0;

    if (cachedData) {
      if (cachedData.personalHistory) {
        personalConditionsCount = Object.values(
          cachedData.personalHistory,
        ).filter(Boolean).length;
      }
      if (cachedData.firstDegreeHistory || cachedData.secondDegreeHistory) {
        const primary = Object.values(
          cachedData.firstDegreeHistory || {},
        ).filter(Boolean).length;
        const secondary = Object.values(
          cachedData.secondDegreeHistory || {},
        ).filter(Boolean).length;
        hereditaryFlagsCount = primary + secondary;
      }
      if (cachedData.selectedSymptoms) {
        activeSymptomsCount = cachedData.selectedSymptoms.length;
      }
      heightCm = Number(cachedData.height) || 0;
      weightKg = Number(cachedData.weight) || 0;
    }

    // Baseline algorithmic computations for dynamic testing displays
    let riskEvaluationLabel = "Low Risk Profile";
    let riskColorToken = "text-emerald-600";
    let riskBgToken = "bg-emerald-50 border-emerald-100 text-emerald-700";

    if (personalConditionsCount > 2 || activeSymptomsCount > 3) {
      riskEvaluationLabel = "High Priority Review";
      riskColorToken = "text-rose-600";
      riskBgToken = "bg-rose-50 border-rose-100 text-rose-700";
    } else if (personalConditionsCount > 0 || hereditaryFlagsCount > 1) {
      riskEvaluationLabel = "Moderate Action Required";
      riskColorToken = "text-amber-600";
      riskBgToken = "bg-amber-50 border-amber-100 text-amber-700";
    }

    let calculatedBmiVal = null;
    if (heightCm > 0 && weightKg > 0) {
      calculatedBmiVal = weightKg / ((heightCm / 100) * (heightCm / 100));
    }

    return {
      personalConditionsCount,
      hereditaryFlagsCount,
      activeSymptomsCount,
      riskEvaluationLabel,
      riskColorToken,
      riskBgToken,
      bmi: calculatedBmiVal ? calculatedBmiVal.toFixed(1) : "N/A",
    };
  }, [cachedData]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 to-slate-100 font-sans text-slate-800 antialiased flex flex-col">
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Profile Action Dashboard Introduction */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Your Health Overview Hub
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">
              Session-persisted preview metrics updated natively from local
              customer storage tracking frames.
            </p>
          </div>
          <button
            onClick={() => navigate("/assessment/profile")}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 transition-all hover:scale-[1.01]"
          >
            ➕ Modify Baseline Intake Data
          </button>
        </div>

        {/* Live Metrics Grid Driven from LocalStorage Inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card A: Dynamic Anomaly Count */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-b from-indigo-500/10 to-transparent blur-xl opacity-40" />
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Review of Symptoms
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-tight text-indigo-600">
                  {dynamicMetricsSummary.activeSymptomsCount}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Anomalies
                </span>
              </div>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase border bg-indigo-50 border-indigo-100 text-indigo-700">
                  🩺 Active Review
                </span>
              </div>
            </div>
          </div>

          {/* Card B: Deterministic Live Adaptive Risk Assessment Category */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-b from-rose-500/10 to-transparent blur-xl opacity-40" />
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Risk Matrix Stratification
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-xl font-black tracking-tight ${dynamicMetricsSummary.riskColorToken}`}
                >
                  {dynamicMetricsSummary.riskEvaluationLabel}
                </span>
              </div>
              <div className="pt-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase border ${dynamicMetricsSummary.riskBgToken}`}
                >
                  ➡️ Evaluation State
                </span>
              </div>
            </div>
          </div>

          {/* Card C: Dynamic Logged Medical Conditions Count */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-b from-violet-500/10 to-transparent blur-xl opacity-40" />
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Preconditions Checked
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-tight text-violet-600">
                  {dynamicMetricsSummary.personalConditionsCount}
                </span>
                <span className="text-xs font-bold text-slate-400">Logged</span>
              </div>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase border bg-violet-50 border-violet-100 text-violet-700">
                  📊 Internal Matrix
                </span>
              </div>
            </div>
          </div>

          {/* Card D: Dynamic Session Body Mass Index Calculation display */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-b from-emerald-500/10 to-transparent blur-xl opacity-40" />
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Body Mass Metric Profile
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-tight text-emerald-600">
                  {dynamicMetricsSummary.bmi}
                </span>
                {dynamicMetricsSummary.bmi !== "N/A" && (
                  <span className="text-xs font-bold text-slate-400">
                    kg/m²
                  </span>
                )}
              </div>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase border bg-emerald-50 border-emerald-100 text-emerald-700">
                  🔬 Live Score
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Time-Series Graph Illustration Panel */}
        <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Biometric Profile Trends
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Visual metrics sequence map across current sandbox session
                timelines.
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-200/40">
              <button className="rounded-lg bg-slate-900 px-3 py-1 text-[10px] font-bold text-white shadow-xs">
                Static Sandbox Sync
              </button>
            </div>
          </div>

          <div className="relative w-full h-64 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 shadow-inner">
            <svg
              viewBox="0 0 800 250"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line
                x1="0"
                y1="62"
                x2="800"
                y2="62"
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="0"
                y1="125"
                x2="800"
                y2="125"
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="0"
                y1="188"
                x2="800"
                y2="188"
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <path
                d="M0,200 C80,180 160,160 240,140 C320,120 400,100 480,80 C560,60 640,50 720,40 L720,250 L0,250 Z"
                fill="url(#chartGradient)"
              />
              <path
                d="M0,200 C80,180 160,160 240,140 C320,120 400,100 480,80 C560,60 640,50 720,40"
                fill="none"
                stroke="#4F46E5"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                cx="0"
                cy="200"
                r="4"
                fill="white"
                stroke="#4F46E5"
                strokeWidth="2"
              />
              <circle
                cx="720"
                cy="40"
                r="5"
                fill="#4F46E5"
                stroke="white"
                strokeWidth="2"
              />
            </svg>
            <div className="absolute bottom-2 left-4 right-4 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Intake Start</span>
              <span>Processing Phase</span>
              <span>FastAPI Sync</span>
              <span>Synthesis Output</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
