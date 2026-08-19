import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loadDashboard } from "../lib/api";

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
    icon: "🩸",
    hasSecondDegree: true,
  },
  {
    id: "prediabetes",
    label: "Prediabetes",
    icon: "🍬",
    hasSecondDegree: false,
  },
  {
    id: "hypertension",
    label: "High Blood Pressure (Hypertension)",
    icon: "💓",
    hasSecondDegree: true,
  },
  {
    id: "hyperlipidemia",
    label: "High Cholesterol (Hyperlipidemia)",
    icon: "🧪",
    hasSecondDegree: false,
  },
  {
    id: "heart_disease",
    label: "Heart Disease",
    icon: "❤️",
    hasSecondDegree: true,
  },
  { id: "stroke", label: "Stroke", icon: "🧠", hasSecondDegree: true },
  {
    id: "kidney_disease",
    label: "Kidney Disease / Disorder",
    icon: "🫘",
    hasSecondDegree: true,
  },
  {
    id: "liver_disease",
    label: "Liver Disease",
    icon: "🫀",
    hasSecondDegree: true,
  },
  {
    id: "thyroid_disorder",
    label: "Thyroid Disorder",
    icon: "🦋",
    hasSecondDegree: true,
  },
  { id: "asthma", label: "Asthma", icon: "🫁", hasSecondDegree: false },
  {
    id: "copd",
    label: "COPD (Chronic Lung Disease)",
    icon: "🌬️",
    hasSecondDegree: false,
  },
  { id: "cancer", label: "Cancer", icon: "🎗️", hasSecondDegree: true },
  {
    id: "anemia",
    label: "Anemia / Blood Disorders",
    icon: "🩸",
    hasSecondDegree: false,
  },
  {
    id: "autoimmune",
    label: "Autoimmune Disease",
    icon: "🛡️",
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
      { id: "body_aches", label: "Body aches" },
      { id: "recurrent_infections", label: "Frequent infections" },
      { id: "swollen_lymph_nodes", label: "Swollen lymph nodes" },
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
      { id: "heat_intolerance", label: "Heat intolerance" },
      { id: "cold_intolerance", label: "Cold intolerance" },
      { id: "excessive_sweating", label: "Excessive sweating" },
      { id: "hair_loss", label: "Hair loss" },
      { id: "dry_skin", label: "Dry skin" },
    ],
  },

  {
    id: "cardio",
    label: "Cardiovascular",
    icon: "❤️",
    symptoms: [
      { id: "chest_pain", label: "Chest pain" },
      { id: "chest_tightness", label: "Chest tightness" },
      { id: "palpitations", label: "Palpitations (rapid/irregular heartbeat)" },
      { id: "shortness_of_breath", label: "Shortness of breath" },
      { id: "swollen_feet", label: "Swollen feet or ankles" },
      { id: "dizziness", label: "Dizziness" },
      { id: "fainting", label: "Fainting" },
      { id: "exercise_intolerance", label: "Reduced exercise tolerance" },
      { id: "leg_pain_walking", label: "Leg pain while walking" },
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
      { id: "chronic_phlegm", label: "Excessive phlegm production" },
      { id: "snoring", label: "Loud snoring" },
    ],
  },

  {
    id: "gastro",
    label: "Digestive System",
    icon: "restaurant",
    symptoms: [
      { id: "abdominal_pain", label: "Abdominal pain" },
      { id: "bloating", label: "Bloating" },
      { id: "nausea", label: "Nausea" },
      { id: "vomiting", label: "Vomiting" },
      { id: "diarrhea", label: "Diarrhea" },
      { id: "constipation", label: "Constipation" },
      { id: "blood_stool", label: "Blood in stool" },
      { id: "black_stool", label: "Black stools" },
      { id: "heartburn", label: "Heartburn / Acid reflux" },
      { id: "difficulty_swallowing", label: "Difficulty swallowing" },
    ],
  },

  {
    id: "renal",
    label: "Kidney & Urinary",
    icon: "🩸",
    symptoms: [
      { id: "painful_urination", label: "Painful urination" },
      { id: "blood_urine", label: "Blood in urine" },
      { id: "foamy_urine", label: "Foamy urine" },
      { id: "night_urination", label: "Frequent urination at night" },
      { id: "lower_back_pain", label: "Lower back/flank pain" },
      { id: "urine_retention", label: "Difficulty emptying bladder" },
    ],
  },

  {
    id: "neuro",
    label: "Neurological",
    icon: "psychology",
    symptoms: [
      { id: "headache", label: "Frequent headaches" },
      { id: "migraine", label: "Migraine" },
      { id: "memory_loss", label: "Memory problems" },
      { id: "concentration", label: "Difficulty concentrating" },
      { id: "tremor", label: "Tremors" },
      { id: "balance_problem", label: "Balance problems" },
      { id: "seizures", label: "Seizures" },
      { id: "numbness", label: "Numbness" },
    ],
  },

  {
    id: "musculoskeletal",
    label: "Muscles & Joints",
    icon: "accessibility",
    symptoms: [
      { id: "joint_pain", label: "Joint pain" },
      { id: "joint_swelling", label: "Joint swelling" },
      { id: "muscle_pain", label: "Muscle pain" },
      { id: "muscle_weakness", label: "Muscle weakness" },
      { id: "back_pain", label: "Back pain" },
      { id: "neck_pain", label: "Neck pain" },
    ],
  },

  {
    id: "mental",
    label: "Mental Health & Sleep",
    icon: "self_improvement",
    symptoms: [
      { id: "anxiety", label: "Anxiety" },
      { id: "low_mood", label: "Low mood / depression" },
      { id: "panic_attacks", label: "Panic attacks" },
      { id: "insomnia", label: "Difficulty sleeping" },
      { id: "oversleeping", label: "Excessive sleeping" },
      { id: "daytime_sleepiness", label: "Daytime sleepiness" },
    ],
  },

  {
    id: "women",
    label: "Women's Health",
    icon: "female",
    symptoms: [
      { id: "irregular_periods", label: "Irregular periods" },
      { id: "heavy_periods", label: "Heavy menstrual bleeding" },
      { id: "missed_periods", label: "Missed periods" },
      { id: "pelvic_pain", label: "Pelvic pain" },
      { id: "vaginal_discharge", label: "Abnormal vaginal discharge" },
    ],
  },

  {
    id: "skin",
    label: "Skin & Allergy",
    icon: "dermatology",
    symptoms: [
      { id: "rash", label: "Skin rash" },
      { id: "itching", label: "Persistent itching" },
      { id: "hives", label: "Hives" },
      { id: "easy_bruising", label: "Easy bruising" },
      { id: "skin_discoloration", label: "Skin discoloration" },
    ],
  },
];

