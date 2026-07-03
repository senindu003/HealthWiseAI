import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import BottomNav from '../components/BottomNav';
import AssessmentStepper from '../components/AssessmentStepper';
import Spinner from '../components/Spinner';
import { useAssessmentSession } from '../context/AssessmentSessionContext';
import { useAutoSave } from '../hooks/useAutoSave';

function capitalize(value: string | null): string {
  if (!value) return 'Not provided';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function AssessmentReview() {
  const navigate = useNavigate();
  const { assessmentData, sessionId, saveStage, saveDraft, saveStatus, completeAssessment } = useAssessmentSession();
  useAutoSave(sessionId, 'STAGE_4_REVIEW', assessmentData);
  const { basicProfile, medicalHistory, symptoms } = assessmentData;
  const allSymptoms = Object.values(symptoms.symptomsByCategory).flat();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="text-text-primary min-h-screen flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      <TopNav activeLink="Assessment" />

      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8">
        {/* Stepper */}
        <div className="mb-8">
          <AssessmentStepper currentStep={4} completionPercent="100%" />
        </div>

        {/* Page Title */}
        <h1 className="font-display-lg text-display-lg text-primary mb-8">Review &amp; Confirmation</h1>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Content - 8 columns */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Card 1: Personal Information */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 shadow-sm relative">
              <Link
                to="/assessment/profile"
                className="absolute top-6 right-6 text-text-secondary hover:text-primary transition-colors flex items-center gap-1 font-label-md text-label-md"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span> Edit
              </Link>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-on-primary-container"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    person
                  </span>
                </div>
                <h2 className="font-headline-md text-headline-md text-text-primary">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="font-label-sm text-label-sm text-text-tertiary mb-1">Age / Gender</p>
                  <p className="font-body-md text-body-md text-text-primary">
                    {basicProfile.age ?? 'Not provided'}, {capitalize(basicProfile.gender)}
                  </p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-text-tertiary mb-1">Height / Weight</p>
                  <p className="font-body-md text-body-md text-text-primary">
                    {basicProfile.height ?? '—'} cm, {basicProfile.weight ?? '—'} kg
                    {basicProfile.bmi ? ` (BMI: ${basicProfile.bmi.toFixed(1)})` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Medical History & Vitals */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 shadow-sm relative">
              <Link
                to="/assessment/medical-history"
                className="absolute top-6 right-6 text-text-secondary hover:text-primary transition-colors flex items-center gap-1 font-label-md text-label-md"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span> Edit
              </Link>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-on-primary-container"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    medical_information
                  </span>
                </div>
                <h2 className="font-headline-md text-headline-md text-text-primary">
                  Medical History &amp; Vitals
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="font-label-sm text-label-sm text-text-tertiary mb-1">Pre-existing Conditions</p>
                  <p className="font-body-md text-body-md text-text-primary">
                    {medicalHistory.personalConditions.length > 0
                      ? medicalHistory.personalConditions.join(', ')
                      : 'None reported'}
                  </p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-text-tertiary mb-1">Current Medications</p>
                  <p className="font-body-md text-body-md text-text-primary">
                    {medicalHistory.medications.length > 0 ? medicalHistory.medications.join(', ') : 'None reported'}
                  </p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-text-tertiary mb-1">Allergies</p>
                  <p className="font-body-md text-body-md text-text-primary">
                    {medicalHistory.allergies.length > 0 ? medicalHistory.allergies.join(', ') : 'None reported'}
                  </p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-text-tertiary mb-1">Family History</p>
                  <p className="font-body-md text-body-md text-text-primary">
                    {medicalHistory.familyHistory.length > 0 ? medicalHistory.familyHistory.join(', ') : 'None reported'}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Symptoms */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 shadow-sm relative">
              <Link
                to="/assessment/symptoms"
                className="absolute top-6 right-6 text-text-secondary hover:text-primary transition-colors flex items-center gap-1 font-label-md text-label-md"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span> Edit
              </Link>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-on-primary-container"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    symptoms
                  </span>
                </div>
                <h2 className="font-headline-md text-headline-md text-text-primary">Symptoms</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {allSymptoms.length > 0 ? (
                  allSymptoms.map((symptom) => (
                    <span
                      key={symptom}
                      className="inline-flex items-center px-4 py-2 rounded-full bg-secondary-container font-label-md text-label-md text-on-secondary-container"
                    >
                      {symptom}
                    </span>
                  ))
                ) : (
                  <span className="font-label-sm text-label-sm text-text-tertiary">No symptoms reported</span>
                )}
              </div>
            </div>

            {/* Card 4: AI Recommendation Promo */}
            <div className="bg-primary text-surface-container-lowest rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-[60px]" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <h2 className="font-headline-md text-headline-md">AI-Powered Health Insights</h2>
              </div>
              <p className="font-body-md text-body-md opacity-90 mb-5 relative z-10">
                Our advanced AI engine will analyze your complete health profile, medical history, and
                reported symptoms to generate personalized clinical recommendations.
              </p>
              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="font-label-md text-label-md opacity-90">
                    Cross-reference symptoms with medical history
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="font-label-md text-label-md opacity-90">
                    Identify potential risk factors and correlations
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="font-label-md text-label-md opacity-90">
                    Generate prioritized, evidence-based recommendations
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - 4 columns */}
          <div className="lg:col-span-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 shadow-sm sticky top-28">
              <h2 className="font-headline-md text-headline-md text-text-primary mb-6">
                Data Readiness Summary
              </h2>

              {/* Checklist */}
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-success"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="font-label-md text-label-md text-text-primary">Profile Complete</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-success"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="font-label-md text-label-md text-text-primary">Vitals Logged</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-success"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="font-label-md text-label-md text-text-primary">Symptom Context</span>
                </div>
              </div>

              {/* Security Note */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-low mb-6">
                <span className="material-symbols-outlined text-text-tertiary mt-0.5">lock</span>
                <p className="font-label-sm text-label-sm text-text-tertiary">
                  Your data is encrypted and processed securely. We never share or sell personal health
                  information.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  disabled={isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await saveStage('STAGE_4_REVIEW', true);
                      await completeAssessment();
                      navigate('/analysis');
                    } catch {
                      // toast + retry action already surfaced by AssessmentSessionContext
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="w-full font-label-md text-label-md bg-primary text-on-primary rounded-xl px-6 py-4 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Spinner size={20} />
                  ) : (
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      auto_awesome
                    </span>
                  )}
                  Generate AI Recommendations
                </button>
                <button
                  onClick={() => saveDraft('STAGE_4_REVIEW')}
                  disabled={saveStatus === 'saving'}
                  className="w-full font-label-md text-label-md bg-surface border border-outline-variant/50 text-text-primary rounded-xl px-6 py-4 flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors duration-200 disabled:opacity-60"
                >
                  {saveStatus === 'saving' ? <Spinner size={20} /> : <span className="material-symbols-outlined text-[20px]">save</span>}
                  {saveStatus === 'saving' ? 'Saving…' : 'Save Draft'}
                </button>
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
