import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import BottomNav from '../components/BottomNav';
import AssessmentStepper from '../components/AssessmentStepper';
import Spinner from '../components/Spinner';
import { useAssessmentSession } from '../context/AssessmentSessionContext';
import { useAutoSave } from '../hooks/useAutoSave';
import { validateStage3 } from '../utils/assessmentValidation';

type Category = 'General' | 'Heart' | 'Respiratory' | 'Digestive' | 'Neurological';

interface CategoryInfo {
  label: Category;
  icon: string;
}

const categories: CategoryInfo[] = [
  { label: 'General', icon: 'body_system' },
  { label: 'Heart', icon: 'favorite' },
  { label: 'Respiratory', icon: 'pulmonology' },
  { label: 'Digestive', icon: 'gastroenterology' },
  { label: 'Neurological', icon: 'neurology' },
];

const symptomsByCategory: Record<Category, string[]> = {
  General: ['Fatigue', 'Fever', 'Chills', 'Unexplained Weight Loss', 'Night Sweats', 'General Malaise'],
  Heart: ['Chest Pain', 'Palpitations', 'Swelling in Legs/Feet', 'Dizziness/Fainting'],
  Respiratory: ['Shortness of Breath', 'Persistent Cough', 'Wheezing'],
  Digestive: ['Nausea/Vomiting', 'Abdominal Pain'],
  Neurological: ['Headache', 'Numbness/Tingling'],
};

const emergencySymptoms = ['Chest Pain', 'Shortness of Breath'];

