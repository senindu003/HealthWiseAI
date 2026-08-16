"""Validated models for the React health questionnaire payload."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PersonalHistory(BaseModel):
    """Known personal conditions, preserving additional frontend conditions."""

    model_config = ConfigDict(extra="allow")
    diabetes: bool = False


class MedicalHistory(BaseModel):
    """Family and medical-history answers from stage two."""

    model_config = ConfigDict(extra="allow")
    personal_history: PersonalHistory = Field(default_factory=PersonalHistory, alias="personalHistory")
    first_degree_history: dict[str, bool] = Field(default_factory=dict, alias="firstDegreeHistory")
    second_degree_history: dict[str, bool] = Field(default_factory=dict, alias="secondDegreeHistory")
    early_onset_heart: str | None = Field(default=None, alias="earlyOnsetHeart")
    inherited_blood: str | None = Field(default=None, alias="inheritedBlood")
    multiple_shared_disease: str | None = Field(default=None, alias="multipleSharedDisease")
    medications: list[str] = Field(default_factory=list)
    major_surgery: bool = Field(default=False, alias="majorSurgery")
    hospitalization: bool = False
    allergies: list[str] = Field(default_factory=list)
    past_labs_routine: str | None = Field(default=None, alias="pastLabsRoutine")
    past_labs_abnormal: list[str] = Field(default_factory=list, alias="pastLabsAbnormal")


class LifestyleProfile(BaseModel):
    """Stage-one demographic and lifestyle answers."""

    model_config = ConfigDict(extra="allow")
    age: int = Field(ge=0, le=130)
    sex: str = Field(min_length=1, max_length=50)
    height: float | None = Field(default=None, gt=0, le=300)
    weight: float | None = Field(default=None, gt=0, le=500)
    pregnancy: str | None = None
    ethnicity: str | None = None
    country: str | None = None
    smoking: str | None = None
    alcohol: str | None = None
    physical_activity: str | None = Field(default=None, alias="physicalActivity")
    exercise_duration: float | None = Field(default=None, ge=0, alias="exerciseDuration")
    sleep_hours: float | None = Field(default=None, ge=0, le=24, alias="sleepHours")
    sleep_quality: str | None = Field(default=None, alias="sleepQuality")
    diet_patterns: str | None = Field(default=None, alias="dietPatterns")
    water_intake: str | None = Field(default=None, alias="waterIntake")
    stress_level: str | None = Field(default=None, alias="stressLevel")


class SymptomsProfile(BaseModel):
    """Stage-three symptoms selected by the user."""

    model_config = ConfigDict(extra="allow")
    selected_symptoms: list[str] = Field(default_factory=list, alias="selectedSymptoms")

    @field_validator("selected_symptoms")
    @classmethod
    def validate_symptoms(cls, value: list[str]) -> list[str]:
        """Reject blank symptom identifiers while accepting an empty selection."""

        if any(not symptom.strip() for symptom in value):
            raise ValueError("selectedSymptoms cannot contain blank values")
        return value


class QuestionnaireRequest(BaseModel):
    """Complete questionnaire accepted from the frontend."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    stage1: LifestyleProfile
    stage2: MedicalHistory
    stage3: SymptomsProfile

    def as_clinical_context(self) -> dict[str, Any]:
        """Return an alias-preserving, JSON-serializable clinical context."""

        return self.model_dump(by_alias=True, mode="json", exclude_none=True)
