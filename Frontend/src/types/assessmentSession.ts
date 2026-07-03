// Mirrors the backend DTOs/enums 1:1 (see Backend/.../session/model + dto).
// Single source of truth for assessment-session shapes used by the service, context, and pages.

export type { ApiError, ApiResponse } from './api';

export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type StageType =
  | 'STAGE_1_BASIC_PROFILE'
  | 'STAGE_2_MEDICAL_HISTORY'
  | 'STAGE_3_SYMPTOMS'
  | 'STAGE_4_REVIEW';

export const STAGE_ORDER: StageType[] = [
  'STAGE_1_BASIC_PROFILE',
  'STAGE_2_MEDICAL_HISTORY',
  'STAGE_3_SYMPTOMS',
  'STAGE_4_REVIEW',
];

export const STAGE_ROUTES: Record<StageType, string> = {
  STAGE_1_BASIC_PROFILE: '/assessment/profile',
  STAGE_2_MEDICAL_HISTORY: '/assessment/medical-history',
  STAGE_3_SYMPTOMS: '/assessment/symptoms',
  STAGE_4_REVIEW: '/assessment/review',
};

export function stageToStepNumber(stage: StageType): number {
  return STAGE_ORDER.indexOf(stage) + 1;
}

export interface BasicProfile {
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  bmi: number | null;
}

export interface Lifestyle {
  smokingStatus: string | null;
  alcoholConsumption: string | null;
  exerciseHoursPerWeek: number | null;
  sleepHours: number | null;
  stressLevel: string | null;
}

export interface MedicalHistory {
  personalConditions: string[];
  familyHistory: string[];
  medications: string[];
  majorSurgery: boolean | null;
  hospitalization: boolean | null;
  allergies: string[];
  hasAbnormalLabs: boolean | null;
  abnormalLabAreas: string[];
  isPregnant: boolean | null;
}

export interface SymptomsData {
  symptomsByCategory: Record<string, string[]>;
  totalCount: number | null;
  riskLevel: string | null;
  hasEmergency: boolean | null;
}

export interface RiskIndicators {
  flags: Record<string, unknown>;
}

export interface DerivedMetrics {
  metrics: Record<string, unknown>;
}

export interface Preferences {
  preferredLanguage: string | null;
  notificationsEnabled: boolean | null;
}

export interface AssessmentData {
  basicProfile: BasicProfile;
  lifestyle: Lifestyle;
  medicalHistory: MedicalHistory;
  symptoms: SymptomsData;
  riskIndicators: RiskIndicators;
  derivedMetrics: DerivedMetrics;
  preferences: Preferences;
}

export interface AssessmentSessionResponse {
  sessionId: string;
  userId: string;
  assessmentVersion: string;
  status: SessionStatus;
  currentStage: StageType;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  lastAutoSavedAt: string | null;
  assessmentData: AssessmentData;
}

export interface CreateSessionRequest {
  assessmentVersion?: string;
}

export interface UpdateStageRequest {
  stage: StageType;
  data: Record<string, unknown>;
  markStageComplete?: boolean;
}

export interface AutoSaveRequest {
  stage: StageType;
  data: Record<string, unknown>;
}

// Flattens the relevant section(s) of AssessmentData into the raw payload shape the
// backend's per-stage merge expects (mirrors AssessmentSessionServiceImpl#mergeStageData).
// Shared by AssessmentSessionContext.saveStage and useAutoSave so the mapping lives in one place.
export function buildStagePayload(stage: StageType, data: AssessmentData): Record<string, unknown> {
  switch (stage) {
    case 'STAGE_1_BASIC_PROFILE':
      return { ...data.basicProfile, ...data.lifestyle };
    case 'STAGE_2_MEDICAL_HISTORY':
      return { ...data.medicalHistory };
    case 'STAGE_3_SYMPTOMS':
      return { ...data.symptoms };
    case 'STAGE_4_REVIEW':
      return { ...data.preferences };
    default:
      return {};
  }
}

export const EMPTY_ASSESSMENT_DATA: AssessmentData = {
  basicProfile: { age: null, gender: null, height: null, weight: null, bmi: null },
  lifestyle: {
    smokingStatus: null,
    alcoholConsumption: null,
    exerciseHoursPerWeek: null,
    sleepHours: null,
    stressLevel: null,
  },
  medicalHistory: {
    personalConditions: [],
    familyHistory: [],
    medications: [],
    majorSurgery: null,
    hospitalization: null,
    allergies: [],
    hasAbnormalLabs: null,
    abnormalLabAreas: [],
    isPregnant: null,
  },
  symptoms: {
    symptomsByCategory: {},
    totalCount: null,
    riskLevel: null,
    hasEmergency: null,
  },
  riskIndicators: { flags: {} },
  derivedMetrics: { metrics: {} },
  preferences: { preferredLanguage: null, notificationsEnabled: null },
};
