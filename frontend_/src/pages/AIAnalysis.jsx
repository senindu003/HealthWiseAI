import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AIAnalysis() {
  const navigate = useNavigate();
  const location = useLocation();
  const [progressWidth, setProgressWidth] = useState("0%");
  const [loadingMessage, setLoadingMessage] = useState(
    "Initializing medical diagnostic matrices...",
  );
  const hasRunPipeline = useRef(false);

  const incomingPayload = location.state?.payload;

  const [steps, setSteps] = useState([
    {
      id: "profile",
      label: "Parsing Biometric Profile Metrics",
      icon: "person_search",
      state: "pending",
    },
    {
      id: "risks",
      label: "Evaluating Inherited Risk Paradigms",
      icon: "analytics",
      state: "pending",
    },
    {
      id: "guidelines",
      label: "Verifying Rule-Mesh Clinical Guidelines",
      icon: "fact_check",
      state: "pending",
    },
    {
      id: "recommendations",
      label: "Synthesizing Personalized Strategy",
      icon: "auto_awesome",
      state: "pending",
    },
  ]);

  useEffect(() => {
    if (!incomingPayload) {
      navigate("/assessment/profile");
      return;
    }

    if (hasRunPipeline.current) return;
    hasRunPipeline.current = true;

    const startPipelineExecution = async () => {
      try {
        // Step 1: Read Baseline Profile
        setProgressWidth("25%");
        setLoadingMessage(
          "Analyzing age, gender, and daily lifestyle modulators...",
        );
        setSteps((prev) =>
          prev.map((s, i) => (i === 0 ? { ...s, state: "active" } : s)),
        );
        await new Promise((r) => setTimeout(r, 800));
        setSteps((prev) =>
          prev.map((s, i) =>
            i === 0
              ? { ...s, state: "completed" }
              : i === 1
                ? { ...s, state: "active" }
                : s,
          ),
        );

        // Step 2: Risk Evaluation
        setProgressWidth("50%");
        setLoadingMessage(
          "Cross-referencing pedigree family history arrays...",
        );
        await new Promise((r) => setTimeout(r, 800));
        setSteps((prev) =>
          prev.map((s, i) =>
            i === 1
              ? { ...s, state: "completed" }
              : i === 2
                ? { ...s, state: "active" }
                : s,
          ),
        );

        // Step 3: Trigger Live Backend Rules Request
        setProgressWidth("75%");
        setLoadingMessage("Querying FastAPI rule-mesh execution nodes...");

        const response = await fetch(
          "http://127.0.0.1:8000/api/v1/recommendations",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(incomingPayload),
          },
        );

        if (!response.ok) throw new Error("CORS or Endpoint Runtime Interrupt");
        const diagnosticResult = await response.json();

        // Step 4: Synthesize & Complete
        setSteps((prev) =>
          prev.map((s, i) =>
            i === 2
              ? { ...s, state: "completed" }
              : i === 3
                ? { ...s, state: "active" }
                : s,
          ),
        );
        setProgressWidth("95%");
        setLoadingMessage("Assembling tailored explanations maps...");
        await new Promise((r) => setTimeout(r, 600));

        // Lock securely inside the session cache layer
        sessionStorage.setItem(
          "active_lab_recommendations",
          JSON.stringify(diagnosticResult),
        );

        setSteps((prev) => prev.map((s) => ({ ...s, state: "completed" })));
        setProgressWidth("100%");

        setTimeout(() => {
          navigate("/recommendations");
        }, 300);
      } catch (err) {
        console.error("API Pipeline Error:", err);
        alert(
          "🚨 Rules engine gateway error. Reverting to profiling matrix entry context.",
        );
        navigate("/assessment/profile");
      }
    };

    startPipelineExecution();
  }, [incomingPayload, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden antialiased">
      {/* Visual background atmospheric enhancements */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <header className="w-full max-w-5xl mx-auto flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        <span className="text-lg">✨</span> HealthWise Analytics Cluster
      </header>

      <main className="w-full max-w-xl mx-auto my-auto bg-slate-900/50 border border-slate-800/80 p-8 rounded-[32px] backdrop-blur-xl shadow-2xl space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-black tracking-wider text-indigo-400 uppercase">
            Processing Health Metrics
          </h2>
          <p className="text-xs text-slate-400 font-semibold h-4">
            {loadingMessage}
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: progressWidth }}
          />
        </div>

        {/* Diagnostic Steps Grid */}
        <div className="space-y-3 pt-4 border-t border-slate-800/60">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                step.state === "active"
                  ? "bg-indigo-500/5 border-indigo-500/30"
                  : step.state === "completed"
                    ? "bg-slate-900 border-slate-800/80 opacity-80"
                    : "border-transparent opacity-25"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">
                  {step.icon}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {step.label}
                </span>
              </div>
              <div>
                {step.state === "completed" ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                    ✓
                  </div>
                ) : step.state === "active" ? (
                  <div className="w-5 h-5 rounded-full border border-indigo-500 flex items-center justify-center bg-slate-950">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-800 bg-slate-950" />
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-[10px] tracking-wider text-slate-600 font-bold uppercase">
        Secure Sandboxed Processing Environment • HIPAA Compliant Stack Logs
      </footer>
    </div>
  );
}
