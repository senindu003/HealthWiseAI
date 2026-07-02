import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import BottomNav from '../components/BottomNav';
import AssessmentStepper from '../components/AssessmentStepper';
import Spinner from '../components/Spinner';
import { useAssessmentSession } from '../context/AssessmentSessionContext';
import { useAutoSave } from '../hooks/useAutoSave';
import { validateStage1 } from '../utils/assessmentValidation';

export default function AssessmentProfile() {
  const navigate = useNavigate();
  const { assessmentData, updateSection, sessionId, saveStage } = useAssessmentSession();
  const { saveStatus, saveNow } = useAutoSave(sessionId, 'STAGE_1_BASIC_PROFILE', assessmentData);
  const { basicProfile, lifestyle } = assessmentData;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isContinuing, setIsContinuing] = useState(false);

  // Biometrics state (sourced from the shared assessment session, autosaved)
  const age = basicProfile.age ?? '';
  const gender = basicProfile.gender ?? '';
  const height = basicProfile.height ?? '';
  const weight = basicProfile.weight ?? '';
  const setAge = (v: number | '') => updateSection('basicProfile', { age: v === '' ? null : v });
  const setGender = (v: string) => updateSection('basicProfile', { gender: v || null });
  const setHeight = (v: number | '') => updateSection('basicProfile', { height: v === '' ? null : v });
  const setWeight = (v: number | '') => updateSection('basicProfile', { weight: v === '' ? null : v });

  // Lifestyle state (sourced from the shared assessment session, autosaved)
  const smokingStatus = lifestyle.smokingStatus ?? '';
  const alcoholConsumption = lifestyle.alcoholConsumption ?? '';
  const exerciseHours = lifestyle.exerciseHoursPerWeek ?? 3;
  const sleepHours = lifestyle.sleepHours ?? '';
  const stressLevel = lifestyle.stressLevel ?? '';
  const setSmokingStatus = (v: string) => updateSection('lifestyle', { smokingStatus: v || null });
  const setAlcoholConsumption = (v: string) => updateSection('lifestyle', { alcoholConsumption: v || null });
  const setExerciseHours = (v: number) => updateSection('lifestyle', { exerciseHoursPerWeek: v });
  const setSleepHours = (v: number | '') => updateSection('lifestyle', { sleepHours: v === '' ? null : v });
  const setStressLevel = (v: string) => updateSection('lifestyle', { stressLevel: v || null });

  // BMI calculation
  const bmi = useMemo(() => {
    if (height && weight && height > 0) {
      const heightInMeters = Number(height) / 100;
      return Number(weight) / (heightInMeters * heightInMeters);
    }
    return null;
  }, [height, weight]);

  const bmiCategory = useMemo(() => {
    if (bmi === null) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: 'bg-inverse-primary text-primary', barColor: 'text-inverse-primary' };
    if (bmi < 25) return { label: 'Healthy', color: 'bg-secondary text-on-secondary', barColor: 'text-secondary' };
    if (bmi < 30) return { label: 'Overweight', color: 'bg-warning text-white', barColor: 'text-warning' };
    return { label: 'Obesity', color: 'bg-danger text-white', barColor: 'text-danger' };
  }, [bmi]);

  return (
    <div className="text-text-primary min-h-screen flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      <TopNav activeLink="Assessment" />

      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-12 flex flex-col gap-section-gap pb-32 md:pb-12">
        {/* Header section */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-headline-lg-mobile md:text-headline-lg text-primary mb-2">Health Assessment</h1>
              <p className="font-body-md text-body-md text-text-secondary">Let's build your comprehensive health profile.</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-label-sm text-label-sm text-text-tertiary uppercase tracking-wider">15% Complete</span>
              <button
                onClick={() => saveNow()}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 rounded-lg border border-outline-variant/50 font-label-md text-label-md text-text-secondary hover:bg-surface-container-low transition-colors duration-200 flex items-center gap-2 disabled:opacity-60"
              >
                {saveStatus === 'saving' ? <Spinner size={16} /> : <span className="material-symbols-outlined text-[18px]">save</span>}
                {saveStatus === 'saving' ? 'Saving…' : 'Save Draft'}
              </button>
            </div>
          </div>
          <AssessmentStepper currentStep={1} completionPercent="15%" />
        </section>

        {/* Grid: 8-col form + 4-col sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left: Form cards */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Biometrics card */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 ambient-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">person</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary">Biometrics</h2>
                  <p className="font-label-sm text-label-sm text-text-tertiary">Basic body measurements</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-text-secondary">Age</label>
                  <input
                    type="number"
                    className={`form-input ${errors.age ? 'border-danger' : ''}`}
                    placeholder="Enter your age"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                    min={0}
                    max={150}
                  />
                  {errors.age && <p className="font-label-sm text-label-sm text-danger">{errors.age}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-text-secondary">Gender</label>
                  <select
                    className={`form-select ${errors.gender ? 'border-danger' : ''}`}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not">Prefer not to say</option>
                  </select>
                  {errors.gender && <p className="font-label-sm text-label-sm text-danger">{errors.gender}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-text-secondary">Height (cm)</label>
                  <input
                    type="number"
                    className={`form-input ${errors.height ? 'border-danger' : ''}`}
                    placeholder="e.g. 175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                    min={0}
                    max={300}
                  />
                  {errors.height && <p className="font-label-sm text-label-sm text-danger">{errors.height}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-text-secondary">Weight (kg)</label>
                  <input
                    type="number"
                    className={`form-input ${errors.weight ? 'border-danger' : ''}`}
                    placeholder="e.g. 70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
                    min={0}
                    max={500}
                  />
                  {errors.weight && <p className="font-label-sm text-label-sm text-danger">{errors.weight}</p>}
                </div>
              </div>
            </div>

            {/* Lifestyle card */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 ambient-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">self_improvement</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary">Lifestyle</h2>
                  <p className="font-label-sm text-label-sm text-text-tertiary">Daily habits and routines</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-text-secondary">Smoking Status</label>
                  <select
                    className="form-select"
                    value={smokingStatus}
                    onChange={(e) => setSmokingStatus(e.target.value)}
                  >
                    <option value="">Select status</option>
                    <option value="never">Never smoked</option>
                    <option value="former">Former smoker</option>
                    <option value="current">Current smoker</option>
                    <option value="occasional">Occasional smoker</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-text-secondary">Alcohol Consumption</label>
                  <select
                    className="form-select"
                    value={alcoholConsumption}
                    onChange={(e) => setAlcoholConsumption(e.target.value)}
                  >
                    <option value="">Select consumption</option>
                    <option value="none">None</option>
                    <option value="occasional">Occasional (1-2/week)</option>
                    <option value="moderate">Moderate (3-5/week)</option>
                    <option value="heavy">Heavy (6+/week)</option>
                  </select>
                </div>

                {/* Exercise slider - full width */}
                <div className="flex flex-col gap-3 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="font-label-md text-label-md text-text-secondary">Weekly Exercise</label>
                    <span className="font-label-md text-label-md text-primary font-semibold">{exerciseHours} hrs/week</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    value={exerciseHours}
                    onChange={(e) => setExerciseHours(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-surface-container-highest"
                  />
                  <div className="flex justify-between">
                    <span className="font-label-sm text-label-sm text-text-tertiary">0 hrs</span>
                    <span className="font-label-sm text-label-sm text-text-tertiary">15 hrs</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-text-secondary">Sleep (hours/night)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 7"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value ? Number(e.target.value) : '')}
                    min={0}
                    max={24}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-text-secondary">Stress Level</label>
                  <select
                    className="form-select"
                    value={stressLevel}
                    onChange={(e) => setStressLevel(e.target.value)}
                  >
                    <option value="">Select level</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="very-high">Very High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Continue button */}
            <div className="flex justify-end">
              <button
                disabled={isContinuing}
                onClick={async () => {
                  const validation = validateStage1(assessmentData);
                  setErrors(validation.errors);
                  if (!validation.valid) return;
                  setIsContinuing(true);
                  try {
                    await saveStage('STAGE_1_BASIC_PROFILE', true);
                    navigate('/assessment/medical-history');
                  } catch {
                    // toast + retry action already surfaced by AssessmentSessionContext
                  } finally {
                    setIsContinuing(false);
                  }
                }}
                className="px-8 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity duration-200 flex items-center gap-2 disabled:opacity-60"
              >
                {isContinuing ? <Spinner size={18} /> : null}
                Continue to History
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Right: Live BMI sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 bg-surface-container-lowest rounded-2xl p-6 ambient-shadow">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary">monitor_weight</span>
                <h3 className="font-headline-md text-headline-md text-primary">BMI Calculator</h3>
              </div>

              {bmi !== null ? (
                <div className="flex flex-col items-center gap-4">
                  {/* BMI Value */}
                  <div className="text-center">
                    <p className="font-display-lg text-display-lg text-primary">{bmi.toFixed(1)}</p>
                    <span className={`inline-block mt-2 px-4 py-1 rounded-full font-label-md text-label-md ${bmiCategory?.color}`}>
                      {bmiCategory?.label}
                    </span>
                  </div>

                  {/* BMI Scale Bar */}
                  <div className="w-full mt-4">
                    <div className="flex w-full h-3 rounded-full overflow-hidden">
                      <div className="flex-1 bg-inverse-primary" />
                      <div className="flex-1 bg-secondary" />
                      <div className="flex-1 bg-warning" />
                      <div className="flex-1 bg-danger" />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="font-label-sm text-label-sm text-text-tertiary">&lt;18.5</span>
                      <span className="font-label-sm text-label-sm text-text-tertiary">18.5</span>
                      <span className="font-label-sm text-label-sm text-text-tertiary">25</span>
                      <span className="font-label-sm text-label-sm text-text-tertiary">30+</span>
                    </div>
                    {/* BMI position indicator */}
                    <div className="relative w-full h-2 mt-1">
                      <div
                        className="absolute w-3 h-3 rounded-full bg-primary border-2 border-white shadow-md -top-0.5"
                        style={{
                          left: `${Math.min(Math.max(((bmi - 15) / 25) * 100, 0), 100)}%`,
                          transform: 'translateX(-50%)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Info note */}
                  <div className="w-full mt-4 p-4 rounded-xl bg-primary-fixed/30">
                    <div className="flex gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">info</span>
                      <p className="font-label-sm text-label-sm text-text-secondary">
                        BMI is a screening tool. It doesn't diagnose body fatness or health. Consult your healthcare provider for a complete assessment.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center">
                    <span className="material-symbols-outlined text-text-tertiary text-[32px]">scale</span>
                  </div>
                  <p className="font-body-md text-body-md text-text-tertiary text-center">
                    Enter your height and weight to see your BMI calculation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNav activeItem="Wizard" />
      <Footer />
    </div>
  );
}
