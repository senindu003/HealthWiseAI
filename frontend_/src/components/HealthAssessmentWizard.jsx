import React, { useState } from "react";

// --- DATA STRUCTURES & SCHEMAS ---
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
]; // Extensible to full ISO list

const MEDICAL_CONDITIONS = [
  { id: "diabetes", label: "Diabetes", hasSecondDegree: true },
  { id: "prediabetes", label: "Prediabetes", hasSecondDegree: false },
  {
    id: "hypertension",
    label: "High Blood Pressure (Hypertension)",
    hasSecondDegree: true,
  },
  {
    id: "hyperlipidemia",
    label: "High Cholesterol (Hyperlipidemia)",
    hasSecondDegree: false,
  },
  { id: "heart_disease", label: "Heart Disease", hasSecondDegree: true },
  { id: "stroke", label: "Stroke", hasSecondDegree: true },
  {
    id: "kidney_disease",
    label: "Kidney Disease / Disorder",
    hasSecondDegree: true,
  },
  { id: "liver_disease", label: "Liver Disease", hasSecondDegree: true },
  { id: "thyroid_disorder", label: "Thyroid Disorder", hasSecondDegree: true },
  { id: "asthma", label: "Asthma", hasSecondDegree: false },
  { id: "copd", label: "COPD (Chronic Lung Disease)", hasSecondDegree: false },
  { id: "cancer", label: "Cancer", hasSecondDegree: true },
  { id: "anemia", label: "Anemia / Blood Disorders", hasSecondDegree: false },
  { id: "autoimmune", label: "Autoimmune Disease", hasSecondDegree: false },
];

const SYMPTOM_CATEGORIES = [
  {
    id: "general",
    label: "🔘 General Symptoms",
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
    label: "🩸 Blood Sugar & Endocrine",
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
    label: "🫀 Cardiovascular",
    symptoms: [
      { id: "chest_pain", label: "Chest pain", isHighRisk: true },
      { id: "chest_tightness", label: "Chest tightness", isHighRisk: true },
      { id: "palpitations", label: "Palpitations (rapid/irregular heartbeat)" },
      { id: "shortness_of_breath", label: "Shortness of breath" },
      { id: "swollen_feet", label: "Swollen feet or ankles" },
      { id: "dizziness", label: "Dizziness" },
      { id: "fainting", label: "Fainting" },
    ],
  },
  {
    id: "respiratory",
    label: "🫁 Respiratory",
    symptoms: [
      { id: "persistent_cough", label: "Persistent cough" },
      { id: "coughing_blood", label: "Coughing up blood", isHighRisk: true },
      { id: "wheezing", label: "Wheezing" },
      { id: "difficulty_breathing", label: "Difficulty breathing" },
    ],
  },
];