// This is the API-shaped version of the live wizard state. Keeping it separate
// from the UI draft means other pages can safely use the current answers before
// the user completes the final assessment submission.
const toQuestionnairePayload = (formData) => ({
  stage1: {
    age: parseInt(formData.age, 10) || 0,
    sex: formData.sex || "",
    height: parseFloat(formData.height) || 0.0,
    weight: parseFloat(formData.weight) || 0.0,
    pregnancy: formData.pregnancy,
    ethnicity: formData.ethnicity,
    country: formData.country,
    smoking: formData.smoking,
    alcohol: formData.alcohol,
    physicalActivity: formData.physicalActivity,
    exerciseDuration: parseInt(formData.exerciseDuration, 10) || 0,
    sleepHours: parseInt(formData.sleepHours, 10) || 7,
    sleepQuality: formData.sleepQuality,
    dietPatterns: Array.isArray(formData.dietPatterns)
      ? formData.dietPatterns.join(", ")
      : formData.dietPatterns,
    waterIntake: formData.waterIntake,
    stressLevel: formData.stressLevel,
  },
  stage2: {
    personalHistory: formData.personalHistory || {},
    firstDegreeHistory: formData.firstDegreeHistory || {},
    secondDegreeHistory: formData.secondDegreeHistory || {},
    earlyOnsetHeart: formData.earlyOnsetHeart,
    inheritedBlood: formData.inheritedBlood,
    multipleSharedDisease: formData.multipleSharedDisease,
    medications: formData.medications || [],
    majorSurgery: Boolean(formData.majorSurgery),
    hospitalization: Boolean(formData.hospitalization),
    allergies: formData.allergies || [],
    pastLabsRoutine: formData.pastLabsRoutine,
    pastLabsAbnormal: formData.pastLabsAbnormal || [],
  },
  stage3: {
    selectedSymptoms: formData.selectedSymptoms || [],
  },
});

