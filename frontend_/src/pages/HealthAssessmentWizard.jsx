import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// --- PROGRAMMATIC SCHEMAS & STATIC ARRAYS ---
const ETHNICITIES = [
  "Asian",
  "African / African Descent",
  "Caucasian / White",
  "Hispanic / Latino",
  "Middle Eastern",
  "Pacific Islander",
  "Mixed",
  "Other",
  "Prefer not to say",
];
const COUNTRIES = [
  "Sri Lanka",
  "United States",
  "United Kingdom",
  "India",
  "Australia",
  "Canada",
  "Singapore",
];

const MEDICAL_CONDITIONS = [
  {
    id: "diabetes",
    label: "Diabetes",
    icon: "water_drop",
    hasSecondDegree: true,
  },
  {
    id: "prediabetes",
    label: "Prediabetes",
    icon: "blood_glucose",
    hasSecondDegree: false,
  },
  {
    id: "hypertension",
    label: "High Blood Pressure (Hypertension)",
    icon: "monitor_heart",
    hasSecondDegree: true,
  },
  {
    id: "hyperlipidemia",
    label: "High Cholesterol (Hyperlipidemia)",
    icon: "analytics",
    hasSecondDegree: false,
  },
  {
    id: "heart_disease",
    label: "Heart Disease",
    icon: "favorite",
    hasSecondDegree: true,
  },
  { id: "stroke", label: "Stroke", icon: "brain", hasSecondDegree: true },
  {
    id: "kidney_disease",
    label: "Kidney Disease / Disorder",
    icon: "domain",
    hasSecondDegree: true,
  },
  {
    id: "liver_disease",
    label: "Liver Disease",
    icon: "medical_services",
    hasSecondDegree: true,
  },
  {
    id: "thyroid_disorder",
    label: "Thyroid Disorder",
    icon: "clear_all",
    hasSecondDegree: true,
  },
  { id: "asthma", label: "Asthma", icon: "air", hasSecondDegree: false },
  {
    id: "copd",
    label: "COPD (Chronic Lung Disease)",
    icon: "mode_fan",
    hasSecondDegree: false,
  },
  { id: "cancer", label: "Cancer", icon: "coronavirus", hasSecondDegree: true },
  {
    id: "anemia",
    label: "Anemia / Blood Disorders",
    icon: "colorize",
    hasSecondDegree: false,
  },
  {
    id: "autoimmune",
    label: "Autoimmune Disease",
    icon: "shield_with_heart",
    hasSecondDegree: false,
  },
];

const SYMPTOM_CATEGORIES = [
  {
    id: "general",
    label: "General Symptoms",
    icon: "body_system",
    symptoms: [
      { id: "fatigue", label: "Fatigue or unusual tiredness" },
      { id: "fever", label: "Fever" },
      { id: "chills", label: "Chills" },
      { id: "night_sweats", label: "Night sweats" },
      { id: "weight_loss", label: "Unexplained weight loss" },
      { id: "weight_gain", label: "Unexplained weight gain" },
      { id: "loss_appetite", label: "Loss of appetite" },
      { id: "weakness", label: "General weakness" },
    ],
  },
  {
    id: "endocrine",
    label: "Blood Sugar & Endocrine",
    icon: "science",
    symptoms: [
      { id: "excessive_thirst", label: "Excessive thirst" },
      { id: "frequent_urination", label: "Frequent urination" },
      { id: "increased_hunger", label: "Increased hunger" },
      { id: "blurred_vision", label: "Blurred vision" },
      { id: "slow_healing", label: "Slow wound healing" },
      { id: "tingling_limbs", label: "Tingling or numbness in hands/feet" },
    ],
  },
  {
    id: "cardio",
    label: "Cardiovascular",
    icon: "favorite",
    symptoms: [
      { id: "chest_pain", label: "Chest pain" },
      { id: "chest_tightness", label: "Chest tightness" },
      { id: "palpitations", label: "Palpitations (rapid/irregular heartbeat)" },
      { id: "shortness_of_breath", label: "Shortness of breath" },
      { id: "swollen_feet", label: "Swollen feet or ankles" },
      { id: "dizziness", label: "Dizziness" },
      { id: "fainting", label: "Fainting" },
    ],
  },
  {
    id: "respiratory",
    label: "Respiratory",
    icon: "pulmonology",
    symptoms: [
      { id: "persistent_cough", label: "Persistent cough" },
      { id: "coughing_blood", label: "Coughing up blood" },
      { id: "wheezing", label: "Wheezing" },
      { id: "difficulty_breathing", label: "Difficulty breathing" },
    ],
  },
];