export default function HealthAssessmentWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeSymptomTab, setActiveSymptomTab] = useState("general");
  const [hasHighRiskAlert, setHasHighRiskAlert] = useState(false);

  // Central State Storage (Maintained flat internally for easy input data bindings)
  const [formData, setFormData] = useState({
    // Stage 1 fields
    age: "",
    sex: "",
    height: "",
    weight: "",
    pregnancy: "",
    ethnicity: "",
    country: "",
    smoking: "",
    alcohol: "",
    physicalActivity: "",
    exerciseDuration: "",
    sleepHours: "",
    sleepQuality: "",
    dietPatterns: [],
    waterIntake: "",
    stressLevel: "",
    // Stage 2 fields
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
    // Stage 3 fields
    selectedSymptoms: [],
    // Stage 4 fields
    deepDive: {},
  });

  // Structural Form Handlers
  const handleInputChange = (stage, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  const handleSymptomToggle = (symptom) => {
    setFormData((prev) => {
      const exists = prev.selectedSymptoms.includes(symptom.id);
      let updated = exists
        ? prev.selectedSymptoms.filter((id) => id !== symptom.id)
        : [...prev.selectedSymptoms, symptom.id];

      // Safety Trigger Evaluation
      if (symptom.isHighRisk && !exists) {
        setHasHighRiskAlert(true);
      }
      return { ...prev, selectedSymptoms: updated };
    });
  };

  const handleDeepDiveChange = (symptomId, subField, value) => {
    setFormData((prev) => ({
      ...prev,
      deepDive: {
        ...prev.deepDive,
        [symptomId]: {
          ...(prev.deepDive[symptomId] || {}),
          [subField]: value,
        },
      },
    }));
  };

  const handleNext = () => {
    // If skipping stage 4 due to no symptoms
    if (currentStep === 3 && formData.selectedSymptoms.length === 0) {
      setCurrentStep(5); // Direct Submit/Processing Step
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

  // --- AMENDED SUBMIT HANDLER FOR FASTAPI STACK LAYOUT ---
  const handleSubmit = (e) => {
    e.preventDefault();

    // Map and reassemble individual fields into structured stage keys
    const backendPayload = {
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
      stage3: {
        selectedSymptoms: formData.selectedSymptoms,
      },
      stage4: {
        deepDive: formData.deepDive,
      },
    };

    console.log(
      "Structured payload fully verified for FastAPI endpoints:",
      backendPayload,
    );
    alert(
      "Data packaged into payload object successfully! Check console to view the nested stage-by-stage layout processing format.",
    );

    // Example downstream delivery context:
    // axios.post("http://127.0.0.1:8000/api/v1/recommendations", backendPayload);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header and Step Tracker Progress Bar */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h1 className="text-xl font-bold text-slate-900">
            Clinical Intake & Diagnostic Recommender
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Please provide accurate health indicators to build your custom
            medical test profile.
          </p>

          <div className="mt-6 relative">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full bg-slate-200 h-1 rounded-full"></div>
            </div>
            <div className="relative flex justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                      currentStep >= step
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {step}
                  </div>
                  <span className="text-xs font-medium mt-2 text-slate-500">
                    Stage {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency System Intercept Warning Banner */}
        {hasHighRiskAlert && (
          <div className="m-6 p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-red-800">
                  ⚠️ CRITICAL HEALTH PROTOCOL ALERT
                </h3>
                <p className="text-xs text-red-700 mt-1">
                  You have selected symptoms flagged as clinically acute (e.g.,
                  chest pain patterns or pulmonary bleeding issues). Do not
                  await app metric summaries. If you are experiencing an acute
                  crisis, immediately seek emergency room assistance.
                </p>
              </div>
              <button
                onClick={() => setHasHighRiskAlert(false)}
                className="text-red-800 font-bold text-xs px-2 hover:bg-red-100 rounded"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Form Body Context Wrapper */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* STAGE 1: BASIC PROFILE & HABITS */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Block A: Biometrics Card */}
                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200/60 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Block A: Biometrics Profile
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Age (Years)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={formData.age}
                        onChange={(e) =>
                          handleInputChange(1, "age", e.target.value)
                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Assigned Sex at Birth
                      </label>
                      <select
                        value={formData.sex}
                        onChange={(e) =>
                          handleInputChange(1, "sex", e.target.value)
                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      >
                        <option value="">Select Option</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="prefer_not">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="250"
                        value={formData.height}
                        onChange={(e) =>
                          handleInputChange(1, "height", e.target.value)
                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="300"
                        value={formData.weight}
                        onChange={(e) =>
                          handleInputChange(1, "weight", e.target.value)
                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {formData.sex === "female" && (
                    <div className="animate-slideDown">
                      <label className="block text-xs font-semibold mb-1">
                        Are you currently pregnant?
                      </label>
                      <div className="flex gap-2">
                        {["Yes", "No", "Unsure", "Prefer not"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              handleInputChange(1, "pregnancy", opt)
                            }
                            className={`px-3 py-1.5 text-xs rounded-md border font-medium ${formData.pregnancy === opt ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-slate-50"}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Ethnicity
                      </label>
                      <select
                        value={formData.ethnicity}
                        onChange={(e) =>
                          handleInputChange(1, "ethnicity", e.target.value)
                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Option</option>
                        {ETHNICITIES.map((eth) => (
                          <option key={eth} value={eth}>
                            {eth}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Current Country
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) =>
                          handleInputChange(1, "country", e.target.value)
                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Option</option>
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Block B: Habits Card */}
                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200/60 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Block B: Daily Lifestyle Indicators
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">
                      Tobacco/Smoking Products Use
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Never", "Former Smoker", "Occasionally", "Daily"].map(
                        (v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleInputChange(1, "smoking", v)}
                            className={`px-3 py-1 text-xs rounded-full border ${formData.smoking === v ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600"}`}
                          >
                            {v}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">
                      Alcohol Consumption Metrics
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
                          className={`px-3 py-1 text-xs rounded-full border ${formData.alcohol === v ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600"}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">
                      Weekly Physical Activity Layout
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["None", "1-2 days", "3-4 days", "5+ days"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() =>
                            handleInputChange(1, "physicalActivity", v)
                          }
                          className={`px-3 py-1 text-xs rounded-full border ${formData.physicalActivity === v ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600"}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">
                      Daily Sleep Quantities
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["< 5 hours", "5-6 hours", "7-8 hours", "> 8 hours"].map(
                        (v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() =>
                              handleInputChange(1, "sleepHours", v)
                            }
                            className={`px-3 py-1 text-xs rounded-full border ${formData.sleepHours === v ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600"}`}
                          >
                            {v}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: HEALTH & FAMILY HISTORY MATRIX */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                Systemic Matrix Tracking
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Medical Metric Evaluated</th>
                      <th className="px-4 py-3 text-center">Diagnosed in Me</th>
                      <th className="px-4 py-3 text-center">
                        1st-Degree Relative
                      </th>
                      <th className="px-4 py-3 text-center">
                        2nd-Degree Relative
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                    {MEDICAL_CONDITIONS.map((cond) => (
                      <tr
                        key={cond.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {cond.label}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={formData.personalHistory[cond.id] || false}
                            onChange={() =>
                              handleNestedToggle("personalHistory", cond.id)
                            }
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={
                              formData.firstDegreeHistory[cond.id] || false
                            }
                            onChange={() =>
                              handleNestedToggle("firstDegreeHistory", cond.id)
                            }
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
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
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-slate-300 text-[10px]">
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

          {/* STAGE 3: CURRENT SYMPTOM TAB MATRIX */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                System-by-System Review Screening
              </h3>

              <div className="flex flex-col md:flex-row gap-4 border border-slate-200 rounded-xl overflow-hidden bg-white min-h-87.5">
                {/* Left Side Tab Drawer Container */}
                <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col divide-y divide-slate-200/60">
                  {SYMPTOM_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveSymptomTab(cat.id)}
                      className={`px-4 py-3 text-left text-xs font-semibold transition-all ${activeSymptomTab === cat.id ? "bg-white text-blue-600 border-l-4 border-l-blue-600" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Right Side Symptoms Options Matrix Grid Layout */}
                <div className="w-full md:w-2/3 p-4">
                  {SYMPTOM_CATEGORIES.map((cat) => {
                    if (cat.id !== activeSymptomTab) return null;
                    return (
                      <div
                        key={cat.id}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn"
                      >
                        {cat.symptoms.map((sym) => {
                          const isChecked = formData.selectedSymptoms.includes(
                            sym.id,
                          );
                          return (
                            <label
                              key={sym.id}
                              className={`flex items-start p-3 border rounded-xl cursor-pointer select-none transition-all ${isChecked ? "bg-blue-50/50 border-blue-400" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSymptomToggle(sym)}
                                className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                              />
                              <span className="ml-3 text-xs font-medium text-slate-700">
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

          {/* STAGE 4: DYNAMIC DEEP-DIVE STRATIFICATION */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Contextual Symptom Layer Processing
              </h3>

              <div className="space-y-4 max-h-125 overflow-y-auto pr-2">
                {formData.selectedSymptoms.includes("fatigue") && (
                  <div className="p-5 border border-slate-200 bg-white shadow-sm rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-blue-600 uppercase">
                      Symptom Metrics: Fatigue Tracking
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold mb-1">
                          Duration Tracking
                        </label>
                        <select
                          onChange={(e) =>
                            handleDeepDiveChange(
                              "fatigue",
                              "duration",
                              e.target.value,
                            )
                          }
                          className="w-full border rounded-lg px-2 py-1.5 outline-none bg-slate-50"
                        >
                          <option value="">Select option</option>
                          <option value="less_1w">Less than 1 week</option>
                          <option value="1_4w">1–4 weeks</option>
                          <option value="more_1m">More than 1 month</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">
                          Severity Grading
                        </label>
                        <select
                          onChange={(e) =>
                            handleDeepDiveChange(
                              "fatigue",
                              "severity",
                              e.target.value,
                            )
                          }
                          className="w-full border rounded-lg px-2 py-1.5 outline-none bg-slate-50"
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
                  <div className="p-5 border border-red-200 bg-red-50/30 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-red-600 uppercase">
                      Symptom Metrics: Chest Pain Diagnostics
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold mb-1">
                          Does pain surface during physical activities?
                        </label>
                        <select
                          onChange={(e) =>
                            handleDeepDiveChange(
                              "chest_pain",
                              "during_exertion",
                              e.target.value,
                            )
                          }
                          className="w-full border border-red-200 rounded-lg px-2 py-1.5 outline-none bg-white"
                        >
                          <option value="">Select option</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="sometimes">Sometimes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">
                          Does the pain radiate to arm, jaw, or back?
                        </label>
                        <select
                          onChange={(e) =>
                            handleDeepDiveChange(
                              "chest_pain",
                              "radiation",
                              e.target.value,
                            )
                          }
                          className="w-full border border-red-200 rounded-lg px-2 py-1.5 outline-none bg-white"
                        >
                          <option value="">Select option</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional deep dives parse seamlessly using the pattern structure above */}
                {!formData.selectedSymptoms.includes("fatigue") &&
                  !formData.selectedSymptoms.includes("chest_pain") && (
                    <p className="text-xs text-slate-500 italic">
                      No complex analytics mapping profiles required for your
                      selected symptoms profile. Please continue forward.
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* FINAL STEP 5: PIPELINE PACKAGING REVIEW */}
          {currentStep === 5 && (
            <div className="text-center py-8 space-y-3 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <span className="text-green-600 font-bold text-xl">✓</span>
              </div>
              <h3 className="text-md font-bold text-slate-900">
                Health Intake Evaluation Assembled
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your answers are compiled into a single structured JSON model.
                Pressing transmit sends it downstream to Spring Boot, which
                cleanses your dataset before dispatching parameters to FastAPI.
              </p>
            </div>
          )}

          {/* Action Footer Navigation Elements */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Back Step
              </button>
            )}
            <div className="ml-auto">
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  Continue Form
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Compile & Send Payload
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
