import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { saveRecommendation } from "../lib/api";

// Mapping helper to resolve Material Icons dynamically matching category strings
const CATEGORY_ICONS = {
  "metabolic profile": "water_drop",
  cardiovascular: "monitor_heart",
  hematology: "science",
  "nutritional deficiencies": "medication",
};

export default function LabRecommendations() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [saveState, setSaveState] = useState({
    loading: false,
    message: "",
    error: "",
  });

  // Extract the live runtime analytics framework out of session storage
  const sessionCachedResult = useMemo(() => {
    const rawCacheData = sessionStorage.getItem("active_lab_recommendations");
    if (rawCacheData) {
      try {
        return JSON.parse(rawCacheData);
      } catch (e) {
        console.error("Session parse error inside recommendations view:", e);
      }
    }
    return null;
  }, []);

  // Preprocess, label, and filter the full array catalog simultaneously without tab restrictions
  const finalRecommendationsList = useMemo(() => {
    if (!sessionCachedResult || !sessionCachedResult.recommendations) return [];

    return sessionCachedResult.recommendations
      .map((test) => {
        // Resolve the exact parent Track Tier Grouping dynamically for card display
        let trackGroup = "Recommended Track";
        const priorityText = (test.priority || "").toLowerCase();

        if (priorityText.includes("optional")) {
          trackGroup = "Optional Track";
        } else if (
          priorityText.includes("routine") ||
          priorityText.includes("preventative") ||
          priorityText.includes("preventive") ||
          priorityText.includes("low")
        ) {
          trackGroup = "Preventive Track";
        }

        return {
          ...test,
          trackGroup,
        };
      })
      .filter((test) => {
        const query = searchQuery.toLowerCase();
        return (
          (test.test_name || "").toLowerCase().includes(query) ||
          (test.category || "").toLowerCase().includes(query) ||
          (test.trackGroup || "").toLowerCase().includes(query) ||
          (test.personalized_explanation || "").toLowerCase().includes(query)
        );
      });
  }, [searchQuery, sessionCachedResult]);

  const handleSave = async () => {
    const questionnaire = sessionStorage.getItem("healthwise_questionnaire");
    if (!sessionStorage.getItem("accessToken") || !questionnaire) {
      setSaveState({
        loading: false,
        message: "",
        error: "Sign in and complete an assessment before saving.",
      });
      return;
    }
    setSaveState({ loading: true, message: "", error: "" });
    try {
      const saved = await saveRecommendation({
        questionnaire: JSON.parse(questionnaire),
        aiResponse: sessionCachedResult,
      });
      sessionStorage.setItem("latest_recommendation_id", saved.id);
      setSaveState({
        loading: false,
        message: "Recommendations saved to your history.",
        error: "",
      });
    } catch (error) {
      setSaveState({
        loading: false,
        message: "",
        error: error.message || "Could not save recommendations.",
      });
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Fallback Catch Layout if Session Data is Missing
  if (!sessionCachedResult) {
    return (
      <div className="bg-slate-50 min-h-[75vh] flex items-center justify-center p-6 text-slate-900 font-sans antialiased">
        <div className="max-w-md w-full bg-white rounded-[24px] border border-slate-200/80 p-8 text-center shadow-lg space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl mx-auto">
            🔒
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-black uppercase text-slate-900 tracking-wide">
              No Diagnostics Set Logged
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed px-4">
              Please initialize your biometric baseline profile configuration
              setup wizard first to generate structural recommendation metrics.
            </p>
          </div>
          <button
            onClick={() => navigate("/assessment/profile")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-5 py-3.5 shadow-md shadow-indigo-600/10 transition-all"
          >
            Complete Health Intake Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-6">
        {/* Top Header Row with Search Input Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
              All Recommended Lab Tests
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
              Unified view mapping all systemic baseline diagnostic checkpoints
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saveState.loading}
              className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 disabled:opacity-60"
            >
              {saveState.loading ? "Saving…" : "Save"}
            </button>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, category, or track..."
                className="w-full sm:w-72 bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>
        {saveState.error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700"
          >
            {saveState.error}
          </div>
        )}
        {saveState.message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"
          >
            {saveState.message}
          </div>
        )}

        {/* Global Summary Explanation Banner Block */}
        {sessionCachedResult.summary && (
          <div className="p-5 bg-slate-900 rounded-[20px] border border-slate-800 shadow-md text-white flex gap-4 items-start">
            <span className="material-symbols-outlined text-indigo-400 mt-0.5">
              auto_awesome
            </span>
            <p className="text-xs font-medium leading-relaxed text-slate-300">
              {sessionCachedResult.summary}
            </p>
          </div>
        )}

        {/* UNIFIED CARD GRID LAYOUT PANEL */}
        {finalRecommendationsList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finalRecommendationsList.map((test, index) => {
              const isHigh = test.priority?.toLowerCase().includes("high");
              const isMed = test.priority?.toLowerCase().includes("medium");

              const priorityBadgeStyle = isHigh
                ? "bg-rose-50 text-rose-700 border-rose-100"
                : isMed
                  ? "bg-amber-50 text-amber-700 border-amber-100"
                  : "bg-slate-100 text-slate-600 border-slate-200";

              // Resolve category specific icons or fall back safely to a default flask element
              const categoryKey = (test.category || "").toLowerCase();
              const categoryIcon = CATEGORY_ICONS[categoryKey] || "science";

              // Format distinct color themes for Track Badges written on cards
              let trackBadgeColor =
                "bg-indigo-50 text-indigo-700 border-indigo-100";
              if (test.trackGroup.includes("Optional"))
                trackBadgeColor =
                  "bg-violet-50 text-violet-700 border-violet-100";
              if (test.trackGroup.includes("Preventive"))
                trackBadgeColor = "bg-teal-50 text-teal-700 border-teal-100";

              return (
                <div
                  key={index}
                  className="bg-white rounded-[24px] border border-slate-200/70 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md transition-all flex flex-col justify-between space-y-5 animate-fadeIn"
                >
                  <div className="space-y-4">
                    {/* Upper Badges Block: Dynamic Tracks & Priority Tags */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 border px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${trackBadgeColor}`}
                      >
                        <span className="material-symbols-outlined text-[11px]">
                          folder_shared
                        </span>
                        {test.trackGroup}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 font-bold text-[9px] uppercase border tracking-wide ${priorityBadgeStyle}`}
                      >
                        {test.priority || "Routine Checking"}
                      </span>
                    </div>

                    {/* Test Identity Block Rows */}
                    <div className="flex items-start gap-3.5 pt-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-slate-600 text-[20px]">
                          {categoryIcon}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-black text-slate-900 tracking-tight leading-snug min-h-[40px] flex items-center">
                          {test.test_name}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Category: {test.category || "General Checkup"}
                        </span>
                      </div>
                    </div>

                    {/* Technical Logic Block Row */}
                    <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                        Rule Logic Trigger
                      </span>
                      <p className="text-slate-800 text-[11px] font-semibold italic leading-relaxed">
                        "
                        {test.reason_from_rules ||
                          "Indicated general screening checklist baseline."}
                        "
                      </p>
                    </div>

                    {/* Translation Breakdown Explanation Text */}
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                        Clinical Context
                      </span>
                      <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                        {test.personalized_explanation}
                      </p>
                    </div>
                  </div>

                  {/* Operational Interactive Action Buttons */}
                  <div className="flex gap-2.5 pt-2 border-t border-slate-50">
                    <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl py-2.5 transition-all shadow-xs flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        calendar_month
                      </span>
                      Book Test
                    </button>
                    <button
                      onClick={() => navigate("/report-analysis")}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] rounded-xl py-2.5 transition-all flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        upload_file
                      </span>
                      Upload Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Catalog Filter State Match */
          <div className="text-center py-24 bg-white border border-dashed rounded-[24px] border-slate-300 max-w-sm mx-auto space-y-3">
            <span className="material-symbols-outlined text-[36px] text-slate-300 block">
              layers_clear
            </span>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
              No Recommendations Found
            </h4>
            <p className="text-xs text-slate-400 font-medium px-8 leading-relaxed">
              No active guideline parameters matched your current search
              parameters input query: "{searchQuery}".
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
