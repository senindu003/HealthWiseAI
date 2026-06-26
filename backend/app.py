from typing import List, Dict, Any
from fastapi import FastAPI, status
from backend.schemas.recommender_schemas import (
    Stage3Data,
    Stage4Data,
    HealthAssessmentPayload,
)

# Import the orchestrator service from your sub-folder
from backend.recommender.recommender import run_recommendation_pipeline


app = FastAPI(
    title="Health Assessment Diagnosis Test Recommender Engine",
    description="Decoupled API Routing Framework mapping inputs directly to core clinical service layers.",
    version="1.0.0"
)

# --- API ENDPOINTS ---

@app.post(
    "/api/v1/recommendations", 
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any]
)
async def generate_health_recommendations(payload: HealthAssessmentPayload):
    """
    Acts cleanly as an interface router. Rejects malformed requests instantly via Pydantic,
    then forwards valid payload objects directly into the isolated business logic pipeline.
    """
    # 1. Convert structural payload into a standard Python dictionary matrix
    payload_dict = payload.model_dump()
    
    # 2. Hand off processing completely to the service container module
    response_data = await run_recommendation_pipeline(payload_dict)
    
    return response_data