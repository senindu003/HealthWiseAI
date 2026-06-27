import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import BottomNav from '../components/BottomNav';
import AssessmentStepper from '../components/AssessmentStepper';

interface Condition {
  id: string;
  label: string;
  icon: string;
}

const personalConditions: Condition[] = [
  { id: 'diabetes', label: 'Diabetes', icon: 'water_drop' },
  { id: 'hypertension', label: 'Hypertension', icon: 'monitor_heart' },
  { id: 'asthma', label: 'Asthma', icon: 'air' },
  { id: 'heart-disease', label: 'Heart Disease', icon: 'favorite' },
  { id: 'mental-health', label: 'Mental Health', icon: 'psychology' },
  { id: 'other', label: 'Other', icon: 'add' },
];

const familyConditions: Condition[] = [
  { id: 'cardiovascular', label: 'Cardiovascular', icon: 'favorite' },
  { id: 'cancer', label: 'Cancer', icon: 'coronavirus' },
  { id: 'diabetes-family', label: 'Diabetes', icon: 'water_drop' },
];

const allMedications = [
  'Lisinopril 10mg',
  'Aspirin 81mg',
  'Atorvastatin',
  'Metformin',
];

const allAllergies = [
  'Peanuts',
  'Penicillin',
  'Latex',
  'Pollen',
];

const labChips = [
  'Cholesterol',
  'Blood Sugar',
  'Kidney Function',
  'Liver Function',
  'Thyroid',
  'Other',
];

