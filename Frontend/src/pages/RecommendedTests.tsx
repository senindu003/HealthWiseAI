import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import BottomNav from '../components/BottomNav';

const recommendationTabs = ['Recommended', 'Optional', 'Preventive'] as const;
const categoryTabs = [
  { label: 'Blood', icon: 'water_drop' },
  { label: 'Urine', icon: 'science' },
  { label: 'Hormones', icon: 'medication' },
  { label: 'Heart', icon: 'monitor_heart' },
] as const;

type RecommendationTab = (typeof recommendationTabs)[number];
type CategoryTab = (typeof categoryTabs)[number]['label'];

export default function RecommendedTests() {
  const navigate = useNavigate();
  const [activeRecommendation, setActiveRecommendation] = useState<RecommendationTab>('Recommended');
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('Blood');

  return (
    <div
      className="bg-background text-on-background min-h-screen"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <TopNav activeLink="Recommendations" />

      <main className="w-full max-w-[960px] mx-auto px-margin-mobile md:px-margin-desktop py-section-gap">
        {/* Header with search and avatar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary hidden md:block">
              Recommended Lab Tests
            </h1>
            <h1 className="text-headline-lg-mobile text-primary md:hidden">
              Recommended Lab Tests
            </h1>
            <p className="font-body-md text-body-md text-text-secondary mt-1">
              Based on your health profile and AI analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search tests..."
                className="form-input pl-10 !h-10 !rounded-xl !w-56 !text-sm"
              />
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-outline-variant/30 bg-surface-container-highest"></div>
          </div>
        </div>

        {/* Recommendation toggle tabs */}
        <div className="flex items-center gap-2 mb-6 bg-surface-container-low rounded-xl p-1.5">
          {recommendationTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveRecommendation(tab)}
              className={`flex-1 rounded-lg px-4 py-2.5 font-label-md text-label-md transition-all duration-200 ${
                activeRecommendation === tab
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-text-secondary hover:text-primary hover:bg-surface-container-lowest'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-1">
          {categoryTabs.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(cat.label)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 font-label-md text-label-md transition-all duration-200 whitespace-nowrap border ${
                activeCategory === cat.label
                  ? 'bg-primary-container text-on-primary-container border-primary/20'
                  : 'bg-surface-container-lowest text-text-secondary border-outline-variant/30 hover:bg-surface-container-low'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {cat.icon}
              </span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Test Cards */}
        <div className="space-y-6">
          {/* Complete Blood Count */}
          <div className="bg-surface-container-lowest rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-outline-variant/20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-on-primary-container"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    water_drop
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-primary">
                    Complete Blood Count
                  </h3>
                  <p className="font-label-sm text-label-sm text-text-tertiary mt-0.5">CBC</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-3 py-1 text-danger font-label-sm text-label-sm border border-danger/20">
                <span className="material-symbols-outlined text-[14px]">priority_high</span>
                High Priority
              </span>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="font-label-sm text-label-sm text-text-tertiary uppercase tracking-wider mb-1">
                  Priority
                </p>
                <p className="font-label-md text-label-md text-text-primary font-bold">High</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="font-label-sm text-label-sm text-text-tertiary uppercase tracking-wider mb-1">
                  Reason
                </p>
                <p className="font-label-md text-label-md text-text-primary font-bold">
                  General Health Check
                </p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4 sm:col-span-2">
                <p className="font-label-sm text-label-sm text-text-tertiary uppercase tracking-wider mb-1">
                  Clinical Explanation
                </p>
                <p className="font-body-md text-body-md text-text-secondary">
                  A complete blood count measures the levels of red blood cells, white blood cells,
                  and platelets. It is essential for detecting infections, anemia, clotting disorders,
                  and immune system conditions.
                </p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4 sm:col-span-2">
                <p className="font-label-sm text-label-sm text-text-tertiary uppercase tracking-wider mb-1">
                  Required for
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="inline-flex items-center rounded-full bg-primary-fixed/30 px-3 py-1 font-label-sm text-label-sm text-primary">
                    Anemia Screening
                  </span>
                  <span className="inline-flex items-center rounded-full bg-primary-fixed/30 px-3 py-1 font-label-sm text-label-sm text-primary">
                    Infection Detection
                  </span>
                  <span className="inline-flex items-center rounded-full bg-primary-fixed/30 px-3 py-1 font-label-sm text-label-sm text-primary">
                    Immune Health
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('#')}
                className="flex-1 bg-primary text-on-primary rounded-xl px-6 py-3 flex items-center justify-center gap-2 font-label-md text-label-md hover:-translate-y-0.5 transition-transform duration-200 shadow-sm hover:shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                Book Test
              </button>
              <button
                onClick={() => navigate('#')}
                className="flex-1 bg-surface-container-low text-primary border border-outline-variant/50 rounded-xl px-6 py-3 flex items-center justify-center gap-2 font-label-md text-label-md hover:bg-surface-container-lowest transition-colors duration-200"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Upload Report
              </button>
            </div>
          </div>

          {/* Lipid Profile */}
          <div className="bg-surface-container-lowest rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-outline-variant/20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-warning"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    water_drop
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-primary">Lipid Profile</h3>
                  <p className="font-label-sm text-label-sm text-text-tertiary mt-0.5">
                    Cholesterol Panel
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-warning font-label-sm text-label-sm border border-warning/20">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Medium Priority
              </span>
            </div>

            <p className="font-body-md text-body-md text-text-secondary mb-4">
              Measures total cholesterol, LDL, HDL, and triglycerides. Important for assessing
              cardiovascular risk especially given your elevated LDL levels.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 bg-primary text-on-primary rounded-xl px-6 py-3 flex items-center justify-center gap-2 font-label-md text-label-md hover:-translate-y-0.5 transition-transform duration-200 shadow-sm hover:shadow-md">
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                Book Test
              </button>
              <button className="flex-1 bg-surface-container-low text-primary border border-outline-variant/50 rounded-xl px-6 py-3 flex items-center justify-center gap-2 font-label-md text-label-md hover:bg-surface-container-lowest transition-colors duration-200">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Upload Report
              </button>
            </div>
          </div>

          {/* Thyroid Panel */}
          <div className="bg-surface-container-lowest rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-outline-variant/20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-text-secondary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    water_drop
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-primary">Thyroid Panel</h3>
                  <p className="font-label-sm text-label-sm text-text-tertiary mt-0.5">
                    TSH, T3, T4
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-3 py-1 text-text-secondary font-label-sm text-label-sm border border-outline-variant/30">
                <span className="material-symbols-outlined text-[14px]">remove</span>
                Low Priority
              </span>
            </div>

            <p className="font-body-md text-body-md text-text-secondary mb-4">
              Evaluates thyroid gland function by measuring hormone levels. Recommended as a
              baseline screening for metabolic health assessment.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 bg-primary text-on-primary rounded-xl px-6 py-3 flex items-center justify-center gap-2 font-label-md text-label-md hover:-translate-y-0.5 transition-transform duration-200 shadow-sm hover:shadow-md">
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                Book Test
              </button>
              <button className="flex-1 bg-surface-container-low text-primary border border-outline-variant/50 rounded-xl px-6 py-3 flex items-center justify-center gap-2 font-label-md text-label-md hover:bg-surface-container-lowest transition-colors duration-200">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Upload Report
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav activeItem="Reports" />
    </div>
  );
}