export default function AssessmentSymptoms() {
  const navigate = useNavigate();
  const { assessmentData, updateSection, sessionId, saveStage } = useAssessmentSession();
  useAutoSave(sessionId, 'STAGE_3_SYMPTOMS', assessmentData);
  const { symptoms } = assessmentData;

  // Active tab stays local (ephemeral UI state); selections are sourced from the
  // shared assessment session (autosaved).
  const [activeCategory, setActiveCategory] = useState<Category>('General');
  // Not persisted to the session - it's a one-time UX gate for this visit, not
  // assessment data, and simply re-prompts if the user leaves and comes back.
  const [emergencyAcknowledged, setEmergencyAcknowledged] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isContinuing, setIsContinuing] = useState(false);
  const selectedSymptoms: Record<Category, string[]> = {
    General: symptoms.symptomsByCategory.General ?? [],
    Heart: symptoms.symptomsByCategory.Heart ?? [],
    Respiratory: symptoms.symptomsByCategory.Respiratory ?? [],
    Digestive: symptoms.symptomsByCategory.Digestive ?? [],
    Neurological: symptoms.symptomsByCategory.Neurological ?? [],
  };

  const toggleSymptom = (category: Category, symptom: string) => {
    const current = selectedSymptoms[category];
    const updated = current.includes(symptom)
      ? current.filter((s) => s !== symptom)
      : [...current, symptom];
    updateSection('symptoms', { symptomsByCategory: { ...selectedSymptoms, [category]: updated } });
  };

  const clearCategory = () => {
    updateSection('symptoms', { symptomsByCategory: { ...selectedSymptoms, [activeCategory]: [] } });
  };

  const allSelected = Object.values(selectedSymptoms).flat();
  const totalCount = allSelected.length;
  const hasEmergency = allSelected.some((s) => emergencySymptoms.includes(s));
  const affectedCategories = (Object.keys(selectedSymptoms) as Category[]).filter(
    (cat) => selectedSymptoms[cat].length > 0,
  );

  const riskLevel: 'Low' | 'Moderate' | 'High Risk' = hasEmergency
    ? 'High Risk'
    : totalCount > 3
      ? 'Moderate'
      : 'Low';

  return (
    <div className="text-text-primary min-h-screen flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      <TopNav activeLink="Assessment" />

      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
        {/* Stepper */}
        <div className="mb-8">
          <AssessmentStepper currentStep={3} completionPercent="75%" />
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Categories */}
          <div className="lg:col-span-3">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4 shadow-sm">
              <h2 className="font-headline-md text-headline-md text-text-primary mb-4">Categories</h2>
              <div className="flex flex-col gap-2">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat.label;
                  return (
                    <button
                      key={cat.label}
                      onClick={() => setActiveCategory(cat.label)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-secondary-container border-secondary'
                          : 'bg-surface border-outline-variant/30 hover:bg-surface-container-low'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined ${isActive ? 'text-secondary' : 'text-text-secondary'}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {cat.icon}
                      </span>
                      <span
                        className={`font-label-md text-label-md ${
                          isActive ? 'text-secondary font-bold' : 'text-text-secondary'
                        }`}
                      >
                        {cat.label}
                      </span>
                      {selectedSymptoms[cat.label].length > 0 && (
                        <span className="ml-auto bg-secondary text-surface-container-lowest text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {selectedSymptoms[cat.label].length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center - Symptom Selection */}
          <div className="lg:col-span-6">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-secondary text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {categories.find((c) => c.label === activeCategory)?.icon}
                  </span>
                  <h2 className="font-headline-md text-headline-md text-text-primary">{activeCategory}</h2>
                </div>
                <button
                  onClick={clearCategory}
                  className="font-label-md text-label-md text-text-secondary hover:text-error transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  No symptoms
                </button>
              </div>

              {/* Symptom Chips */}
              <div className="flex flex-wrap gap-3">
                {symptomsByCategory[activeCategory].map((symptom) => {
                  const isChecked = selectedSymptoms[activeCategory].includes(symptom);
                  const chipId = `sym-${symptom.toLowerCase().replace(/[\s/()]+/g, '-')}`;
                  return (
                    <div key={symptom} className="relative">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        id={chipId}
                        checked={isChecked}
                        onChange={() => toggleSymptom(activeCategory, symptom)}
                      />
                      <label
                        className={`inline-flex items-center px-4 py-2 rounded-full border font-label-md text-label-md cursor-pointer hover:bg-surface-container-high transition-all select-none ${
                          isChecked
                            ? 'bg-secondary text-surface-container-lowest border-secondary'
                            : 'bg-surface border-outline-variant/50 text-text-secondary'
                        }`}
                        htmlFor={chipId}
                      >
                        {symptom}
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Emergency Banner */}
              <div
                className="bg-error-container text-on-error-container rounded-xl p-4 flex items-start gap-4 border border-error/20"
                style={{
                  maxHeight: hasEmergency ? '200px' : '0',
                  opacity: hasEmergency ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  marginTop: hasEmergency ? '24px' : '0',
                }}
              >
                <span
                  className="material-symbols-outlined text-error mt-1"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
                <div>
                  <h3 className="font-headline-md text-[18px] font-bold leading-snug mb-1 text-error">
                    Emergency Warning
                  </h3>
                  <p className="font-body-md text-body-md opacity-90">
                    You have selected symptoms that may require immediate medical attention. If you are
                    currently experiencing these symptoms, please call emergency services or visit the nearest
                    emergency room immediately.
                  </p>
                  <label className="flex items-start gap-2 mt-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={emergencyAcknowledged}
                      onChange={(e) => {
                        setEmergencyAcknowledged(e.target.checked);
                        if (e.target.checked) setErrors((prev) => ({ ...prev, emergencyAcknowledged: '' }));
                      }}
                      className="mt-1"
                    />
                    <span className="font-label-md text-label-md font-semibold">
                      I understand and will seek appropriate medical attention if needed.
                    </span>
                  </label>
                </div>
              </div>
            </div>
            {errors.emergencyAcknowledged && (
              <p className="font-label-sm text-label-sm text-danger mt-3">{errors.emergencyAcknowledged}</p>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <Link
                to="/assessment/medical-history"
                className="font-label-md text-label-md text-text-secondary hover:text-primary transition-colors flex items-center gap-2 px-6 py-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back
              </Link>
              <button
                disabled={isContinuing}
                onClick={async () => {
                  const validation = validateStage3(assessmentData, emergencyAcknowledged);
                  setErrors(validation.errors);
                  if (!validation.valid) return;
                  setIsContinuing(true);
                  try {
                    await saveStage('STAGE_3_SYMPTOMS', true);
                    navigate('/assessment/review');
                  } catch {
                    // toast + retry action already surfaced by AssessmentSessionContext
                  } finally {
                    setIsContinuing(false);
                  }
                }}
                className="font-label-md text-label-md bg-primary text-on-primary rounded-xl px-6 py-3 flex items-center gap-2 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60"
              >
                {isContinuing ? <Spinner size={18} /> : null}
                Continue to Review
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Right Sidebar - Summary */}
          <div className="lg:col-span-3">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 shadow-sm sticky top-28">
              <h2 className="font-headline-md text-headline-md text-text-primary mb-6">Summary</h2>

              {/* Symptom Count */}
              <div className="text-center mb-6">
                <p className="font-display-lg text-display-lg text-primary">{totalCount}</p>
                <p className="font-label-md text-label-md text-text-secondary">Symptoms Selected</p>
              </div>

              {/* Categories Affected */}
              <div className="mb-6">
                <h3 className="font-label-md text-label-md text-text-secondary mb-3">Categories Affected</h3>
                {affectedCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {affectedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container font-label-sm text-label-sm text-on-secondary-container"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {categories.find((c) => c.label === cat)?.icon}
                        </span>
                        {cat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-label-sm text-label-sm text-text-tertiary">No categories selected</p>
                )}
              </div>

              {/* Risk Status */}
              <div>
                <h3 className="font-label-md text-label-md text-text-secondary mb-3">Risk Status</h3>
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-md text-label-md font-bold ${
                    riskLevel === 'High Risk'
                      ? 'bg-error-container text-error'
                      : riskLevel === 'Moderate'
                        ? 'bg-warning-container text-warning'
                        : 'bg-surface-container-high text-text-secondary'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {riskLevel === 'High Risk'
                      ? 'error'
                      : riskLevel === 'Moderate'
                        ? 'warning'
                        : 'check_circle'}
                  </span>
                  {riskLevel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav activeItem="Wizard" />
    </div>
  );
}