export default function AssessmentMedicalHistory() {
  const navigate = useNavigate();

  // Personal conditions (Hypertension pre-selected)
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set(['hypertension']));
  // Family history (Cardiovascular pre-selected)
  const [selectedFamilyHistory, setSelectedFamilyHistory] = useState<Set<string>>(new Set(['cardiovascular']));
  // Medications (Lisinopril pre-selected)
  const [selectedMedications, setSelectedMedications] = useState<Set<string>>(new Set(['Lisinopril 10mg']));
  const [medicationSearch, setMedicationSearch] = useState('');
  // Procedures
  const [majorSurgery, setMajorSurgery] = useState(true);
  const [hospitalization, setHospitalization] = useState(false);
  // Allergies (Peanuts pre-selected)
  const [selectedAllergies, setSelectedAllergies] = useState<Set<string>>(new Set(['Peanuts']));
  const [allergySearch, setAllergySearch] = useState('');
  // Lab history
  const [hasAbnormalLabs, setHasAbnormalLabs] = useState<boolean | null>(null);
  const [selectedLabs, setSelectedLabs] = useState<Set<string>>(new Set(['Blood Sugar']));

  const toggleItem = (set: Set<string>, id: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  // Sidebar computed values
  const medicationCount = selectedMedications.size;

  const knownConditionLabel = useMemo(() => {
    const labels: string[] = [];
    personalConditions.forEach((c) => {
      if (selectedConditions.has(c.id)) labels.push(c.label);
    });
    return labels.length > 0 ? labels.join(', ') : 'None selected';
  }, [selectedConditions]);

  const familyRiskLabel = useMemo(() => {
    const labels: string[] = [];
    familyConditions.forEach((c) => {
      if (selectedFamilyHistory.has(c.id)) labels.push(c.label);
    });
    return labels.length > 0 ? labels.join(', ') : 'None selected';
  }, [selectedFamilyHistory]);

  const filteredMedications = allMedications.filter((m) =>
    m.toLowerCase().includes(medicationSearch.toLowerCase())
  );

  const filteredAllergies = allAllergies.filter((a) =>
    a.toLowerCase().includes(allergySearch.toLowerCase())
  );

  return (
    <div className="text-text-primary min-h-screen flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      <TopNav activeLink="Assessment" />

      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-12 flex flex-col gap-section-gap pb-32 md:pb-12">
        {/* Header section */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-headline-lg-mobile md:text-headline-lg text-primary mb-2">Stage 2: Medical History</h1>
              <p className="font-body-md text-body-md text-text-secondary">Tell us about your medical background for a comprehensive analysis.</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-label-sm text-label-sm text-text-tertiary uppercase tracking-wider">40% Complete</span>
              <button className="px-4 py-2 rounded-lg border border-outline-variant/50 font-label-md text-label-md text-text-secondary hover:bg-surface-container-low transition-colors duration-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">save</span> Save Draft
              </button>
            </div>
          </div>
          <AssessmentStepper currentStep={2} completionPercent="40%" />
        </section>

        {/* Grid: 8-col form + 4-col sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left: Form cards */}
          <div className="lg:col-span-8 flex flex-col gap-8">

            {/* 1. Personal Medical Conditions */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 ambient-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">medical_information</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary">Personal Medical Conditions</h2>
                  <p className="font-label-sm text-label-sm text-text-tertiary">Select all that apply</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {personalConditions.map((condition) => {
                  const isSelected = selectedConditions.has(condition.id);
                  return (
                    <button
                      key={condition.id}
                      onClick={() => toggleItem(selectedConditions, condition.id, setSelectedConditions)}
                      className={`p-4 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-2 border-secondary bg-secondary/10'
                          : 'border-2 border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/60'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                          isSelected
                            ? 'bg-secondary text-surface-container-lowest'
                            : 'bg-surface-container-highest text-text-secondary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{condition.icon}</span>
                      </div>
                      <span
                        className={`font-label-md text-label-md block ${
                          isSelected ? 'text-secondary font-semibold' : 'text-text-primary'
                        }`}
                      >
                        {condition.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Family History */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 ambient-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">family_restroom</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary">Family History</h2>
                  <p className="font-label-sm text-label-sm text-text-tertiary">Conditions in your immediate family</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {familyConditions.map((condition) => {
                  const isSelected = selectedFamilyHistory.has(condition.id);
                  return (
                    <button
                      key={condition.id}
                      onClick={() => toggleItem(selectedFamilyHistory, condition.id, setSelectedFamilyHistory)}
                      className={`p-4 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-2 border-secondary bg-secondary/10'
                          : 'border-2 border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/60'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                          isSelected
                            ? 'bg-secondary text-surface-container-lowest'
                            : 'bg-surface-container-highest text-text-secondary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{condition.icon}</span>
                      </div>
                      <span
                        className={`font-label-md text-label-md block ${
                          isSelected ? 'text-secondary font-semibold' : 'text-text-primary'
                        }`}
                      >
                        {condition.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Current Medications */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 ambient-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">medication</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary">Current Medications</h2>
                  <p className="font-label-sm text-label-sm text-text-tertiary">Search and select your medications</p>
                </div>
              </div>

              <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-[20px]">search</span>
                <input
                  type="text"
                  className="form-input pl-10"
                  placeholder="Search medications..."
                  value={medicationSearch}
                  onChange={(e) => setMedicationSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {filteredMedications.map((med) => {
                  const isSelected = selectedMedications.has(med);
                  return (
                    <button
                      key={med}
                      onClick={() => toggleItem(selectedMedications, med, setSelectedMedications)}
                      className={`px-4 py-2 rounded-full font-label-md text-label-md transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-2 border-secondary bg-secondary/10 text-secondary font-semibold'
                          : 'border-2 border-outline-variant/30 text-text-primary hover:border-outline-variant/60'
                      }`}
                    >
                      {med}
                      {isSelected && (
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Medical Procedures */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 ambient-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">local_hospital</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary">Medical Procedures</h2>
                  <p className="font-label-sm text-label-sm text-text-tertiary">Past surgical and hospital history</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Major Surgery toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-text-secondary">surgical</span>
                    <span className="font-body-md text-body-md text-text-primary">Major Surgery</span>
                  </div>
                  <div
                    onClick={() => setMajorSurgery(!majorSurgery)}
                    className={`relative w-12 h-7 rounded-full cursor-pointer transition-colors duration-200 ${
                      majorSurgery ? 'bg-secondary' : 'bg-outline-variant/50'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                        majorSurgery ? 'translate-x-6' : 'left-1'
                      }`}
                      style={!majorSurgery ? { left: '4px' } : { left: '0px', transform: 'translateX(24px)' }}
                    />
                  </div>
                </div>

                {/* Hospitalization toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-text-secondary">hotel</span>
                    <span className="font-body-md text-body-md text-text-primary">Hospitalization</span>
                  </div>
                  <div
                    onClick={() => setHospitalization(!hospitalization)}
                    className={`relative w-12 h-7 rounded-full cursor-pointer transition-colors duration-200 ${
                      hospitalization ? 'bg-secondary' : 'bg-outline-variant/50'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200`}
                      style={!hospitalization ? { left: '4px' } : { left: '0px', transform: 'translateX(24px)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Allergies */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 ambient-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">warning</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary">Allergies</h2>
                  <p className="font-label-sm text-label-sm text-text-tertiary">Known allergies and sensitivities</p>
                </div>
              </div>

              <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-[20px]">search</span>
                <input
                  type="text"
                  className="form-input pl-10"
                  placeholder="Search allergies..."
                  value={allergySearch}
                  onChange={(e) => setAllergySearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {filteredAllergies.map((allergy) => {
                  const isSelected = selectedAllergies.has(allergy);
                  return (
                    <button
                      key={allergy}
                      onClick={() => toggleItem(selectedAllergies, allergy, setSelectedAllergies)}
                      className={`px-4 py-2 rounded-full font-label-md text-label-md transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-2 border-secondary bg-secondary/10 text-secondary font-semibold'
                          : 'border-2 border-outline-variant/30 text-text-primary hover:border-outline-variant/60'
                      }`}
                    >
                      {allergy}
                      {isSelected && (
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Laboratory History */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 ambient-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">biotech</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary">Laboratory History</h2>
                  <p className="font-label-sm text-label-sm text-text-tertiary">Recent lab work and results</p>
                </div>
              </div>

              <p className="font-body-md text-body-md text-text-primary mb-4">Have you had abnormal lab results?</p>

              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setHasAbnormalLabs(true)}
                  className={`px-6 py-2.5 rounded-xl font-label-md text-label-md transition-all duration-200 cursor-pointer ${
                    hasAbnormalLabs === true
                      ? 'bg-primary text-on-primary'
                      : 'border-2 border-outline-variant/30 text-text-primary hover:border-outline-variant/60'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setHasAbnormalLabs(false)}
                  className={`px-6 py-2.5 rounded-xl font-label-md text-label-md transition-all duration-200 cursor-pointer ${
                    hasAbnormalLabs === false
                      ? 'bg-primary text-on-primary'
                      : 'border-2 border-outline-variant/30 text-text-primary hover:border-outline-variant/60'
                  }`}
                >
                  No
                </button>
              </div>

              {hasAbnormalLabs && (
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <p className="font-label-md text-label-md text-text-secondary mb-3">Select affected areas:</p>
                  <div className="flex flex-wrap gap-3">
                    {labChips.map((lab) => {
                      const isSelected = selectedLabs.has(lab);
                      return (
                        <button
                          key={lab}
                          onClick={() => toggleItem(selectedLabs, lab, setSelectedLabs)}
                          className={`px-4 py-2 rounded-full font-label-md text-label-md transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-2 border-secondary bg-secondary/10 text-secondary font-semibold'
                              : 'border-2 border-outline-variant/30 text-text-primary hover:border-outline-variant/60'
                          }`}
                        >
                          {lab}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between">
              <Link
                to="/assessment/profile"
                className="px-6 py-3 rounded-xl border border-outline-variant/50 font-label-md text-label-md text-text-secondary hover:bg-surface-container-low transition-colors duration-200 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                Back to Profile
              </Link>
              <button
                onClick={() => navigate('/assessment/symptoms')}
                className="px-8 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity duration-200 flex items-center gap-2"
              >
                Continue to Symptoms
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Right: Live Analysis sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 bg-surface-container-lowest rounded-2xl p-6 ambient-shadow">
              {/* Header with pulse */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-secondary" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-secondary ai-pulse" />
                </div>
                <h3 className="font-headline-md text-headline-md text-primary">Live Analysis</h3>
              </div>

              {/* Semi-circle gauge */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-48 h-24 overflow-hidden">
                  <svg viewBox="0 0 200 100" className="w-full h-full">
                    {/* Background arc */}
                    <path
                      d="M 20 95 A 80 80 0 0 1 180 95"
                      fill="none"
                      stroke="#e0e3e5"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    {/* Filled arc - moderate risk ~60% */}
                    <path
                      d="M 20 95 A 80 80 0 0 1 180 95"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray="251.2"
                      strokeDashoffset="100"
                    />
                  </svg>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                    <span className="font-headline-md text-headline-md text-warning font-bold">Moderate</span>
                  </div>
                </div>
                <p className="font-label-sm text-label-sm text-text-tertiary mt-2">Overall Risk Assessment</p>
              </div>

              {/* Summary cards */}
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[18px]">monitor_heart</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-label-sm text-label-sm text-text-tertiary">Known Conditions</p>
                      <p className="font-label-md text-label-md text-text-primary font-semibold">{knownConditionLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-[18px]">medication</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-label-sm text-label-sm text-text-tertiary">Active Medications</p>
                      <p className="font-label-md text-label-md text-text-primary font-semibold">{medicationCount} Reported</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[18px]">family_restroom</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-label-sm text-label-sm text-text-tertiary">Family Risk Factors</p>
                      <p className="font-label-md text-label-md text-text-primary font-semibold">{familyRiskLabel}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNav activeItem="Wizard" />
      <Footer />
    </div>
  );
}
