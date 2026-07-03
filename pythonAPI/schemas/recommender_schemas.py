from typing import List, Dict, Any
from pydantic import BaseModel, Field


# --- PYDANTIC SCHEMAS FOR INCOMING PAYLOAD ---
class Stage3Data(BaseModel):
    selectedSymptoms: List[str] = Field(default_factory=list)

class Stage4Data(BaseModel):
    deepDive: Dict[str, Any] = Field(default_factory=dict)

class HealthAssessmentPayload(BaseModel):
    stage1: Dict[str, Any]
    stage2: Dict[str, Any]
    stage3: Stage3Data
    stage4: Stage4Data
