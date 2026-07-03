from typing import List, Dict, Any
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from schemas.recommender_schemas import Stage3Data, Stage4Data, HealthAssessmentPayload

# Import the orchestrator service from your sub-folder
from recommender.recommender import run_recommendation_pipeline


app = FastAPI(
    title="Health Assessment Diagnosis Test Recommender Engine",
    description="Decoupled API Routing Framework mapping inputs directly to core clinical service layers.",
    version="1.0.0"
)

# 1. Define the exact origins (URLs) your frontend is served from
origins = [
    "http://localhost:5173",     # Default Vite development server port
    "http://127.0.0.1:5173",     # Alternative local loopback mapping
    "http://localhost:3000",     # Common alternative port fallback
]

# 2. Inject the CORS middleware into the application runtime layer
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Allows requests from your specific frontend ports
    allow_credentials=True,           # Permissive session cookie tracking allowance
    allow_methods=["*"],              # Crucial! Allows OPTIONS, POST, GET, PUT, etc.
    allow_headers=["*"],              # Allows Content-Type, Authorization, etc.
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