export default function HealthAssessmentWizard() {
  const navigate = useNavigate();
  const hasDraftOnEntry = useRef(
    Boolean(sessionStorage.getItem("healthwise_form_data")),
  );
  const hasFetchedSavedBaseline = useRef(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeSymptomTab, setActiveSymptomTab] = useState("general");
  const [symptomSearch, setSymptomSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});

  // Multi-tier Fallback State Initialization Engine (Active Session -> Historical Record -> Default Empty)
  const [formData, setFormData] = useState(() => {
    // 1. Check if the user is actively filling out the questionnaire right now
    const activeSessionForm = sessionStorage.getItem("healthwise_form_data");
    if (activeSessionForm) {
      try {
        return JSON.parse(activeSessionForm);
      } catch (e) {
        alert("Malformed context state memory stack parsed out." + e.message);
      }
    }

    // 2. Look for historical parameters loaded from Java / MongoDB upon user authorization
    const historicalProfileJson = sessionStorage.getItem(
      "user_historical_health_record",
    );
    if (historicalProfileJson) {
      try {
        const historicalData = JSON.parse(historicalProfileJson);
        return {
          // Stage 1 Auto-completion Map
          age: historicalData.stage1?.age || "",
          sex: historicalData.stage1?.sex || "Select option",
          height: historicalData.stage1?.height || "",
          weight: historicalData.stage1?.weight || "",
          pregnancy: historicalData.stage1?.pregnancy || "No",
          ethnicity: historicalData.stage1?.ethnicity || "Select option",
          country: historicalData.stage1?.country || "Select option",
          smoking: historicalData.stage1?.smoking || "Never",
          alcohol: historicalData.stage1?.alcohol || "Never",
          physicalActivity: historicalData.stage1?.physicalActivity || "None",
          exerciseDuration: historicalData.stage1?.exerciseDuration || 0,
          sleepHours: historicalData.stage1?.sleepHours || 7,
          sleepQuality: historicalData.stage1?.sleepQuality || "Fair",
          dietPatterns: historicalData.stage1?.dietPatterns || "Balanced",
          waterIntake: historicalData.stage1?.waterIntake || "Normal",
          stressLevel: historicalData.stage1?.stressLevel || "Medium",

          // Stage 2 Auto-completion Map
          personalHistory: historicalData.stage2?.personalHistory || {},
          firstDegreeHistory: historicalData.stage2?.firstDegreeHistory || {},
          secondDegreeHistory: historicalData.stage2?.secondDegreeHistory || {},
          earlyOnsetHeart: historicalData.stage2?.earlyOnsetHeart || "No",
          inheritedBlood: historicalData.stage2?.inheritedBlood || "No",
          multipleSharedDisease:
            historicalData.stage2?.multipleSharedDisease || "No",
          medications: historicalData.stage2?.medications || [],
          majorSurgery: historicalData.stage2?.majorSurgery || false,
          hospitalization: historicalData.stage2?.hospitalization || false,
          allergies: historicalData.stage2?.allergies || [],
          pastLabsRoutine: historicalData.stage2?.pastLabsRoutine || "No",
          pastLabsAbnormal: historicalData.stage2?.pastLabsAbnormal || [],

          // Reset acute parameters to enforce current system reviews checks
          selectedSymptoms: [],
          deepDive: {},
        };
      } catch (e) {
        alert(
          "Failed parsing historical baseline backend database document attributes." +
            e.message,
        );
      }
    }

    // 3. Absolute Fallback: Default Baseline Structure Schema Map
    return {
      age: "",
      sex: "",
      height: "",
      weight: "",
      pregnancy: "No",
      ethnicity: "Prefer not to say",
      country: "Sri Lanka",
      smoking: "Never",
      alcohol: "Never",
      physicalActivity: "None",
      exerciseDuration: 0,
      sleepHours: 7,
      sleepQuality: "Fair",
      dietPatterns: [],
      waterIntake: "Normal",
      stressLevel: "Medium",
      personalHistory: {},
      firstDegreeHistory: {},
      secondDegreeHistory: {},
      earlyOnsetHeart: "No",
      inheritedBlood: "No",
      multipleSharedDisease: "No",
      medications: [],
      majorSurgery: false,
      hospitalization: false,
      allergies: [],
      pastLabsRoutine: "No",
      pastLabsAbnormal: [],
      selectedSymptoms: [],
      deepDive: {},
    };
  });

  // Keep runtime wizard inputs accurately synchronized inside volatile session cache blocks
  useEffect(() => {
    sessionStorage.setItem("healthwise_form_data", JSON.stringify(formData));
    sessionStorage.setItem(
      "healthwise_current_questionnaire",
      JSON.stringify(toQuestionnairePayload(formData)),
    );
  }, [formData]);

  // A new authenticated assessment uses the patient's latest saved Stage 1 baseline.
  // Never overwrite an unfinished assessment draft.
  useEffect(() => {
    if (
      hasDraftOnEntry.current ||
      hasFetchedSavedBaseline.current ||
      !sessionStorage.getItem("accessToken")
    )
      return;
    hasFetchedSavedBaseline.current = true;
    let active = true;
    loadDashboard()
      .then((dashboard) => {
        const saved = dashboard.latestQuestionnaire?.questionnaire;
        if (!active || !saved?.stage1) return;
        sessionStorage.setItem(
          "user_historical_health_record",
          JSON.stringify(saved),
        );
        const stage1 = saved.stage1;
        setFormData((current) => ({
          ...current,
          age: stage1.age ?? current.age,
          sex: stage1.sex ?? current.sex,
          height: stage1.height ?? current.height,
          weight: stage1.weight ?? current.weight,
          pregnancy: stage1.pregnancy ?? current.pregnancy,
          ethnicity: stage1.ethnicity ?? current.ethnicity,
          country: stage1.country ?? current.country,
          smoking: stage1.smoking ?? current.smoking,
          alcohol: stage1.alcohol ?? current.alcohol,
          physicalActivity: stage1.physicalActivity ?? current.physicalActivity,
          exerciseDuration: stage1.exerciseDuration ?? current.exerciseDuration,
          sleepHours: stage1.sleepHours ?? current.sleepHours,
          sleepQuality: stage1.sleepQuality ?? current.sleepQuality,
          dietPatterns: stage1.dietPatterns ?? current.dietPatterns,
          waterIntake: stage1.waterIntake ?? current.waterIntake,
          stressLevel: stage1.stressLevel ?? current.stressLevel,
        }));
      })
      .catch(() => {
        /* Session handling is managed by the authenticated workspace. */
      });
    return () => {
      active = false;
    };
  }, []);

  const isStage1Complete =
    formData.age &&
    formData.sex &&
    formData.height &&
    formData.weight &&
    formData.ethnicity &&
    formData.country;

  const isStage2Complete = true;

  const isStage3Complete = formData.selectedSymptoms.length > 0;

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

  const currentCategoryIdx = useMemo(() => {
    return SYMPTOM_CATEGORIES.findIndex((cat) => cat.id === activeSymptomTab);
  }, [activeSymptomTab]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleNext = () => {
    if (currentStep === 1 && !isStage1Complete) {
      alert("Please complete all required Stage 1 fields.");
      scrollToTop();
      return;
    }

    if (currentStep === 3 && !isStage3Complete) {
      alert("Please select at least one symptom.");
      scrollToTop();
      return;
    }

    scrollToTop();
    if (currentStep === 1) {
      const isDemoModeActive = sessionStorage.getItem("isDemoMode") === "true";
      const isAuthenticatedUser =
        sessionStorage.getItem("isLoggedIn") === "true";

      if (isDemoModeActive && !isAuthenticatedUser) {
        alert(
          "🔒 Demo Walkthrough Limit Reached: Please log in or create an authenticated account to proceed past Stage 1 biometrics.",
        );
        navigate("/signup");
        return;
      }
    }

    if (currentStep === 3) {
      setCurrentStep(4);
      return;
    } else {
      setCurrentStep((prev) => prev + 1);
    }

    {
      currentStep === 4;
    }
  };

  const handleBack = () => {
    scrollToTop();
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const bmi = useMemo(() => {
    const h = parseFloat(formData.height);
    const w = parseFloat(formData.weight);
    if (h > 0 && w > 0) {
      const hMeters = h / 100;
      return w / (hMeters * hMeters);
    }
    return null;
  }, [formData.height, formData.weight]);

  const bmiCategory = useMemo(() => {
    if (bmi === null) return null;
    if (bmi < 18.5)
      return {
        label: "Underweight",
        color: "text-sky-500",
        progressColor: "#0ea5e9",
        bg: "bg-sky-50 border-sky-200",
      };
    if (bmi < 25)
      return {
        label: "Healthy Weight",
        color: "text-emerald-500",
        progressColor: "#10b981",
        bg: "bg-emerald-50 border-emerald-200",
      };
    if (bmi < 30)
      return {
        label: "Overweight Baseline",
        color: "text-amber-500",
        progressColor: "#f59e0b",
        bg: "bg-amber-50 border-amber-200",
      };
    return {
      label: "Obesity Metrics Risk",
      color: "text-rose-500",
      progressColor: "#ef4444",
      bg: "bg-rose-50 border-rose-200",
    };
  }, [bmi]);

  // Aggregated Score Calculation Logic for Stage 1 Lifestyle Habits
  const lifestyleRiskMetrics = useMemo(() => {
    let score = 0;
    const items = [];

    // Smoking (Max 20)
    if (formData.smoking === "Former Smoker") {
      score += 5;
      items.push("Previous Smoking History");
    } else if (formData.smoking === "Occasionally") {
      score += 12;
      items.push("Intermittent Tobacco Use");
    } else if (formData.smoking === "Daily") {
      score += 20;
      items.push("Daily Tobacco Use");
    }

    // Alcohol (Max 15)
    if (formData.alcohol === "Occasionally") {
      score += 3;
    } else if (formData.alcohol === "1-2 / week") {
      score += 7;
      items.push("Regular Alcohol Intake");
    } else if (formData.alcohol === "3-5 / week") {
      score += 12;
      items.push("Frequent Alcohol Intake");
    } else if (formData.alcohol === "Daily") {
      score += 15;
      items.push("Daily Alcohol Intake");
    }

    // Physical Activity (Max 15)
    if (formData.physicalActivity === "1-2 days") {
      score += 10;
      items.push("Low Activity Level");
    } else if (formData.physicalActivity === "None") {
      score += 15;
      items.push("Sedentary Lifestyle");
    }

    // Exercise Duration (Max 10)
    const duration = Number(formData.exerciseDuration);

    if (duration > 0 && duration < 15) {
      score += 10;
      items.push("Very Low Exercise Duration");
    } else if (duration >= 15 && duration < 30) {
      score += 5;
      items.push("Low Exercise Duration");
    }

    // Sleep Hours (Max 10)
    const sleep = Number(formData.sleepHours);

    if (sleep < 5) {
      score += 10;
      items.push("Severe Sleep Deficit");
    } else if (sleep < 6) {
      score += 7;
      items.push("Insufficient Sleep");
    } else if (sleep < 7) {
      score += 3;
    }

    // Sleep Quality (Max 10)
    if (formData.sleepQuality === "Poor") {
      score += 10;
      items.push("Poor Sleep Quality");
    } else if (formData.sleepQuality === "Fair") {
      score += 5;
    }

    // Water Intake (Max 5)
    if (formData.waterIntake === "Low") {
      score += 5;
      items.push("Low Hydration");
    }

    // Stress (Max 10)
    if (formData.stressLevel === "Medium") {
      score += 4;
    } else if (formData.stressLevel === "High") {
      score += 10;
      items.push("High Stress");
    }

    if (formData.dietPatterns === "Fast Food Heavy") {
      score += 5;
      items.push("Unhealthy Diet");
    }

    return {
      score: Math.min(score, 95),
      triggers: items,
      label:
        score >= 60
          ? "High Risk Variance"
          : score >= 25
            ? "Moderate Variance"
            : "Low Risk Profile",
      color:
        score >= 60
          ? "text-rose-600 bg-rose-50 border-rose-200"
          : score >= 25
            ? "text-amber-600 bg-amber-50 border-amber-200"
            : "text-emerald-600 bg-emerald-50 border-emerald-200",
      barColor:
        score >= 60
          ? "bg-rose-500"
          : score >= 25
            ? "bg-amber-500"
            : "bg-emerald-500",
    };
  }, [
    formData.smoking,
    formData.alcohol,
    formData.physicalActivity,
    formData.sleepHours,
    formData.sleepQuality,
    formData.waterIntake,
    formData.stressLevel,
    formData.exerciseDuration,
    formData.dietPatterns,
  ]);

  const activeConditionsCount = useMemo(
    () => Object.values(formData.personalHistory).filter(Boolean).length,
    [formData.personalHistory],
  );

  const activeFamilyCount = useMemo(() => {
    const prim = Object.values(formData.firstDegreeHistory).filter(
      Boolean,
    ).length;
    const sec = Object.values(formData.secondDegreeHistory).filter(
      Boolean,
    ).length;
    return prim + sec;
  }, [formData.firstDegreeHistory, formData.secondDegreeHistory]);

  const stepCompletionPercent = useMemo(
    () => `${currentStep * 25}%`,
    [currentStep],
  );

  const getCategorySelectedCount = (category) => {
    return category.symptoms.filter((s) =>
      formData.selectedSymptoms.includes(s.id),
    ).length;
  };

  const filteredSymptomResults = SYMPTOM_CATEGORIES.flatMap((c) =>
    c.symptoms.map((s) => ({ ...s, category: c.label })),
  ).filter((s) =>
    symptomSearch.trim()
      ? s.label.toLowerCase().includes(symptomSearch.toLowerCase())
      : false,
  );

  const handleFormSubmissionSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const cleanlyStructuredPayload = toQuestionnairePayload(formData);

    sessionStorage.setItem(
      "healthwise_questionnaire",
      JSON.stringify(cleanlyStructuredPayload),
    );
    sessionStorage.setItem(
      "healthwise_current_questionnaire",
      JSON.stringify(cleanlyStructuredPayload),
    );
    // Keep the UI-shaped draft for the remainder of this authenticated browser
    // session. The Assessment route restores from this key, so deleting it here
    // made Stage 1 appear empty after visiting analysis or report analysis.
    sessionStorage.setItem("healthwise_form_data", JSON.stringify(formData));
    navigate("/analysis", { state: { payload: cleanlyStructuredPayload } });
  };

  return (
    <div
      className="text-slate-900 min-h-screen flex flex-col antialiased"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          {/* TITLE */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                Clinical Intake Portal
              </h1>

              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Provide metrics tracking inputs to formulate an evidence-based
                recommendation map.
              </p>
            </div>

            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-md uppercase tracking-wider">
              {stepCompletionPercent} Complete
            </span>
          </div>

          {/* STAGE NAVIGATOR */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[
              { step: 1, label: "Biometrics" },
              { step: 2, label: "Medical History" },
              { step: 3, label: "Symptoms" },
              { step: 4, label: "Review" },
            ].map((item) => {
              const isLocked =
                (item.step === 2 && !isStage1Complete) ||
                (item.step === 3 && (!isStage1Complete || !isStage2Complete)) ||
                (item.step === 4 &&
                  (!isStage1Complete ||
                    !isStage2Complete ||
                    !isStage3Complete));

              return (
                <div key={item.step} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.step === 1) {
                        scrollToTop();
                        return setCurrentStep(1);
                      }

                      if (item.step === 2 && isStage1Complete) {
                        scrollToTop();
                        return setCurrentStep(2);
                      }

                      if (
                        item.step === 3 &&
                        isStage1Complete &&
                        isStage2Complete
                      ) {
                        scrollToTop();
                        return setCurrentStep(3);
                      }

                      if (
                        item.step === 4 &&
                        isStage1Complete &&
                        isStage2Complete &&
                        isStage3Complete
                      ) {
                        scrollToTop();
                        return setCurrentStep(4);
                      }
                    }}
                    className={`
            flex items-center justify-center
            w-10 h-10 rounded-full
            text-sm font-black
            transition-all duration-300
            ${
              isLocked
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : currentStep === item.step
                  ? "bg-indigo-600 text-white shadow-lg scale-110"
                  : currentStep > item.step
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }
          `}
                  >
                    {isLocked
                      ? "🔒"
                      : currentStep > item.step
                        ? "✓"
                        : item.step}
                  </button>

                  <div className="ml-2 hidden md:block">
                    <div
                      className={`text-xs font-bold ${
                        isLocked
                          ? "text-slate-300"
                          : currentStep === item.step
                            ? "text-indigo-600"
                            : "text-slate-500"
                      }`}
                    >
                      {item.label}
                    </div>
                  </div>

                  {item.step !== 4 && (
                    <div
                      className={`hidden md:block w-12 h-1 ml-4 rounded-full ${
                        currentStep > item.step
                          ? "bg-emerald-500"
                          : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* PROGRESS BAR */}
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: stepCompletionPercent }}
            />
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form className="lg:col-span-8 flex flex-col gap-8">
            {/* STAGE 1 UI */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                      👤
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
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                      ⚖️
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700">
                            Exercise Duration (minutes per session)
                          </label>
                          <input
                            type="number"
                            value={formData.exerciseDuration}
                            onChange={(e) =>
                              handleInputChange(
                                1,
                                "exerciseDuration",
                                e.target.value,
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700">
                            Average Sleep Hours
                          </label>
                          <input
                            type="number"
                            value={formData.sleepHours}
                            onChange={(e) =>
                              handleInputChange(1, "sleepHours", e.target.value)
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700">
                            Sleep Quality
                          </label>
                          <select
                            value={formData.sleepQuality}
                            onChange={(e) =>
                              handleInputChange(
                                1,
                                "sleepQuality",
                                e.target.value,
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          >
                            <option>Excellent</option>
                            <option>Good</option>
                            <option>Fair</option>
                            <option>Poor</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700">
                            Daily Water Intake
                          </label>
                          <select
                            value={formData.waterIntake}
                            onChange={(e) =>
                              handleInputChange(
                                1,
                                "waterIntake",
                                e.target.value,
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          >
                            <option value="Low">Low</option>
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700">
                            Stress Level
                          </label>
                          <select
                            value={formData.stressLevel}
                            onChange={(e) =>
                              handleInputChange(
                                1,
                                "stressLevel",
                                e.target.value,
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700">
                            Diet Pattern
                          </label>
                          <select
                            value={formData.dietPatterns}
                            onChange={(e) =>
                              handleInputChange(
                                1,
                                "dietPatterns",
                                e.target.value,
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          >
                            <option value="">Select</option>
                            <option value="Balanced">Balanced</option>
                            <option value="Vegetarian">Vegetarian</option>
                            <option value="Vegan">Vegan</option>
                            <option value="High Protein">High Protein</option>
                            <option value="Fast Food Heavy">
                              Fast Food Heavy
                            </option>
                          </select>
                        </div>
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
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                    🧬
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
                            {`${cond.icon} ${cond.label}` || cond.label}
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

            {/* STAGE 3 UI */}
            {currentStep === 3 && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                    🩺
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Stage 3: Review of Systems Screening
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      Select every symptom you are currently experiencing.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-slate-700">
                    Search Symptoms
                  </label>
                  <input
                    type="text"
                    value={symptomSearch}
                    onChange={(e) => setSymptomSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();

                        if (filteredSymptomResults.length > 0) {
                          const symptom = filteredSymptomResults[0];

                          if (!formData.selectedSymptoms.includes(symptom.id)) {
                            handleSymptomToggle(symptom.id);
                          }

                          setSymptomSearch("");
                        }
                      }
                    }}
                    placeholder="Type a symptom..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
                  />

                  {symptomSearch.trim() && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {filteredSymptomResults.length > 0 ? (
                        filteredSymptomResults.map((symptom) => (
                          <button
                            key={symptom.id}
                            type="button"
                            onClick={() => {
                              if (
                                !formData.selectedSymptoms.includes(symptom.id)
                              ) {
                                handleSymptomToggle(symptom.id);
                              }
                              setSymptomSearch("");
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                          >
                            <div className="text-sm font-medium text-slate-800">
                              {symptom.label}
                            </div>
                            <div className="text-xs text-slate-400">
                              {symptom.category}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-400">
                          No matching symptoms found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {formData.selectedSymptoms.length > 0 && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                      Selected Symptoms ({formData.selectedSymptoms.length})
                    </h4>

                    <div className="flex flex-wrap gap-2">
                      {formData.selectedSymptoms.map((symptomId) => {
                        const symptom = SYMPTOM_CATEGORIES.flatMap(
                          (c) => c.symptoms,
                        ).find((s) => s.id === symptomId);

                        return (
                          <button
                            key={symptomId}
                            type="button"
                            onClick={() => handleSymptomToggle(symptomId)}
                            className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold"
                          >
                            {symptom?.label} ✕
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {SYMPTOM_CATEGORIES.map((category) => {
                    const selectedCount = getCategorySelectedCount(category);

                    const filteredSymptoms = category.symptoms.filter(
                      (symptom) =>
                        symptom.label
                          .toLowerCase()
                          .includes(symptomSearch.toLowerCase()),
                    );

                    return (
                      <div
                        key={category.id}
                        className="border border-slate-200 rounded-2xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCategories((prev) => ({
                              ...prev,
                              [category.id]: !prev[category.id],
                            }))
                          }
                          className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition"
                        >
                          <div>
                            <span className="font-bold text-slate-900">
                              {category.label}
                            </span>

                            <span className="ml-3 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                              {selectedCount} selected
                            </span>
                          </div>

                          <span
                            className={`transition-transform duration-300 ${
                              expandedCategories[category.id]
                                ? "rotate-180"
                                : "rotate-0"
                            }`}
                          >
                            ▼
                          </span>
                        </button>

                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            expandedCategories[category.id]
                              ? "max-h-[1000px] opacity-100"
                              : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredSymptoms.map((symptom) => {
                              const checked =
                                formData.selectedSymptoms.includes(symptom.id);

                              return (
                                <label
                                  key={symptom.id}
                                  className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                                    checked
                                      ? "bg-indigo-50 border-indigo-300"
                                      : "bg-white border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      handleSymptomToggle(symptom.id)
                                    }
                                    className="mt-1 w-4 h-4"
                                  />

                                  <span className="ml-3 text-sm font-medium text-slate-700">
                                    {symptom.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STAGE 4 UI - CLINICAL REVIEW DASHBOARD */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* HERO HEADER */}
                <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 rounded-3xl p-8 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black">
                        Clinical Review Summary
                      </h2>
                      <p className="text-indigo-100 mt-2">
                        Verify your health profile before generating HealthWise
                        recommendations.
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="text-4xl font-black">
                        {Math.round(
                          activeConditionsCount * 5 +
                            activeFamilyCount * 3 +
                            formData.selectedSymptoms.length * 2,
                        )}
                      </div>
                      <div className="text-xs uppercase tracking-wider text-indigo-200">
                        Risk Index
                      </div>
                    </div>
                  </div>
                </div>

                {/* OVERVIEW CARDS */}
                <div className="grid md:grid-cols-3 gap-5">
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                        👤
                      </div>
                      <h3 className="font-black">Biometric Profile</h3>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Age:</strong>{" "}
                        <span className="text-purple-900 font-semibold">
                          {formData.age}
                        </span>
                      </p>
                      <p>
                        <strong>Sex:</strong>{" "}
                        <span className="text-purple-900 font-semibold">
                          {formData.sex}
                        </span>
                      </p>
                      <p>
                        <strong>Height:</strong>{" "}
                        <span className="text-purple-900 font-semibold">
                          {formData.height}
                        </span>
                      </p>
                      <p>
                        <strong>Weight:</strong>{" "}
                        <span className="text-purple-900 font-semibold">
                          {formData.weight}
                        </span>
                      </p>
                      <p>
                        <strong>Ethnicity:</strong>{" "}
                        <span className="text-purple-900 font-semibold">
                          {formData.ethnicity}
                        </span>
                      </p>
                      <p>
                        <strong>Country:</strong>{" "}
                        <span className="text-purple-900 font-semibold">
                          {formData.country}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                        🧬
                      </div>
                      <h3 className="font-black">Medical History</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-3xl font-black text-rose-600">
                          {activeConditionsCount}
                        </div>
                        <p className="text-xs text-slate-500">
                          Personal Conditions
                        </p>
                      </div>

                      <div>
                        <div className="text-3xl font-black text-amber-600">
                          {activeFamilyCount}
                        </div>
                        <p className="text-xs text-slate-500">
                          Family Risk Markers
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        🩺
                      </div>
                      <h3 className="font-black">Symptoms</h3>
                    </div>

                    <div className="text-center py-4">
                      <div className="text-5xl font-black text-emerald-600">
                        {formData.selectedSymptoms.length}
                      </div>

                      <p className="text-xs uppercase tracking-wider text-slate-500 mt-2">
                        Symptoms Selected
                      </p>
                    </div>
                  </div>
                </div>

                {/* SELECTED SYMPTOMS */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-black mb-4">Selected Symptoms Review</h3>

                  <div className="flex flex-wrap gap-2">
                    {formData.selectedSymptoms.length > 0 ? (
                      formData.selectedSymptoms.map((symptomId) => {
                        const symptom = SYMPTOM_CATEGORIES.flatMap(
                          (c) => c.symptoms,
                        ).find((s) => s.id === symptomId);

                        return (
                          <span
                            key={symptomId}
                            className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-2 rounded-full text-xs font-semibold"
                          >
                            {symptom?.label}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-slate-400 text-sm">
                        No symptoms selected
                      </span>
                    )}
                  </div>
                </div>

                {/* ANALYSIS CTA */}
                <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <h3 className="text-xl font-black">
                        Ready for Clinical Analysis
                      </h3>

                      <p className="text-slate-300 mt-2">
                        Your health profile has been compiled and is ready for
                        intelligent diagnostic recommendations.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleFormSubmissionSubmit({
                          preventDefault: () => {},
                        })
                      }
                      className="bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-2xl font-black text-sm shadow-lg transition-all hover:scale-105"
                    >
                      Diagnose Me →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 5 REMOVED */}

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
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/10 transition-all hover:scale-[1.01]"
                  >
                    Continue Form
                  </button>
                ) : null}
              </div>
            </div>
          </form>

          {/* RIGHT SIDEBAR PANEL */}
          <aside className="lg:col-span-4 sticky top-28 space-y-6">
            {/* 1. HIGH-FIDELITY RADIAL GRAPH BMI WORKSPACE */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Live BMI Workspace
                </h3>
              </div>

              {bmi !== null ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="relative flex items-center justify-center mx-auto w-36 h-36">
                    {/* SVG Circular Radial Progress Gauge */}
                    <svg
                      className="w-full h-full -rotate-90"
                      viewBox="0 0 36 36"
                    >
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke={bmiCategory?.progressColor || "#4f46e5"}
                        strokeWidth="2.5"
                        strokeDasharray={`${Math.min((bmi / 40) * 100, 100)}, 100`}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <p className="text-2xl font-black text-slate-900 tracking-tight">
                        {bmi.toFixed(1)}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        Index
                      </span>
                    </div>
                  </div>

                  <div
                    className={`text-center p-3 rounded-xl border text-xs font-bold ${bmiCategory?.bg}`}
                  >
                    <span
                      className={`block uppercase text-[10px] tracking-wider ${bmiCategory?.color}`}
                    >
                      {bmiCategory?.label}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 space-y-2">
                  <span className="text-2xl opacity-40">⚙️</span>
                  <p className="text-xs font-medium">
                    Input biometric height and weight fields to activate the
                    color tracking metrics bar.
                  </p>
                </div>
              )}
            </div>

            {/* 2. DYNAMIC LIFESTYLE HABITS RISK ESTIMATOR GAUGE */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Habit Variance Estimator
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span className="text-slate-500">Aggregated Score:</span>
                  <span className="text-purple-900 font-semibold">
                    {lifestyleRiskMetrics.score}%
                  </span>
                </div>

                {/* Horizontal Risk Progress Track */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${lifestyleRiskMetrics.barColor}`}
                    style={{ width: `${lifestyleRiskMetrics.score}%` }}
                  />
                </div>

                <div
                  className={`p-3 border rounded-xl text-center text-[10px] font-extrabold uppercase tracking-wider ${lifestyleRiskMetrics.color}`}
                >
                  {lifestyleRiskMetrics.label}
                </div>

                {/* Activated Trigger Parameters Logs */}
                {lifestyleRiskMetrics.triggers.length > 0 ? (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Contributing Variance Alerts:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {lifestyleRiskMetrics.triggers.map((item, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-50 text-slate-600 border border-slate-200/80 px-2 py-0.5 rounded text-[9px] font-semibold"
                        >
                          • {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 font-medium italic text-center pt-2">
                    No adverse behavioral baseline variance alerts logged.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