export default function HealthAssessmentWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [activeSymptomTab, setActiveSymptomTab] = useState("general");

  // Load initial session state parameters out of local storage cache
  const [formData, setFormData] = useState(() => {
    const savedSessionCacheData = localStorage.getItem("healthwise_form_data");
    if (savedSessionCacheData) {
      try {
        return JSON.parse(savedSessionCacheData);
      } catch (e) {
        console.error("Malformed state cache tracking structure ignored.", e);
      }
    }
    return {
      age: "",
      sex: "",
      height: "",
      weight: "",
      pregnancy: "",
      ethnicity: "",
      country: "",
      smoking: "",
      alcohol: "",
      physicalActivity: "None",
      exerciseDuration: 3,
      sleepHours: "",
      sleepQuality: "",
      dietPatterns: [],
      waterIntake: "",
      stressLevel: "",
      personalHistory: {},
      firstDegreeHistory: {},
      secondDegreeHistory: {},
      earlyOnsetHeart: "",
      inheritedBlood: "",
      multipleSharedDisease: "",
      medications: [],
      majorSurgery: false,
      hospitalization: false,
      allergies: [],
      pastLabsRoutine: "",
      pastLabsAbnormal: [],
      selectedSymptoms: [],
      deepDive: {},
    };
  });

  // Keep state cache automatically mirrored inside the storage instance
  useEffect(() => {
    localStorage.setItem("healthwise_form_data", JSON.stringify(formData));
  }, [formData]);

  const handleInputChange = (stage, field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedToggle = (category, conditionId) => {
    setFormData((prev) => {
      const currentCategory = prev[category] || {};
      return {
        ...prev,
        [category]: {
          ...currentCategory,
          [conditionId]: !currentCategory[conditionId],
        },
      };
    });
  };

  // High Risk dynamic analysis completely removed from symptoms interceptor layer
  const handleSymptomToggle = (symptomId) => {
    setFormData((prev) => {
      const exists = prev.selectedSymptoms.includes(symptomId);
      const updated = exists
        ? prev.selectedSymptoms.filter((id) => id !== symptomId)
        : [...prev.selectedSymptoms, symptomId];

      return { ...prev, selectedSymptoms: updated };
    });
  };

  const handleDeepDiveChange = (symptomId, subField, value) => {
    setFormData((prev) => ({
      ...prev,
      deepDive: {
        ...prev.deepDive,
        [symptomId]: { ...(prev.deepDive[symptomId] || {}), [subField]: value },
      },
    }));
  };

  // Memoize the current category index position
  const currentCategoryIdx = useMemo(() => {
    return SYMPTOM_CATEGORIES.findIndex((cat) => cat.id === activeSymptomTab);
  }, [activeSymptomTab]);

  const handleNext = () => {
    if (currentStep === 1) {
      const isDemoModeActive = localStorage.getItem("isDemoMode") === "true";
      const isAuthenticatedUser = localStorage.getItem("isLoggedIn") === "true";

      if (isDemoModeActive && !isAuthenticatedUser) {
        alert(
          "🔒 Demo Walkthrough Limit Reached: Please log in or create an authenticated account to proceed past Stage 1 biometrics.",
        );
        navigate("/signin");
        return;
      }
    }

    if (currentStep === 3 && formData.selectedSymptoms.length === 0) {
      setCurrentStep(5);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 5 && formData.selectedSymptoms.length === 0) {
      setCurrentStep(3);
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const bmi = useMemo(() => {
    if (formData.height && formData.weight && formData.height > 0) {
      const hMeters = Number(formData.height) / 100;
      return Number(formData.weight) / (hMeters * hMeters);
    }
    return null;
  }, [formData.height, formData.weight]);

  const bmiCategory = useMemo(() => {
    if (bmi === null) return null;
    if (bmi < 18.5)
      return {
        label: "Underweight",
        color: "bg-teal-50 text-teal-750 border-teal-200",
      };
    if (bmi < 25)
      return {
        label: "Healthy Weight",
        color: "bg-emerald-50 text-emerald-750 border-emerald-200",
      };
    if (bmi < 30)
      return {
        label: "Overweight Baseline",
        color: "bg-amber-50 text-amber-750 border-amber-200",
      };
    return {
      label: "Obesity Metrics Risk",
      color: "bg-rose-50 text-rose-750 border-rose-200",
    };
  }, [bmi]);

  const activeConditionsCount = useMemo(() => {
    return Object.values(formData.personalHistory).filter(Boolean).length;
  }, [formData.personalHistory]);

  const activeFamilyCount = useMemo(() => {
    const primaryCount = Object.values(formData.firstDegreeHistory).filter(
      Boolean,
    ).length;
    const secondaryCount = Object.values(formData.secondDegreeHistory).filter(
      Boolean,
    ).length;
    return primaryCount + secondaryCount;
  }, [formData.firstDegreeHistory, formData.secondDegreeHistory]);

  const stepCompletionPercent = useMemo(() => {
    return `${currentStep * 20}%`;
  }, [currentStep]);

  const handleFormSubmissionSubmit = (e) => {
    e.preventDefault();

    const finalBackendDataPayloadAssembly = {
      stage1: {
        age: formData.age,
        sex: formData.sex,
        height: formData.height,
        weight: formData.weight,
        pregnancy: formData.pregnancy,
        ethnicity: formData.ethnicity,
        country: formData.country,
        smoking: formData.smoking,
        alcohol: formData.alcohol,
        physicalActivity: formData.physicalActivity,
        exerciseDuration: formData.exerciseDuration,
        sleepHours: formData.sleepHours,
        sleepQuality: formData.sleepQuality,
        dietPatterns: formData.dietPatterns,
        waterIntake: formData.waterIntake,
        stressLevel: formData.stressLevel,
      },
      stage2: {
        personalHistory: formData.personalHistory,
        firstDegreeHistory: formData.firstDegreeHistory,
        secondDegreeHistory: formData.secondDegreeHistory,
        earlyOnsetHeart: formData.earlyOnsetHeart,
        inheritedBlood: formData.inheritedBlood,
        multipleSharedDisease: formData.multipleSharedDisease,
        medications: formData.medications,
        majorSurgery: formData.majorSurgery,
        hospitalization: formData.hospitalization,
        allergies: formData.allergies,
        pastLabsRoutine: formData.pastLabsRoutine,
        pastLabsAbnormal: formData.pastLabsAbnormal,
      },
      stage3: { selectedSymptoms: formData.selectedSymptoms },
      stage4: { deepDive: formData.deepDive },
    };

    navigate("/analysis", {
      state: { payload: finalBackendDataPayloadAssembly },
    });
  };

  return (
    <div
      className="text-slate-900 min-h-screen flex flex-col antialiased"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Clinical Intake Portal
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Provide metrics tracking inputs to formulate an evidence-based
              recommendation map.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-500"
            style={{ width: stepCompletionPercent }}
          />
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleFormSubmissionSubmit}
            className="lg:col-span-8 flex flex-col gap-8"
          >
            {/* STAGE 1 UI */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <span className="font-bold text-lg">👤</span>
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Stage 1: Biometric Baseline Profiles
                      </h2>
                      <p className="text-xs text-slate-400 font-medium">
                        Core body tracking indicators mapping measurements
                        parameters
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Age Evaluation Indicator (Years)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={formData.age}
                        onChange={(e) =>
                          handleInputChange(1, "age", e.target.value)
                        }
                        required
                        min="0"
                        max="120"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Assigned Biological Sex at Birth
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={formData.sex}
                        onChange={(e) =>
                          handleInputChange(1, "sex", e.target.value)
                        }
                        required
                      >
                        <option value="">Select option</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="prefer_not">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Height Parameter Metrics (cm)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={formData.height}
                        onChange={(e) =>
                          handleInputChange(1, "height", e.target.value)
                        }
                        required
                        min="50"
                        max="250"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Weight Parameter Metrics (kg)
                      </label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={formData.weight}
                        onChange={(e) =>
                          handleInputChange(1, "weight", e.target.value)
                        }
                        required
                        min="2"
                        max="300"
                      />
                    </div>
                  </div>

                  {formData.sex === "female" && (
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-200/60 animate-slideDown">
                      <label className="text-xs font-bold text-slate-700 block">
                        Are you currently pregnant?
                      </label>
                      <div className="flex gap-2">
                        {["Yes", "No", "Unsure", "Prefer not"].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleInputChange(1, "pregnancy", v)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.pregnancy === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Ethnicity Background Vector
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={formData.ethnicity}
                        onChange={(e) =>
                          handleInputChange(1, "ethnicity", e.target.value)
                        }
                      >
                        <option value="">Select option</option>
                        {ETHNICITIES.map((eth) => (
                          <option key={eth} value={eth}>
                            {eth}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Geographic Operations Country
                      </label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={formData.country}
                        onChange={(e) =>
                          handleInputChange(1, "country", e.target.value)
                        }
                      >
                        <option value="">Select option</option>
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <span className="font-bold text-lg">⚖️</span>
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Daily Lifestyle Habit Modulators
                      </h2>
                      <p className="text-xs text-slate-400 font-medium">
                        Environmental parameters impacting diagnostic baselines
                        tracking profiles
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Tobacco & Smoking History
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Never",
                          "Former Smoker",
                          "Occasionally",
                          "Daily",
                        ].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleInputChange(1, "smoking", v)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.smoking === v ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Alcohol Intake Frequencies
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Never",
                          "Occasionally",
                          "1-2 / week",
                          "3-5 / week",
                          "Daily",
                        ].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleInputChange(1, "alcohol", v)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.alcohol === v ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Weekly Exercise Activity Metrics
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["None", "1-2 days", "3-4 days", "5+ days"].map(
                          (v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() =>
                                handleInputChange(1, "physicalActivity", v)
                              }
                              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.physicalActivity === v ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"}`}
                            >
                              {v}
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Sleep Pattern Quantities
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "< 5 hours",
                          "5-6 hours",
                          "7-8 hours",
                          "> 8 hours",
                        ].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() =>
                              handleInputChange(1, "sleepHours", v)
                            }
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.sleepHours === v ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 2 UI */}
            {currentStep === 2 && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="font-bold text-lg">🧬</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Stage 2: Pedigree Risk Matrix
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      Map structural lineage markers and clinical preconditions
                      indices
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-inner">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-4">Clinical Metric</th>
                        <th className="px-5 py-4 text-center">
                          Diagnosed in Me
                        </th>
                        <th className="px-5 py-4 text-center">
                          1st-Degree Relative
                        </th>
                        <th className="px-5 py-4 text-center">
                          2nd-Degree Relative
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {MEDICAL_CONDITIONS.map((cond) => (
                        <tr
                          key={cond.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            {cond.label}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={
                                formData.personalHistory[cond.id] || false
                              }
                              onChange={() =>
                                handleNestedToggle("personalHistory", cond.id)
                              }
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={
                                formData.firstDegreeHistory[cond.id] || false
                              }
                              onChange={() =>
                                handleNestedToggle(
                                  "firstDegreeHistory",
                                  cond.id,
                                )
                              }
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {cond.hasSecondDegree ? (
                              <input
                                type="checkbox"
                                checked={
                                  formData.secondDegreeHistory[cond.id] || false
                                }
                                onChange={() =>
                                  handleNestedToggle(
                                    "secondDegreeHistory",
                                    cond.id,
                                  )
                                }
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-0 cursor-pointer"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-300 select-none font-bold">
                                N/A
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STAGE 3 UI - WITH UPCOMING SUBSECTION GLOW TRANSITION OVERLAYS */}
            {currentStep === 3 && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="font-bold text-lg">🩺</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Stage 3: Review of Systems Screening
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      Isolate localized anomalies across functional operational
                      zones
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 bg-slate-50/60 border border-slate-200 rounded-2xl p-2 min-h-[380px]">
                  {/* Left Interactive Sidebar Tabs Matrix */}
                  <div className="w-full md:w-1/3 flex flex-col gap-2 p-2 bg-white border border-slate-200/60 rounded-xl">
                    {SYMPTOM_CATEGORIES.map((cat, idx) => {
                      const isActive = activeSymptomTab === cat.id;
                      const isImmediateNext = idx === currentCategoryIdx + 1;

                      let tabClassNames =
                        "w-full px-4 py-3 text-left text-xs font-bold rounded-xl transition-all duration-300 outline-none ";

                      if (isActive) {
                        tabClassNames +=
                          "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-[1.02] border border-indigo-600";
                      } else if (isImmediateNext) {
                        tabClassNames +=
                          "bg-indigo-50/40 text-indigo-900 border border-indigo-300 shadow-[0_0_14px_rgba(99,102,241,0.35)] animate-pulse hover:bg-indigo-50 hover:scale-[1.01]";
                      } else {
                        tabClassNames +=
                          "text-slate-600 hover:bg-slate-50 border border-transparent";
                      }

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveSymptomTab(cat.id)}
                          className={tabClassNames}
                        >
                          <div className="flex items-center justify-between">
                            <span>{cat.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Side Symptoms Checklist Options Grid */}
                  <div className="w-full md:w-2/3 p-4 bg-white border border-slate-200/60 rounded-xl overflow-y-auto">
                    {SYMPTOM_CATEGORIES.map((cat) => {
                      if (cat.id !== activeSymptomTab) return null;
                      return (
                        <div
                          key={cat.id}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn"
                        >
                          {cat.symptoms.map((sym) => {
                            const isChecked =
                              formData.selectedSymptoms.includes(sym.id);
                            return (
                              <label
                                key={sym.id}
                                className={`flex items-start p-3 border rounded-xl cursor-pointer transition-all select-none ${isChecked ? "bg-indigo-50/40 border-indigo-400/60" : "bg-white border-slate-200 hover:bg-slate-50/50"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleSymptomToggle(sym.id)}
                                  className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-0"
                                />
                                <span className="ml-3 text-xs font-bold text-slate-700 leading-tight">
                                  {sym.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 4 UI */}
            {currentStep === 4 && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-sm space-y-6">
                <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Contextual Stratification Layer
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Refine anomaly tracking vectors inside specific condition
                      matrices
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {formData.selectedSymptoms.includes("fatigue") && (
                    <div className="p-5 border border-slate-200 bg-slate-50 rounded-2xl space-y-4 animate-slideDown">
                      <h4 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wide">
                        Fatigue Analytics Metrics
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2">
                          <label className="block font-bold text-slate-600">
                            Duration Tracking Indicator
                          </label>
                          <select
                            onChange={(e) =>
                              handleDeepDiveChange(
                                "fatigue",
                                "duration",
                                e.target.value,
                              )
                            }
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                          >
                            <option value="">Select option</option>
                            <option value="less_1w">Less than 1 week</option>
                            <option value="1_4w">1–4 weeks</option>
                            <option value="more_1m">More than 1 month</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block font-bold text-slate-600">
                            Severity Scaling Benchmark
                          </label>
                          <select
                            onChange={(e) =>
                              handleDeepDiveChange(
                                "fatigue",
                                "severity",
                                e.target.value,
                              )
                            }
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                          >
                            <option value="">Select option</option>
                            <option value="mild">Mild</option>
                            <option value="mod">Moderate</option>
                            <option value="sev">Severe</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.selectedSymptoms.includes("chest_pain") && (
                    <div className="p-5 border border-rose-200 bg-rose-50/20 rounded-2xl space-y-4 animate-slideDown">
                      <h4 className="text-xs font-extrabold text-rose-600 uppercase tracking-wide">
                        Cardiopulmonary Stress Stratification
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2">
                          <label className="block font-bold text-slate-600">
                            Exertion Correlation Parameter
                          </label>
                          <select
                            onChange={(e) =>
                              handleDeepDiveChange(
                                "chest_pain",
                                "during_exertion",
                                e.target.value,
                              )
                            }
                            className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                          >
                            <option value="">Select option</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="sometimes">Sometimes</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block font-bold text-slate-600">
                            Radiation Tracking Axis (Arm/Jaw)
                          </label>
                          <select
                            onChange={(e) =>
                              handleDeepDiveChange(
                                "chest_pain",
                                "radiation",
                                e.target.value,
                              )
                            }
                            className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                          >
                            <option value="">Select option</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {!formData.selectedSymptoms.includes("fatigue") &&
                    !formData.selectedSymptoms.includes("chest_pain") && (
                      <div className="text-center py-12 bg-white border border-dashed rounded-2xl border-slate-300">
                        <p className="text-xs text-slate-400 font-medium italic">
                          No deep-dive metric overlays required for your
                          specific symptom choices. Please advance.
                        </p>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* STAGE 5 UI */}
            {currentStep === 5 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm text-center max-w-xl mx-auto space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-xl mx-auto">
                  ✓
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Intake Blueprint Assembled
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Your dataset matrices are fully parsed into schema validation
                  templates. Proceeding forward compiles your object parameters
                  and releases processing vectors downstream to the clinical
                  rules execution engine.
                </p>
              </div>
            )}

            {/* Bottom Form Navigation Controls */}
            <div className="flex justify-between items-center pt-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-5 py-2.5 border border-slate-200 hover:border-slate-300 bg-white rounded-xl text-xs font-bold text-slate-600 shadow-sm transition-all"
                >
                  Back Step
                </button>
              )}
              <div className="ml-auto">
                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/10 transition-all hover:scale-[1.01]"
                  >
                    Continue Form
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md tracking-wider uppercase transition-all hover:scale-[1.01]"
                  >
                    Compile & Send Payload
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* RIGHT CONTAINER LAYER: LIVE SIDEBAR STATS */}
          <aside className="lg:col-span-4 sticky top-28 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Live BMI Workspace
                </h3>
              </div>

              {bmi !== null ? (
                <div className="space-y-4">
                  <div className="text-center bg-slate-50 rounded-2xl py-4 border border-slate-100">
                    <p className="text-4xl font-black text-indigo-600 tracking-tight">
                      {bmi.toFixed(1)}
                    </p>
                    <span
                      className={`inline-block mt-2 px-3 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wide ${bmiCategory?.color}`}
                    >
                      {bmiCategory?.label}
                    </span>
                  </div>

                  <div className="w-full space-y-1.5">
                    <div className="flex w-full h-2 rounded-full overflow-hidden bg-slate-100">
                      <div className="w-[18.5%] bg-teal-400" />
                      <div className="w-[6.5%] bg-emerald-500" />
                      <div className="w-[5%] bg-amber-400" />
                      <div className="w-[70%] bg-rose-500" />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                      <span>&lt;18.5</span>
                      <span>25.0</span>
                      <span>30.0+</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 space-y-2">
                  <span className="text-2xl opacity-40">⚙️</span>
                  <p className="text-xs font-medium">
                    Input biometric height and weight fields to generate BMI
                    metric tracing charts.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                Workspace Configuration
              </h3>
              <div className="space-y-3 text-xs font-semibold text-slate-600">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Preconditions Checked</span>
                  <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {activeConditionsCount} Logged
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">
                    Hereditary Pedigree Flags
                  </span>
                  <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {activeFamilyCount} Vectors
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">
                    Active Review of Symptoms
                  </span>
                  <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {formData.selectedSymptoms.length} Anomalies
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
