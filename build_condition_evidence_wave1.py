"""Build a conservative Wave 1 condition-evidence payload from the citation registry.

This script deliberately does not infer symptom-to-condition associations from the
legacy prognosis dataset.  A record can be made runtime-eligible only after a
qualified clinical reviewer approves the source-backed fields.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
REGISTRY_PATH = ROOT / "citation-registry.wave1.nice-who.json"
OUTPUT_PATH = ROOT / "condition-evidence.wave1.json"


def slug(value: str) -> str:
    """Return a stable Neo4j-friendly identifier without silently merging terms."""
    import re

    value = value.lower().replace("&", "and")
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", value)).strip("_")


def base_record(condition: dict[str, Any]) -> dict[str, Any]:
    display_name = condition["normalizedCondition"]
    citation_ids = [citation["citationId"] for citation in condition["citations"]]
    return {
        "evidenceId": f"{slug(display_name)}_v1",
        "conditionId": slug(display_name),
        "conditionDisplayName": display_name,
        "recordStatus": "citation_collected",
        "applicability": {
            "ageRange": {"minYears": None, "maxYears": None},
            "sex": {
                "appliesTo": ["not_specified"],
                "notes": "The current extraction pass did not record a sex-specific applicability claim. Clinical review is required."
            },
            "pregnancyStatus": "not_specified",
            "inclusionCriteria": [],
            "exclusionsOrLimitations": [
                "Do not use this record to diagnose a condition.",
                "Do not apply it to pregnancy, children, or other population groups unless a reviewed source explicitly supports that use."
            ]
        },
        "supportedPattern": {
            "symptomIds": [],
            "riskFactorRefs": [],
            "questionnaireFieldRefs": [],
            "rule": "No symptom, risk factor, questionnaire field, or legacy prognosis-dataset relationship is asserted by this record. Add one only after the listed citation explicitly supports it and clinical review approves it."
        },
        "careDisposition": {
            "level": "not_configured",
            "timeframe": "not_configured",
            "message": "No automated care disposition is configured for this draft evidence record."
        },
        "healthRecommendations": [],
        "basicStartingTests": [],
        "citationRefs": [
            {"citationId": citation_id, "supportedClaims": ["condition_scope"]}
            for citation_id in citation_ids
        ],
        "clinicalBoundary": {
            "isDiagnosis": False,
            "doesNotReplaceProfessionalCare": True,
            "doesNotPrescribeMedication": True,
            "doesNotRecommendAdvancedTesting": True,
            "message": "HealthWise AI provides educational health insights and supports informed clinical conversations. It does not diagnose conditions, prescribe treatment, or replace a healthcare professional."
        },
        "review": {
            "clinicalReviewStatus": "pending",
            "reviewedBy": None,
            "reviewedAt": None,
            "notes": [
                "Citation collected from the Wave 1 registry; not approved for runtime use.",
                "Empty action and test lists mean that no implementation-ready claim was extracted in this pass."
            ]
        }
    }


def replace_supported_claims(record: dict[str, Any], citation_id: str, claims: list[str]) -> None:
    for citation_ref in record["citationRefs"]:
        if citation_ref["citationId"] == citation_id:
            citation_ref["supportedClaims"] = claims
            return
    raise ValueError(f"Citation {citation_id} was not registered for {record['conditionDisplayName']}")


def citation_id(condition: dict[str, Any], prefix: str) -> str:
    for item in condition["citations"]:
        if item["citationId"].startswith(prefix):
            return item["citationId"]
    raise ValueError(f"No citation beginning {prefix!r} for {condition['normalizedCondition']}")


def add_verified_extractions(record: dict[str, Any], condition: dict[str, Any]) -> None:
    """Add only claims verified during the September 2026 source review pass."""
    name = condition["normalizedCondition"]

    if name == "Type 2 diabetes risk pattern":
        source = citation_id(condition, "nice_ph38_1_4_1")
        record["applicability"] = {
            "ageRange": {"minYears": 18, "maxYears": None},
            "sex": {
                "appliesTo": ["not_sex_specific"],
                "notes": "No sex-specific restriction was recorded in this extraction."
            },
            "pregnancyStatus": "not_pregnant",
            "inclusionCriteria": [
                "Adults identified as at high risk of type 2 diabetes through a risk-identification pathway or relevant blood-test result."
            ],
            "exclusionsOrLimitations": [
                "Do not use for gestational-diabetes assessment.",
                "A clinician must interpret abnormal or borderline results."
            ]
        }
        record["careDisposition"] = {
            "level": "routine_clinician_review",
            "timeframe": "routine",
            "message": "Discuss diabetes-risk assessment and suitable prevention support with a healthcare professional."
        }
        record["healthRecommendations"] = [{
            "recommendationId": "discuss_diabetes_risk_assessment",
            "recommendationType": "care_navigation",
            "priority": "medium",
            "headline": "Discuss diabetes-risk assessment with a clinician",
            "message": "A high-risk assessment should be followed by appropriate professional evaluation and prevention support.",
            "action": "Arrange a routine healthcare review.",
            "citationRefs": [source]
        }]
        record["basicStartingTests"] = [
            {
                "testId": "fasting_plasma_glucose",
                "displayName": "Fasting Plasma Glucose (FPG)",
                "testType": "laboratory",
                "priority": "medium",
                "why": "NICE identifies fasting plasma glucose as a blood-test measure used when identifying high risk of type 2 diabetes.",
                "requiresClinicianReview": True,
                "citationRefs": [source]
            },
            {
                "testId": "hba1c",
                "displayName": "HbA1c",
                "testType": "laboratory",
                "priority": "medium",
                "why": "NICE identifies HbA1c as a blood-test measure used when identifying high risk of type 2 diabetes.",
                "requiresClinicianReview": True,
                "citationRefs": [source]
            }
        ]
        replace_supported_claims(record, source, ["applicability", "health_recommendation", "basic_starting_test"])

    elif name == "Dengue":
        source = citation_id(condition, "who_dengue_lab_testing_2025")
        record["careDisposition"] = {
            "level": "clinician_or_laboratory_selected_testing",
            "timeframe": "prompt",
            "message": "Dengue testing must be selected by an appropriate clinician or laboratory using timing of illness and local context; the app must not select a test automatically."
        }
        record["basicStartingTests"] = [
            {
                "testId": "dengue_laboratory_confirmation_pathway",
                "displayName": "Dengue laboratory confirmation pathway",
                "testType": "laboratory_pathway",
                "priority": "clinician_selected",
                "why": "WHO states that clinical diagnosis alone is insufficient and that test selection depends on infection stage, specimen type, setting, co-infections, prior exposure and vaccination status.",
                "requiresClinicianReview": True,
                "citationRefs": [source]
            }
        ]
        replace_supported_claims(record, source, ["health_recommendation", "basic_starting_test"])

    elif name in {"Hypothyroidism", "Hyperthyroidism / thyrotoxicosis"}:
        source = citation_id(condition, "nice_ng145_")
        record["applicability"] = {
            "ageRange": {"minYears": 16, "maxYears": None},
            "sex": {"appliesTo": ["not_sex_specific"], "notes": "NICE describes an adult pathway; no sex-specific restriction was extracted."},
            "pregnancyStatus": "not_specified",
            "inclusionCriteria": ["Adults with clinical suspicion of thyroid dysfunction."],
            "exclusionsOrLimitations": ["Use an appropriate reviewed pathway for children, young people, pregnancy, or suspected secondary thyroid dysfunction.", "A clinician must interpret thyroid-function results."]
        }
        record["careDisposition"] = {
            "level": "routine_clinician_review",
            "timeframe": "routine",
            "message": "Discuss possible thyroid dysfunction and appropriate testing with a healthcare professional."
        }
        record["basicStartingTests"] = [{
            "testId": "thyroid_stimulating_hormone",
            "displayName": "Thyroid-Stimulating Hormone (TSH)",
            "testType": "laboratory",
            "priority": "medium",
            "why": "NICE recommends TSH as the initial adult test when secondary thyroid dysfunction is not suspected, with additional testing cascaded from the result.",
            "requiresClinicianReview": True,
            "citationRefs": [source]
        }]
        replace_supported_claims(record, source, ["applicability", "health_recommendation", "basic_starting_test"])

    elif name == "Hypertension":
        source = citation_id(condition, "nice_ng136_")
        record["applicability"] = {
            "ageRange": {"minYears": 18, "maxYears": None},
            "sex": {"appliesTo": ["not_sex_specific"], "notes": "NICE guidance applies to adults without a sex-specific restriction."},
            "pregnancyStatus": "not_specified",
            "inclusionCriteria": ["Adults with suspected hypertension following clinic blood-pressure measurement."],
            "exclusionsOrLimitations": ["A blood-pressure result does not itself establish a diagnosis.", "Use a reviewed pregnancy-specific pathway when applicable."]
        }
        record["careDisposition"] = {
            "level": "routine_clinician_review",
            "timeframe": "routine",
            "message": "Raised blood pressure should be assessed using an appropriate clinical confirmation pathway."
        }
        record["basicStartingTests"] = [
            {
                "testId": "clinic_blood_pressure_measurement",
                "displayName": "Clinic blood-pressure measurement",
                "testType": "physiological_measurement",
                "priority": "medium",
                "why": "NICE specifies repeat clinic measurement when considering hypertension.",
                "requiresClinicianReview": True,
                "citationRefs": [source]
            },
            {
                "testId": "ambulatory_blood_pressure_monitoring",
                "displayName": "Ambulatory blood-pressure monitoring (ABPM)",
                "testType": "physiological_measurement",
                "priority": "medium",
                "why": "NICE recommends ABPM to confirm suspected hypertension within its stated clinic blood-pressure range; HBPM is the alternative when ABPM is unsuitable.",
                "requiresClinicianReview": True,
                "citationRefs": [source]
            }
        ]
        replace_supported_claims(record, source, ["applicability", "health_recommendation", "basic_starting_test"])


# Claims below were extracted only from the URLs already present in the Wave 1
# registry.  A missing tests list is intentional: it means the cited material
# supports clinical assessment, referral, prevention, or a no-routine-test
# approach rather than an automated test recommendation.
SOURCE_EXTRACTIONS: dict[str, dict[str, Any]] = {
    "Varicella (chickenpox)": {
        "citationPrefix": "who_varicella_position_paper_2025",
        "scopeOnly": "The cited WHO sources are vaccine-position papers. They support prevention-policy scope, not an individual diagnostic-test recommendation."
    },
    "Idiopathic constipation in children and young people": {
        "citationPrefix": "nice_cg99_constipation_recommendations",
        "applicability": {"minYears": 0, "maxYears": 17, "pregnancyStatus": "not_applicable"},
        "care": ("urgent_clinician_review_if_red_flags", "prompt", "For children and young people, a clinician should use history and physical examination; red-flag findings require urgent assessment."),
        "recommendation": ("review_childhood_constipation", "Review childhood constipation with a qualified clinician", "NICE bases idiopathic-constipation assessment on history and physical examination and directs urgent referral when red flags are present.", "Arrange appropriate clinical assessment.", "high"),
        "noRoutineTest": "NICE advises against routine endoscopy, abdominal radiography, ultrasound, transit studies and anorectal manometry to diagnose idiopathic constipation."
    },
    "Ringworm (tinea)": {
        "citationPrefix": "who_ringworm_tinea_fact_sheet_2025",
        "care": ("routine_clinician_review", "routine", "A clinician can assess a suspected tinea infection and decide whether confirmation is needed."),
        "recommendation": ("review_suspected_tinea", "Discuss suspected ringworm with a clinician", "WHO describes confirmation by skin scraping or nail clipping when appropriate.", "Arrange a routine clinical review if confirmation is needed.", "medium"),
        "tests": [("skin_scraping_or_nail_clipping", "Skin scraping or nail clipping examination", "laboratory", "WHO describes microscopy, fungal culture, or molecular diagnosis after an appropriate sample is collected.")]
    },
    "Cholera": {
        "citationPrefix": "who_cholera_surveillance_standards_2018",
        "care": ("urgent_clinician_review", "urgent", "Possible cholera requires prompt professional assessment because severe watery diarrhoea can cause life-threatening dehydration."),
        "recommendation": ("urgent_cholera_assessment", "Seek urgent assessment for suspected cholera", "WHO describes laboratory confirmation for cholera surveillance and outbreak response.", "Seek urgent healthcare assessment.", "high"),
        "tests": [("vibrio_cholerae_stool_culture", "Stool culture for Vibrio cholerae", "laboratory", "WHO identifies stool culture as the gold-standard confirmatory test; PCR may be used as an alternative for toxigenic V. cholerae.")]
    },
    "Pneumonia": {
        "citationPrefix": "who_pneumonia_diarrhoea_children_guideline_2024",
        "applicability": {"minYears": 0, "maxYears": 10, "pregnancyStatus": "not_applicable"},
        "care": ("prompt_clinician_review", "prompt", "The cited WHO guideline is for pneumonia management in children up to 10 years of age."),
        "recommendation": ("review_childhood_pneumonia", "Seek prompt assessment for possible childhood pneumonia", "WHO provides a child-specific clinical-management guideline and includes assessment of hypoxaemia.", "Arrange prompt clinical assessment.", "high"),
        "tests": [("pulse_oximetry", "Pulse oximetry", "physiological_measurement", "WHO describes pulse oximetry and an alternative set of signs and symptoms when it is unavailable for assessing hypoxaemia in children.")]
    },
    "Malaria": {
        "citationPrefix": "who_malaria_diagnostic_testing",
        "care": ("prompt_clinician_review", "prompt", "Suspected malaria requires prompt parasite-based testing before treatment decisions."),
        "recommendation": ("prompt_malaria_testing", "Arrange prompt malaria testing", "WHO recommends parasite-based diagnosis before antimalarial treatment for people suspected of malaria.", "Seek prompt assessment at an appropriate healthcare service.", "high"),
        "tests": [("malaria_microscopy", "Malaria microscopy", "laboratory", "WHO recommends microscopy as one of the parasite-based diagnostic options for suspected malaria."), ("malaria_rapid_diagnostic_test", "Malaria rapid diagnostic test (RDT)", "laboratory", "WHO recommends an RDT as an alternative parasite-based diagnostic option for suspected malaria.")]
    },
    "Acute otitis media": {
        "citationPrefix": "nice_ng91_otitis_media_overview",
        "applicability": {"minYears": 0, "maxYears": 17, "pregnancyStatus": "not_applicable"},
        "care": ("reassess_if_worse", "routine", "The cited NICE guidance describes acute otitis media as usually self-limiting in children and young people and advises reassessment if symptoms worsen."),
        "recommendation": ("monitor_childhood_otitis", "Monitor symptoms and seek review if they worsen", "NICE advises clinical reassessment when symptoms worsen rapidly or significantly.", "Seek healthcare review if symptoms worsen or do not improve.", "medium"),
        "noRoutineTest": "No basic diagnostic test was extracted from the cited antimicrobial-prescribing guidance."
    },
    "Chikungunya fever": {
        "citationPrefix": "who_arboviral_clinical_management_2025_chikungunya",
        "scopeOnly": "The registry’s cited WHO clinical-management sources were retained for condition scope, but this extraction pass did not add an individual test pathway without a source-section-specific claim."
    },
    "Influenza": {
        "citationPrefix": "who_influenza_clinical_practice_guideline_2024",
        "care": ("clinician_selected_testing", "prompt", "Influenza test selection in the cited WHO guideline depends on the clinical setting, the diagnostic test, and expected turnaround time."),
        "recommendation": ("review_suspected_influenza", "Discuss appropriate influenza testing with a clinician", "WHO evaluates rapid point-of-care and molecular testing strategies for people presenting with suspected influenza.", "Use an appropriate healthcare service to determine whether testing is needed.", "medium"),
        "tests": [("influenza_rapid_point_of_care_test", "Rapid point-of-care influenza test", "laboratory", "WHO includes rapid point-of-care testing among evaluated diagnostic strategies for suspected influenza."), ("influenza_molecular_assay", "Influenza molecular assay", "laboratory", "WHO includes molecular assays, including RT-PCR/NAAT approaches, among evaluated diagnostic strategies for suspected influenza.")]
    },
    "Acute sinusitis": {
        "citationPrefix": "nice_ng79_sinusitis_recommendations",
        "care": ("reassess_if_worse", "routine", "NICE describes uncomplicated acute sinusitis as commonly self-limiting and advises reassessment if symptoms worsen rapidly or significantly."),
        "recommendation": ("monitor_acute_sinusitis", "Monitor symptoms and seek review for deterioration", "NICE advises self-care discussion and reassessment if symptoms worsen rapidly, significantly, or fail to improve as expected.", "Seek medical review if symptoms worsen significantly or persist.", "medium"),
        "noRoutineTest": "NICE evidence states that inflammatory markers, endoscopy and imaging are not usually required in uncomplicated acute sinusitis."
    },
    "Acute bronchitis": {
        "citationPrefix": "nice_ng120_acute_bronchitis_evidence",
        "care": ("reassess_if_worse", "routine", "NICE describes acute bronchitis-related cough as usually self-limiting and advises reassessment for rapid deterioration or serious illness."),
        "recommendation": ("monitor_acute_bronchitis", "Monitor acute cough and seek review for deterioration", "NICE advises clinical reassessment if acute-cough symptoms worsen rapidly or significantly.", "Seek medical review if symptoms worsen, become systemic, or do not improve as expected.", "medium"),
        "noRoutineTest": "The cited acute-cough guidance supports clinical reassessment rather than an automatic laboratory-test pathway."
    },
    "Tuberculosis": {
        "citationPrefix": "who_tb_module3_diagnosis_2025",
        "care": ("prompt_clinician_review", "prompt", "People with signs or symptoms concerning for tuberculosis need an appropriate diagnostic pathway managed by a healthcare service."),
        "recommendation": ("prompt_tb_assessment", "Seek prompt assessment for possible tuberculosis", "WHO recommends rapid diagnostic testing as the initial diagnostic approach for people with signs and symptoms of TB.", "Arrange prompt assessment through an appropriate healthcare service.", "high"),
        "tests": [("who_recommended_rapid_tb_diagnostic", "WHO-recommended rapid diagnostic test for tuberculosis", "laboratory", "WHO recommends rapid diagnostic testing as an initial diagnostic approach for people with signs and symptoms of TB.")]
    },
    "Typhoid fever / enteric fever": {
        "citationPrefix": "who_typhoid_surveillance_standards",
        "care": ("prompt_clinician_review", "prompt", "Clinically suspected enteric fever needs laboratory confirmation because it can resemble other non-specific febrile illnesses."),
        "recommendation": ("prompt_enteric_fever_testing", "Seek prompt assessment for possible enteric fever", "WHO describes laboratory confirmation as essential for suspected typhoid or paratyphoid fever.", "Arrange prompt clinical assessment and testing.", "high"),
        "tests": [("enteric_fever_blood_culture", "Blood culture for enteric fever", "laboratory", "WHO identifies blood culture as the preferred laboratory method in most endemic settings for enteric fever.")]
    },
    "Gastro-oesophageal reflux disease (GORD)": {
        "citationPrefix": "nice_cg184_gord_recommendations",
        "applicability": {"minYears": 18, "maxYears": None, "pregnancyStatus": "not_specified"},
        "care": ("routine_clinician_review", "routine", "The cited NICE guideline covers adults with GORD or dyspepsia and supports specialist referral when symptoms are unexplained or non-responsive to treatment."),
        "recommendation": ("review_persistent_gord", "Discuss persistent or unexplained reflux symptoms with a clinician", "NICE advises considering specialist referral for unexplained or treatment-non-responsive gastro-oesophageal symptoms.", "Arrange a routine clinical review if symptoms persist or are unexplained.", "medium"),
        "noRoutineTest": "The cited source does not support an automatic basic test for all GORD-like symptoms; endoscopy is a clinician-led consideration in stated circumstances."
    },
    "Peptic ulcer disease": {
        "citationPrefix": "nice_cg184_h_pylori_testing",
        "applicability": {"minYears": 18, "maxYears": None, "pregnancyStatus": "not_specified"},
        "care": ("routine_clinician_review", "routine", "Testing and management of suspected peptic-ulcer disease should be directed by a clinician."),
        "recommendation": ("review_peptic_ulcer_risk", "Discuss ulcer symptoms and H. pylori testing with a clinician", "NICE describes H. pylori testing and eradication in adults with peptic ulcer disease.", "Arrange a clinical review for appropriate testing.", "medium"),
        "tests": [("helicobacter_pylori_urea_breath_test", "Carbon-13 urea breath test for Helicobacter pylori", "laboratory", "NICE lists the carbon-13 urea breath test as an H. pylori testing option."), ("helicobacter_pylori_stool_antigen", "Stool antigen test for Helicobacter pylori", "laboratory", "NICE lists stool antigen testing as an H. pylori testing option.")]
    },
    "Asthma": {
        "citationPrefix": "nice_ng245_asthma_objective_tests",
        "care": ("routine_clinician_review", "routine", "Suspected asthma requires a clinical assessment and objective testing pathway rather than symptom-only confirmation."),
        "recommendation": ("review_suspected_asthma", "Discuss objective testing for suspected asthma", "NICE requires objective testing to support asthma diagnosis when clinically suspected.", "Arrange a clinical assessment for appropriate objective testing.", "medium"),
        "tests": [("fractional_exhaled_nitric_oxide", "Fractional exhaled nitric oxide (FeNO)", "physiological_measurement", "NICE includes FeNO as an objective diagnostic test in people with a history suggestive of asthma."), ("spirometry_with_bronchodilator_reversibility", "Spirometry with bronchodilator reversibility", "physiological_measurement", "NICE recommends bronchodilator reversibility testing with spirometry when asthma is not confirmed by its initial objective tests.")]
    },
    "Migraine": {
        "citationPrefix": "nice_cg150_migraine_diagnosis",
        "applicability": {"minYears": 12, "maxYears": None, "pregnancyStatus": "not_specified"},
        "care": ("clinician_assessment", "routine", "The cited NICE guidance treats migraine as a clinical diagnosis in people aged 12 years and over, with investigation guided by atypical features."),
        "recommendation": ("clinical_migraine_assessment", "Discuss recurrent headache patterns with a clinician", "NICE describes a typical clinical migraine diagnosis that does not require investigations solely to exclude alternatives.", "Arrange clinical assessment, especially for a new, changing, or atypical headache pattern.", "medium"),
        "noRoutineTest": "NICE does not support routine neuroimaging solely for reassurance when the clinical picture is typical."
    },
    "Acute diarrhoea/gastroenteritis in children": {
        "citationPrefix": "who_pneumonia_diarrhoea_children_guideline_2024_diarrhoea",
        "applicability": {"minYears": 0, "maxYears": 10, "pregnancyStatus": "not_applicable"},
        "care": ("prompt_clinician_review", "prompt", "The cited WHO guideline concerns management of diarrhoea in children up to 10 years of age."),
        "recommendation": ("review_childhood_diarrhoea", "Seek prompt assessment for concerning childhood diarrhoea", "WHO provides child-specific diarrhoea management guidance, including assessment of clinical severity.", "Arrange prompt child-appropriate clinical assessment.", "high"),
        "noRoutineTest": "No automatic laboratory-test recommendation was extracted from the cited WHO guideline overview."
    },
    "Acute cough associated with an upper respiratory tract infection": {
        "citationPrefix": "nice_ng120_common_cold_recommendations",
        "care": ("reassess_if_worse", "routine", "NICE describes acute upper-respiratory cough as usually self-limiting and advises reassessment for deterioration or serious illness."),
        "recommendation": ("monitor_acute_urti_cough", "Monitor acute cough and seek review for deterioration", "NICE advises clinical reassessment if acute-cough symptoms worsen rapidly or significantly.", "Seek medical review if symptoms worsen, become systemic, or do not improve as expected.", "medium"),
        "noRoutineTest": "The cited acute-cough guidance does not establish an automatic basic-test pathway."
    },
    "Varicose veins": {
        "citationPrefix": "nice_cg168_varicose_veins_recommendations",
        "care": ("vascular_service_review", "routine", "NICE directs referral for symptomatic veins and immediate referral for bleeding varicose veins."),
        "recommendation": ("review_symptomatic_varicose_veins", "Discuss symptomatic varicose veins with a vascular service", "NICE identifies symptomatic, recurrent, skin-changed, thrombosed, or ulcer-associated varicose veins for vascular-service referral.", "Arrange appropriate vascular assessment; seek immediate care for bleeding varicose veins.", "medium"),
        "noRoutineTest": "NICE uses duplex ultrasound within a vascular service to confirm varicose veins, but that imaging test is excluded from HealthWise AI's basic-starting-test scope."
    },
    "Osteoarthritis": {
        "citationPrefix": "nice_ng226_osteoarthritis_diagnosis",
        "applicability": {"minYears": 16, "maxYears": None, "pregnancyStatus": "not_specified"},
        "care": ("clinician_assessment", "routine", "NICE states that, in the absence of red flags, osteoarthritis can be diagnosed through clinical assessment in adults."),
        "recommendation": ("clinical_osteoarthritis_assessment", "Discuss persistent joint symptoms with a clinician", "NICE describes history and examination as the appropriate basis for clinical assessment in the absence of red flags.", "Arrange a routine clinical review for persistent joint symptoms.", "medium"),
        "noRoutineTest": "NICE states imaging is not routinely needed for diagnosis when the clinical presentation is typical and there are no red flags."
    },
    "Benign paroxysmal positional vertigo (BPPV)": {
        "citationPrefix": "nice_ng127_bppv_recommendations",
        "applicability": {"minYears": 16, "maxYears": None, "pregnancyStatus": "not_specified"},
        "care": ("trained_clinician_assessment", "routine", "NICE limits the Hallpike manoeuvre to a healthcare professional trained in its use."),
        "recommendation": ("review_positional_vertigo", "Discuss positional vertigo with a trained clinician", "NICE recommends a Hallpike manoeuvre for transient rotational vertigo triggered by head movement when a trained professional is available.", "Arrange assessment through an appropriate clinical pathway.", "medium"),
        "tests": [("hallpike_manoeuvre", "Hallpike manoeuvre", "clinical_manoeuvre", "NICE recommends the Hallpike manoeuvre to check for BPPV when performed by a trained healthcare professional.")]
    },
    "Acne vulgaris": {
        "citationPrefix": "nice_ng198_acne_recommendations",
        "care": ("routine_clinician_review", "routine", "NICE supports specialist referral when the diagnosis is unclear, acne is severe, or the condition is causing significant impact."),
        "recommendation": ("review_acne_severity_or_uncertainty", "Seek clinical review for severe, unclear, or distressing acne", "NICE supports referral when acne is severe, diagnosis is unclear, or psychological impact is persistent.", "Arrange an appropriate clinical or dermatology review.", "medium"),
        "noRoutineTest": "No basic diagnostic test was extracted from the cited acne-management guidance."
    },
    "Hypoglycaemia in adults with type 2 diabetes": {
        "citationPrefix": "nice_ng28_hypoglycaemia_blood_glucose_management",
        "applicability": {"minYears": 18, "maxYears": None, "pregnancyStatus": "not_specified"},
        "care": ("clinician_review_required", "prompt", "The cited guidance applies to adults with type 2 diabetes and requires individualised glucose-management decisions."),
        "recommendation": ("review_suspected_hypoglycaemia", "Discuss suspected hypoglycaemia with a clinician", "NICE allows short-term capillary blood-glucose self-monitoring to confirm suspected hypoglycaemia in the stated population.", "Arrange timely clinical review, particularly if episodes recur or are severe.", "high"),
        "tests": [("capillary_blood_glucose", "Capillary blood-glucose measurement", "point_of_care_measurement", "NICE permits short-term capillary blood-glucose self-monitoring to confirm suspected hypoglycaemia in adults with type 2 diabetes.")]
    },
    "Lower urinary tract infection": {
        "citationPrefix": "nice_ng109_lower_uti_recommendations",
        "care": ("clinician_review_required", "routine", "Appropriate lower-UTI testing depends on age, sex, pregnancy status, symptoms, and the risk of complications."),
        "recommendation": ("review_lower_uti", "Discuss lower urinary symptoms with a clinician", "NICE specifies urine sampling and culture for stated groups and advises reassessment if symptoms worsen or fail to improve.", "Arrange clinical assessment for appropriate urine testing.", "medium"),
        "tests": [("midstream_urine_culture_and_susceptibility", "Midstream urine culture and susceptibility testing", "laboratory", "NICE specifies a pre-antibiotic midstream urine sample for culture and susceptibility testing in pregnant women and men with lower UTI; children follow an age-specific dipstick/culture pathway.")]
    },
    "Psoriasis": {
        "citationPrefix": "nice_cg153_psoriasis_recommendations",
        "care": ("dermatology_review_if_indicated", "routine", "NICE requires assessment of severity, impact, psoriatic arthritis, and comorbidities, with specialist referral for stated circumstances."),
        "recommendation": ("review_psoriasis_impact", "Discuss psoriasis severity and impact with a clinician", "NICE recommends assessment of disease severity, wellbeing impact, psoriatic arthritis, and comorbidities.", "Arrange clinical or dermatology review if disease is extensive, uncontrolled, uncertain, or significantly affecting wellbeing.", "medium"),
        "noRoutineTest": "No universal basic diagnostic test was extracted from the cited psoriasis-assessment guidance."
    },
    "Impetigo": {
        "citationPrefix": "nice_ng153_impetigo_recommendations",
        "care": ("reassess_if_worse", "routine", "NICE advises reassessment if impetigo worsens rapidly, significantly, or does not improve after treatment."),
        "recommendation": ("monitor_impetigo", "Seek review for worsening or recurrent impetigo", "NICE advises hygiene measures and reassessment for deterioration, non-improvement, recurrence, or higher-risk situations.", "Arrange clinical review if symptoms worsen, recur frequently, or the person is systemically unwell.", "medium"),
        "tests": [("impetigo_skin_swab", "Skin swab for microbiological testing", "laboratory", "NICE states that microbiological testing may guide antimicrobial prescribing and recommends a skin swab for frequently recurrent impetigo.")]
    },
    "Acute conjunctivitis": {
        "citationPrefix": "who_searo_district_clinician_manual_viral_conjunctivitis",
        "care": ("urgent_review_if_red_flags", "routine", "The cited WHO manual describes clinical diagnosis for typical viral conjunctivitis and urgent ophthalmology referral for suspected hyper-acute gonococcal infection."),
        "recommendation": ("review_red_eye", "Seek urgent eye care for severe or high-risk red-eye symptoms", "The WHO manual describes clinical diagnosis for typical viral conjunctivitis and urgent referral for hyper-acute gonococcal infection.", "Use an appropriate eye-care pathway if symptoms are severe, visual changes occur, or discharge is extreme.", "high"),
        "noRoutineTest": "The cited WHO manual states that culture or smears are not needed for typical acute viral conjunctivitis."
    },
    "Haemorrhoids (piles)": {
        "citationPrefix": "nice_ta128_haemorrhoids_clinical_need",
        "care": ("clinician_assessment", "routine", "The cited NICE sources describe haemorrhoidal symptoms and grading but do not provide a general automated diagnostic-test pathway."),
        "recommendation": ("review_piles_symptoms", "Discuss persistent bleeding, prolapse, pain, or anal symptoms with a clinician", "NICE describes bleeding, itching, discomfort and prolapse as haemorrhoid symptoms and notes grade-specific management is clinician-led.", "Arrange clinical assessment for persistent or concerning symptoms.", "medium"),
        "noRoutineTest": "No basic diagnostic test was extracted from the cited haemorrhoid technology-guidance sources."
    },
    "Allergic rhinitis": {
        "citationPrefix": "aaaai_acaai_rhinitis_practice_parameter_2020",
        "care": ("clinician_assessment", "routine", "The cited practice parameter recommends history and physical examination, with aeroallergen testing to confirm allergic rhinitis when history is consistent."),
        "recommendation": ("review_allergic_rhinitis", "Discuss persistent rhinitis symptoms with a clinician", "The cited practice parameter recommends a detailed history and examination and confirmation testing when allergic rhinitis is clinically suspected.", "Arrange a routine clinical review for appropriate evaluation.", "medium"),
        "tests": [("aeroallergen_skin_prick_test", "Aeroallergen skin-prick test", "laboratory_or_clinical_test", "The cited practice parameter recommends aeroallergen skin-prick testing to confirm allergic rhinitis when history is consistent."), ("allergen_specific_ige", "Allergen-specific IgE test", "laboratory", "The cited practice parameter recommends specific-IgE testing as an alternative confirmation test when history is consistent.")]
    },
}


def apply_source_extraction(record: dict[str, Any], condition: dict[str, Any]) -> None:
    """Apply a citation-scoped extraction without creating disease inference rules."""
    record["recordStatus"] = "source_extracted_draft"
    record["review"]["notes"] = [
        "Citations are limited to the pre-approved Wave 1 registry.",
        "No direct legacy-dataset symptom-to-condition relationship is asserted.",
        "Clinical review is required before this record can be used by a chatbot, recommendation engine, or patient-facing flow.",
    ]
    config = SOURCE_EXTRACTIONS.get(condition["normalizedCondition"])
    if not config:
        return

    source = citation_id(condition, config["citationPrefix"])
    if "scopeOnly" in config:
        record["review"]["notes"].append(config["scopeOnly"])
        return

    app = config.get("applicability")
    if app:
        record["applicability"]["ageRange"] = {"minYears": app["minYears"], "maxYears": app["maxYears"]}
        record["applicability"]["pregnancyStatus"] = app["pregnancyStatus"]

    claims = []
    if "care" in config:
        level, timeframe, message = config["care"]
        record["careDisposition"] = {"level": level, "timeframe": timeframe, "message": message}
        claims.append("care_navigation")
    if "recommendation" in config:
        rec_id, headline, message, action, priority = config["recommendation"]
        record["healthRecommendations"] = [{
            "recommendationId": rec_id,
            "recommendationType": "care_navigation",
            "priority": priority,
            "headline": headline,
            "message": message,
            "action": action,
            "citationRefs": [source],
        }]
        claims.append("health_recommendation")
    if "tests" in config:
        record["basicStartingTests"] = [{
            "testId": test_id,
            "displayName": display_name,
            "testType": test_type,
            "priority": "medium",
            "why": why,
            "requiresClinicianReview": True,
            "citationRefs": [source],
        } for test_id, display_name, test_type, why in config["tests"]]
        claims.append("basic_starting_test")
    if "noRoutineTest" in config:
        record["review"]["notes"].append(config["noRoutineTest"])
        claims.append("basic_starting_test_limit")
    if app:
        claims.append("applicability")
    replace_supported_claims(record, source, claims or ["condition_scope"])


def main() -> None:
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8-sig"))
    records: list[dict[str, Any]] = []
    for condition in registry["conditions"]:
        record = base_record(condition)
        add_verified_extractions(record, condition)
        apply_source_extraction(record, condition)
        records.append(record)

    payload = {
        "schemaVersion": "1.0",
        "sourceCitationRegistry": REGISTRY_PATH.name,
        "generatedAt": "2026-09-04",
        "intendedUse": "Draft, citation-linked clinical-content curation. This file is not runtime medical logic until each record is clinically approved.",
        "records": records,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} records to {OUTPUT_PATH.name}")


if __name__ == "__main__":
    main()
