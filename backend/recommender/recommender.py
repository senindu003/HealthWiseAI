import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Import the deterministic rules file located in your root directory
from recommender.test_mapping_rules import evaluate_deterministic_rules

# Safely latch into underlying environmental context variables
load_dotenv()

# Initialize the Gemini ecosystem securely away from routing setups
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

async def run_recommendation_pipeline(payload_dict: dict) -> dict:
    """
    Core orchestrator method handling rule executions, AI model prompt engineering,
    and fallback recovery states.
    """
    # 1. Evaluate target deterministic rules (Safe Zone)
    mandatory_tests = evaluate_deterministic_rules(payload_dict)
    
    # Fallback early to optimize network performance if nothing flags true
    if not mandatory_tests:
        return {
            "status": "success",
            "summary": "Based on your current baseline indicators, no immediate specific laboratory diagnostics are flagged as mandatory requirements.",
            "recommendations": []
        }

    # 2. Map strict target filters for the LLM context boundaries
    allowed_test_names = [test["test_name"] for test in mandatory_tests]

    # Check for Gemini API configuration safety before attempting network calls
    if not api_key:
        return generate_safe_fallback(mandatory_tests)

    # 3. Setup clinical safety boundaries inside system instructions
    system_instruction = (
        "You are a compassionate, world-class medical communicator. Your role is strictly to explain the clinical reasoning "
        "behind the recommended laboratory or diagnostic tests. You are an advisor, not a practitioner.\n\n"
        "CRITICAL GUARDRAILS:\n"
        "1. You are ONLY allowed to discuss, explain, or list the items provided in the 'Allowed Tests' array.\n"
        "2. Never invent, extrapolate, or recommend any extra tests, imaging, or physical interventions.\n"
        "3. Do NOT provide a definitive diagnosis (e.g., do not say 'You have diabetes').\n"
        "4. Keep justifications clear, brief, and actionable."
    )

    user_prompt = f"""
    User Profile Context Frame:
    - Age: {payload_dict['stage1'].get('age')}
    - Sex Assigned at Birth: {payload_dict['stage1'].get('sex')}
    - Active Symptoms Array: {payload_dict['stage3'].get('selectedSymptoms')}
    
    Strictly Allowed Tests List to Explain:
    {allowed_test_names}

    Provide a structured JSON output matching exactly this format schema layout:
    {{
        "summary": "A brief, empathetic holistic overview statement of their screening path.",
        "explanations": [
            {{"test_name": "Exact test name string from allowed list", "justification": "Clear explanation of how this validates or screens their specific symptoms or history profile indicators."}}
        ]
    }}
    """

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash-lite",
            system_instruction=system_instruction
        )

        response = model.generate_content(
            user_prompt,
            generation_config={"response_mime_type": "application/json"}
        )

        ai_synthesis = json.loads(response.text)
        explanation_map = {item["test_name"]: item["justification"] for item in ai_synthesis.get("explanations", [])}

        # Stitch logic layer metadata keys back into the final response array package
        final_recommendations = []
        for test in mandatory_tests:
            name = test["test_name"]
            final_recommendations.append({
                "test_name": name,
                "category": test["category"],
                "report_type": test["report_type"], # Guides Spring Boot downstream file routing
                "reason_from_rules": test["reason"],
                "personalized_explanation": explanation_map.get(name, "Recommended structural evaluation parameter.")
            })

        return {
            "status": "success",
            "summary": ai_synthesis.get("summary", "Your personal laboratory screening checklist has been compiled successfully."),
            "recommendations": final_recommendations
        }

    except Exception:
        # Fallback routines intercept smoothly if LLM rates cap out or throw formats issues
        print('''LLM API call failed, falling back to deterministic rules...''')
        return generate_safe_fallback(mandatory_tests)


def generate_safe_fallback(mandatory_tests: list) -> dict:
    """Helper method to return pristine deterministic logic frames if AI modules fault out."""
    return {
        "status": "fallback",
        "summary": "Your preventative health checklist was compiled using standard baseline clinical protocol verification rules.",
        "recommendations": [
            {
                "test_name": test["test_name"],
                "category": test["category"],
                "report_type": test["report_type"],
                "reason_from_rules": test["reason"],
                "personalized_explanation": "Recommended validation check according to standard baseline tracking metrics guidelines."
            } for test in mandatory_tests
        ]
    }