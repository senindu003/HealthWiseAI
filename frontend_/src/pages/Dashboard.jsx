import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  // CRITICAL PERSISTENCE MIGRATION: Connect to volatile space vectors
  const cachedData = useMemo(() => {
    const rawDataJson = sessionStorage.getItem("healthwise_form_data");
    if (rawDataJson) {
      try {
        return JSON.parse(rawDataJson);
      } catch (e) {
        console.error("Unable to parse dynamic session dataset markers.", e);
      }
    }
    return null;
  }, []);

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
        const prim = Object.values(cachedData.firstDegreeHistory || {}).filter(
          Boolean,
        ).length;
        const sec = Object.values(cachedData.secondDegreeHistory || {}).filter(
          Boolean,
        ).length;
        hereditaryFlagsCount = prim + sec;
      }
      if (cachedData.selectedSymptoms) {
        activeSymptomsCount = cachedData.selectedSymptoms.length;
      }
      heightCm = Number(cachedData.height || 0);
      weightKg = Number(cachedData.weight || 0);
    }

    // Adaptively formulate standard parameters metrics values
    let computedBmi = 0;
    let bmiLabel = "Not Computed";
    if (heightCm > 0 && weightKg > 0) {
      const hM = heightCm / 100;
      computedBmi = weightKg / (hM * hM);
      if (computedBmi < 18.5) bmiLabel = "Underweight Baseline";
      else if (computedBmi < 25) bmiLabel = "Optimal Structural Healthy Weight";
      else if (computedBmi < 30) bmiLabel = "Overweight Baseline Indicators";
      else bmiLabel = "Obesity Risk Markers Alert";
    }

    return {
      personalConditionsCount,
      hereditaryFlagsCount,
      activeSymptomsCount,
      computedBmi,
      bmiLabel,
    };
  }, [cachedData]);

  return (
    <div
      className="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Upper Header Welcome Block Rows */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
              Patient Dashboard Terminal
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Track multi-stage diagnostic checking criteria parameters over
              active session loops.
            </p>
          </div>
          <button
            onClick={() => navigate("/assessment/profile")}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/10 hover:scale-[1.01] transition-all"
          >
            Launch Intake Gate Checklist
          </button>
        </div>

        {/* Live Vector Summary Blocks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Computed Biometric BMI
            </span>
            <p className="text-xl font-black tracking-tight text-slate-900">
              {dynamicMetricsSummary.computedBmi > 0
                ? dynamicMetricsSummary.computedBmi.toFixed(1)
                : "--"}
            </p>
            <span className="text-[10px] font-medium text-slate-500 block">
              {dynamicMetricsSummary.bmiLabel}
            </span>
          </div>

          <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Personal Preconditions
            </span>
            <p className="text-xl font-black tracking-tight text-slate-900">
              {dynamicMetricsSummary.personalConditionsCount} Logged
            </p>
            <span className="text-[10px] font-medium text-slate-500 block">
              Active baseline metrics checks
            </span>
          </div>

          <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Hereditary Lineage Flags
            </span>
            <p className="text-xl font-black tracking-tight text-slate-900">
              {dynamicMetricsSummary.hereditaryFlagsCount} Vectors
            </p>
            <span className="text-[10px] font-medium text-slate-500 block">
              Hereditary pedigree tracks mapped
            </span>
          </div>

          <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Active Reviews Anomaly
            </span>
            <p className="text-xl font-black tracking-tight text-slate-900">
              {dynamicMetricsSummary.activeSymptomsCount} Symptoms
            </p>
            <span className="text-[10px] font-medium text-slate-500 block">
              Systems checks flags completed
            </span>
          </div>
        </div>

        {/* Static Analytics Plot Visual Layout Graphic */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Historical Simulation Trajectory
          </h3>
          <div className="h-48 w-full bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-xs text-slate-400 font-medium italic">
            Visual graph chart framework active.
          </div>
        </div>
      </main>
    </div>
  );
}
