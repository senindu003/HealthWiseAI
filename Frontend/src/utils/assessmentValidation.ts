import type { AssessmentData } from '../types/assessmentSession';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

function result(errors: Record<string, string>): ValidationResult {
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStage1(data: AssessmentData): ValidationResult {
  const { basicProfile } = data;
  const errors: Record<string, string> = {};

  if (basicProfile.age === null) errors.age = 'Age is required.';
  else if (basicProfile.age < 0 || basicProfile.age > 150) errors.age = 'Age must be between 0 and 150.';

  if (!basicProfile.gender) errors.gender = 'Gender is required.';

  if (basicProfile.height === null) errors.height = 'Height is required.';
  else if (basicProfile.height <= 0 || basicProfile.height > 300) errors.height = 'Height must be between 1 and 300 cm.';

  if (basicProfile.weight === null) errors.weight = 'Weight is required.';
  else if (basicProfile.weight <= 0 || basicProfile.weight > 500) errors.weight = 'Weight must be between 1 and 500 kg.';

  return result(errors);
}

export function validateStage2(data: AssessmentData): ValidationResult {
  const { medicalHistory, basicProfile } = data;
  const errors: Record<string, string> = {};

  if (medicalHistory.hasAbnormalLabs === null) {
    errors.hasAbnormalLabs = 'Please indicate whether you have had abnormal lab results.';
  } else if (medicalHistory.hasAbnormalLabs && medicalHistory.abnormalLabAreas.length === 0) {
    errors.abnormalLabAreas = 'Select at least one affected area.';
  }

  // Conditional field: only required when the profile's gender is female.
  if (basicProfile.gender === 'female' && medicalHistory.isPregnant === null) {
    errors.isPregnant = 'Please answer the pregnancy question.';
  }

  return result(errors);
}

export function validateStage3(data: AssessmentData, emergencyAcknowledged: boolean): ValidationResult {
  const { symptoms } = data;
  const errors: Record<string, string> = {};

  // Dynamic: this field only becomes required if an emergency-flagged symptom was selected.
  if (symptoms.hasEmergency && !emergencyAcknowledged) {
    errors.emergencyAcknowledged = 'Please acknowledge the emergency warning before continuing.';
  }

  return result(errors);
}
