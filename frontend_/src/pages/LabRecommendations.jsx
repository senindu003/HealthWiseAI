import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const RECOMMENDATION_TABS = ["Recommended", "Optional", "Preventive"];

const CATEGORY_TABS = [
  { label: "Metabolic Profile", icon: "water_drop" },
  { label: "Cardiovascular", icon: "monitor_heart" },
  { label: "Hematology", icon: "science" },
  { label: "Nutritional Deficiencies", icon: "medication" },
];

export default function LabRecommendations() {
  const navigate = useNavigate();
  const [activeRecommendation, setActiveRecommendation] =
    useState("Recommended");
  const [activeCategory, setActiveCategory] = useState("Metabolic Profile");
  const [searchQuery, setSearchQuery] = useState("");

  // Extract the live runtime analytics framework straight out of session storage
  const sessionCachedResult = useMemo(() => {
    const rawCacheData = sessionStorage.getItem("active_lab_recommendations");
    if (rawCacheData) {
      try {
        return JSON.parse(rawCacheData);
      } catch (e) {
        console.error("Session parse constraint intercept exception:", e);
      }
    }
    return null;
  }, []);

  // Filter recommendations array dynamically against category selections, tabs, and query bounds
  const filteredRecommendations = useMemo(() => {
    if (!sessionCachedResult || !sessionCachedResult.recommendations) return [];

    return sessionCachedResult.recommendations.filter((test) => {
      // 1. Filter by Category mapping
      const testCategory = test.category || "Metabolic Profile";
      const matchCategory =
        testCategory.toLowerCase() === activeCategory.toLowerCase();

      // 2. Filter by Upper Track Groupings ('Recommended', 'Optional', 'Preventive')
      let priorityGroup = "Recommended";
      const priorityText = (test.priority || "").toLowerCase();

      if (priorityText.includes("optional")) {
        priorityGroup = "Optional";
      } else if (
        priorityText.includes("routine") ||
        priorityText.includes("preventative") ||
        priorityText.includes("preventive") ||
        priorityText.includes("low")
      ) {
        priorityGroup = "Preventive";
      }
      const matchTab = priorityGroup === activeRecommendation;

      // 3. Filter by Input Search Parameters
      const matchSearch =
        (test.test_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (test.personalized_explanation || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      return matchCategory && matchTab && matchSearch;
    });
  }, [activeCategory, activeRecommendation, searchQuery, sessionCachedResult]);

  // Graceful Catch State for Empty Navigation Instances
  if (!sessionCachedResult) {
    return (
      <div className="bg-slate-50 min-h-[75vh] flex items-center justify-center p-6 text-slate-900 font-sans antialiased">
        <div className="max-w-md w-full bg-white rounded-[24px] border border-slate-200/80 p-8 text-center shadow-lg space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl mx-auto shadow-2xs">
            🔒
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-black uppercase text-slate-900 tracking-wide">
              No Diagnostics Set Logged
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed px-4">
              Please initialize your biometric baseline variables profile
              configuration setup wizard first to generate structural
              recommendation metrics.
            </p>
          </div>
          <button
            onClick={() => navigate("/assessment/profile")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-5 py-3.5 shadow-md shadow-indigo-600/10 hover:scale-[1.01] transition-all"
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
      <main className="w-full max-w-[960px] mx-auto px-4 md:px-8 py-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
              Recommended Lab Tests
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
              Based on your health profile and AI analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tests..."
                className="w-full sm:w-56 bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Summary Description Box Banner */}
        {sessionCachedResult.summary && (
          <div className="mb-6 p-5 bg-slate-900 rounded-[24px] border border-slate-800 shadow-xl text-white">
            <p className="text-xs font-medium leading-relaxed text-slate-300">
              {sessionCachedResult.summary}
            </p>
          </div>
        )}

        {/* Recommendation Priority Toggle Line Segment Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-slate-200/50 rounded-xl p-1.5 shadow-inner">
          {RECOMMENDATION_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveRecommendation(tab)}
              className={`flex-1 rounded-lg px-4 py-2.5 font-bold text-xs tracking-wide transition-all ${
                activeRecommendation === tab
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Global System Filter Categories Horizontal Row */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORY_TABS.map((cat) => {
            const isMatch =
              activeCategory.toLowerCase() === cat.label.toLowerCase();
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(cat.label)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border transition-all whitespace-nowrap ${
                  isMatch
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs"
                    : "bg-white text-slate-500 border-slate-200/80 hover:bg-slate-50"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {cat.icon}
                </span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Render Grid Cards Stack Content */}
        <div className="space-y-6">
          {filteredRecommendations.length > 0 ? (
            filteredRecommendations.map((test, index) => {
              const isHigh = test.priority?.toLowerCase().includes("high");
              const isMed = test.priority?.toLowerCase().includes("medium");

              const badgeStyle = isHigh
                ? "bg-rose-50 text-rose-700 border-rose-200/60"
                : isMed
                  ? "bg-amber-50 text-amber-700 border-amber-200/60"
                  : "bg-slate-100 text-slate-600 border-slate-200";
              const badgeIcon = isHigh
                ? "priority_high"
                : isMed
                  ? "schedule"
                  : "remove";

              return (
                <div
                  key={index}
                  className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 flex flex-col justify-between space-y-6 animate-fadeIn"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-indigo-600">
                          water_drop
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">
                          {test.test_name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          {test.category}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold text-[10px] uppercase border tracking-wide shadow-3xs ${badgeStyle}`}
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {badgeIcon}
                      </span>
                      {test.priority || "Routine Checking"}
                    </span>
                  </div>

                  {/* Detail Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                        Guideline Logic Trigger
                      </p>
                      <p className="text-slate-800 text-[11px] font-semibold italic">
                        "
                        {test.reason_from_rules ||
                          "Indicated monitoring screening checkpoint."}
                        "
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                        Biometric Context Target
                      </p>
                      <p className="text-slate-800 text-[11px] font-bold">
                        Matches user physiological baseline data vectors
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 sm:col-span-2">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                        Clinical Translation Explanation
                      </p>
                      <p className="text-slate-600 text-[11px] font-medium leading-relaxed">
                        {test.personalized_explanation}
                      </p>
                    </div>
                  </div>

                  {/* Operational Action Buttons Wrapper */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-6 py-3 shadow-md shadow-indigo-600/10 hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">
                        calendar_month
                      </span>
                      Book Appointment Session
                    </button>
                    <button className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl px-6 py-3 transition-all flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">
                        upload_file
                      </span>
                      Prepare Report Upload
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-white border border-dashed rounded-[24px] border-slate-300 max-w-sm mx-auto space-y-2">
              <span className="text-2xl block opacity-40">🗂️</span>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Category Tab View Empty
              </h4>
              <p className="text-xs text-slate-400 font-medium px-6">
                No active guideline rules matched screening parameters within
                the "{activeCategory}" category for the "{activeRecommendation}"
                track tier.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
