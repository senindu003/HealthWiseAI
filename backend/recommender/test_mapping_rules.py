# test_mapping_rules.py
from typing import List, Dict, Any

def evaluate_deterministic_rules(payload: dict) -> List[Dict[str, str]]:
    """
    Evaluates demographic, clinical history, and symptom datasets 
    to map users strictly to standard preventative or acute lab diagnostic tests.
    """
    recommended_tests = {}

    # --- Safe Data Extraction Latches ---
    biometrics = payload.get("stage1", {})
    habits = payload.get("stage1", {})  # Flattened in state blueprint
    
    stage2 = payload.get("stage2", {})
    personal_history = stage2.get("personalHistory", {})
    first_degree = stage2.get("firstDegreeHistory", {})
    second_degree = stage2.get("secondDegreeHistory", {})
    
    symptoms = payload.get("stage3", {}).get("selectedSymptoms", [])
    deep_dive = payload.get("stage4", {}).get("deepDive", {})

    # Helper to avoid duplicates and handle format metadata
    def add_test(name: str, category: str, report_type: str, reason: str):
        if name not in recommended_tests:
            recommended_tests[name] = {
                "test_name": name,
                "category": category,
                "report_type": report_type,  # "textual" or "visual"
                "reason": reason
            }

    # =========================================================================
    # 1. METABOLIC & ENDOCRINE MAPPING (Diabetes & Prediabetes)
    # =========================================================================
    age = int(biometrics.get("age", 0)) if biometrics.get("age") else 0
    
    has_diabetes_risk = (
        age >= 45 or 
        personal_history.get("prediabetes") or 
        personal_history.get("diabetes") or 
        first_degree.get("diabetes") or
        any(s in symptoms for s in ["excessive_thirst", "frequent_urination", "increased_hunger", "slow_healing", "tingling_limbs"])
    )
    if has_diabetes_risk:
        add_test(
            name="HbA1c (Glycated Hemoglobin) & Fasting Blood Sugar",
            category="Metabolic Profile",
            report_type="textual",
            reason="Recommended to screen for glycemic control variations based on age, lineage indicators, or classic glycemic symptoms."
        )

    # =========================================================================
    # 2. CARDIOVASCULAR MAPPING (Heart, Lipids & Hypertension)
    # =========================================================================
    has_cardio_risk = (
        age >= 35 or
        personal_history.get("hypertension") or 
        personal_history.get("hyperlipidemia") or
        personal_history.get("heart_disease") or 
        personal_history.get("stroke") or
        first_degree.get("heart_disease") or 
        stage2.get("earlyOnsetHeart") == "Yes"
    )
    if has_cardio_risk:
        add_test(
            name="Lipid Profile (Total Cholesterol, HDL, LDL, Triglycerides)",
            category="Cardiovascular",
            report_type="textual",
            reason="Indicated for establishing structural lipid baselines due to personal medical history tracking or hereditary indicators."
        )

    # High-Risk Symptomatic Cardio Triggers (ECG Pathway)
    if any(s in symptoms for s in ["chest_pain", "chest_tightness", "palpitations", "dizziness", "fainting"]):
        add_test(
            name="12-Lead Electrocardiogram (ECG)",
            category="Cardiovascular Dynamics",
            report_type="visual",  # Direct to doctor on upload
            reason="Acute or structural symptomatic signals require an electrical trace mapping validation check."
        )

    # =========================================================================
    # 3. HEMATOLOGY & NUTRITIONAL PROFILE (Anemia, Weakness, Diet)
    # =========================================================================
    has_hematology_risk = (
        personal_history.get("anemia") or
        any(s in symptoms for s in ["fatigue", "weakness", "pale_skin", "easy_bruising", "bleeding_gums", "brittle_nails"]) or
        "Heavy menstrual bleeding" in symptoms  # Stage 3 Section L option
    )
    if has_hematology_risk:
        add_test(
            name="Complete Blood Count (CBC) with Differential",
            category="Hematology",
            report_type="textual",
            reason="Indicated to evaluate complete cellular metrics, oxygen delivery markers, and red blood cell characteristics."
        )
        add_test(
            name="Serum Ferritin & Total Iron Binding Capacity (TIBC)",
            category="Nutritional Deficiencies",
            report_type="textual",
            reason="Evaluates underlying iron reservoirs to clarify root causes of unexplained fatigue profiles."
        )

    # Dietary / Lifestyle Deficiencies
    if any(diet in habits.get("dietPatterns", []) for diet in ["Vegetarian", "Vegan"]) or "fatigue" in symptoms:
        add_test(
            name="Vitamin B12 & Folate Level Validation",
            category="Nutritional Deficiencies",
            report_type="textual",
            reason="Plant-centric dietary habits require monitoring to prevent neurological or macrocytic physiological metrics variations."
        )
        
    if habits.get("sleepQuality") in ["Rarely", "Never"] or age >= 50:
        add_test(
            name="Vitamin D3 (25-Hydroxyvitamin D)",
            category="Bone & Immune Health",
            report_type="textual",
            reason="Baseline assessment for immune homeostasis and optimal bone mineral tracking metrics."
        )

    # =========================================================================
    # 4. HEPATIC & RENAL FUNCTION MAPPING (Liver & Kidneys)
    # =========================================================================
    has_liver_risk = (
        personal_history.get("liver_disease") or
        first_degree.get("liver_disease") or
        habits.get("alcohol") in ["3-5 / week", "Daily"] or
        any(s in symptoms for s in ["jaundice", "blood_in_stool", "black_stool"])
    )
    if has_liver_risk:
        add_test(
            name="Liver Function Test (LFT) Panel",
            category="Hepatic Health",
            report_type="textual",
            reason="Monitors enzyme synthesis channels, bilirubin handling capabilities, and metabolic cellular markers."
        )

    has_kidney_risk = (
        personal_history.get("kidney_disease") or
        first_degree.get("kidney_disease") or
        personal_history.get("hypertension") or
        any(s in symptoms for s in ["painful_urination", "blood_in_urine", "foamy_urine", "reduced_urine", "swollen_feet"])
    )
    if has_kidney_risk:
        add_test(
            name="Renal Function Test / Kidney Panel (Creatinine, Urea, BUN, eGFR)",
            category="Renal Health",
            report_type="textual",
            reason="Assesses operational filtration capacities, fluid processing clearances, and structural metabolic safety."
        )
        add_test(
            name="Urinalysis (Routine Microscopic & Biochemical Examination)",
            category="Renal Health",
            report_type="textual",
            reason="Screens directly for micro-proteinuria, cellular shedding patterns, or hidden urinary tract activity indicators."
        )

    # =========================================================================
    # 5. THYROID REGULATION MAPPING
    # =========================================================================
    has_thyroid_risk = (
        personal_history.get("thyroid_disorder") or
        first_degree.get("thyroid_disorder") or
        any(s in symptoms for s in ["hair_loss", "dry_skin", "tremors", "neck_swelling", "weight_loss", "weight_gain"])
    )
    if has_thyroid_risk:
        add_test(
            name="Thyroid Panel (TSH, Free T3, Free T4)",
            category="Endocrine System",
            report_type="textual",
            reason="Validates master metabolic regulation speed and endocrine feedback tracking parameters."
        )

    # =========================================================================
    # 6. PULMONARY SCREENING MAPPING (X-Ray Pathway)
    # =========================================================================
    has_pulmonary_risk = (
        personal_history.get("copd") or
        personal_history.get("asthma") or
        habits.get("smoking") == "Daily" or
        any(s in symptoms for s in ["persistent_cough", "coughing_blood", "difficulty_breathing", "night_sweats"])
    )
    if has_pulmonary_risk:
        add_test(
            name="Chest X-Ray (PA View)",
            category="Pulmonary / Imaging",
            report_type="visual",  # Direct to doctor on upload
            reason="Structural visual inspection indicated for evaluating lung fields and cardiorespiratory margins cleanly."
        )

    # =========================================================================
    # 7. INFLAMMATORY & SYSTEMIC DEEP-DIVE
    # =========================================================================
    if personal_history.get("autoimmune") or any(s in symptoms for s in ["joint_pain", "joint_shadow", "fever", "night_sweats"]):
        add_test(
            name="C-Reactive Protein (CRP) & ESR Panel",
            category="Systemic Inflammatory Markers",
            report_type="textual",
            reason="Measures broad inflammatory activity dynamics inside systemic connective tissues or pathways."
        )

    return list(recommended_tests.values())