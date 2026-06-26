import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import BottomNav from '../components/BottomNav';

const biomarkers = [
  {
    name: 'Hemoglobin A1c',
    value: '5.8%',
    status: 'warning' as const,
    icon: 'arrow_upward',
  },
  {
    name: 'LDL Cholesterol',
    value: '130 mg/dL',
    status: 'danger' as const,
    icon: 'warning',
  },
  {
    name: 'HDL Cholesterol',
    value: '55 mg/dL',
    status: 'success' as const,
    icon: 'check_circle',
  },
  {
    name: 'Fasting Glucose',
    value: '95 mg/dL',
    status: 'success' as const,
    icon: 'check_circle',
  },
];

const statusBars = [
  { label: 'Cardiovascular Risk', level: 'Moderate', status: 'warning' as const, width: 'w-2/3' },
  { label: 'Metabolic Health', level: 'Elevated', status: 'warning' as const, width: 'w-1/2' },
  { label: 'Kidney Function', level: 'Normal', status: 'success' as const, width: 'w-1/4' },
];

const statusColors = {
  success: {
    text: 'text-success',
    bg: 'bg-success',
    bgLight: 'bg-success/10',
    border: 'border-success/30',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning',
    bgLight: 'bg-warning/10',
    border: 'border-warning/30',
  },
  danger: {
    text: 'text-danger',
    bg: 'bg-danger',
    bgLight: 'bg-danger/10',
    border: 'border-danger/30',
  },
};

export default function AIReport() {
  return (
    <div className="bg-background text-text-primary antialiased flex flex-col min-h-screen">
      <TopNav activeLink="Reports" />

      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap flex flex-col gap-gutter lg:flex-row items-start">
        {/* Column 1: Biomarkers */}
        <div className="w-full lg:w-1/3 bg-surface-container-lowest rounded-[24px] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-6 border border-outline-variant/30">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              biotech
            </span>
            <h2 className="font-headline-md text-headline-md text-primary">Biomarkers</h2>
          </div>

          <div className="space-y-4">
            {biomarkers.map((marker) => {
              const colors = statusColors[marker.status];
              return (
                <div
                  key={marker.name}
                  className={`flex items-center justify-between p-4 rounded-xl ${colors.bgLight} border ${colors.border}`}
                >
                  <div>
                    <p className="font-label-md text-label-md text-text-secondary">{marker.name}</p>
                    <p className="font-headline-md text-headline-md text-text-primary mt-1">
                      {marker.value}
                    </p>
                  </div>
                  <span
                    className={`material-symbols-outlined ${colors.text}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {marker.icon}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Status Overview */}
        <div className="w-full lg:w-1/3 bg-surface-container-lowest rounded-[24px] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-6 border border-outline-variant/30">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              monitoring
            </span>
            <h2 className="font-headline-md text-headline-md text-primary">Status Overview</h2>
          </div>

          <div className="space-y-6">
            {statusBars.map((bar) => {
              const colors = statusColors[bar.status];
              return (
                <div key={bar.label}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-label-md text-label-md text-text-secondary">{bar.label}</p>
                    <span className={`font-label-sm text-label-sm ${colors.text}`}>
                      {bar.level}
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-3 overflow-hidden">
                    <div
                      className={`${colors.bg} h-full rounded-full ${bar.width} transition-all duration-700`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: AI Analysis */}
        <div className="w-full lg:w-1/3 bg-surface-container-lowest rounded-[24px] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-6 border border-outline-variant/30">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
            <h2 className="font-headline-md text-headline-md text-primary">AI Analysis</h2>
          </div>

          <div className="space-y-4">
            {/* Important Findings */}
            <div className="rounded-xl bg-blue-50 border border-blue-200/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="material-symbols-outlined text-blue-600 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  info
                </span>
                <h3 className="font-label-md text-label-md text-blue-800 font-bold">
                  Important Findings
                </h3>
              </div>
              <p className="font-body-md text-body-md text-blue-700">
                Hemoglobin A1c at 5.8% indicates pre-diabetic range. LDL cholesterol at 130 mg/dL is
                borderline high and may benefit from dietary modifications.
              </p>
            </div>

            {/* Potential Concerns */}
            <div className="rounded-xl bg-red-50 border border-red-200/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="material-symbols-outlined text-red-600 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
                <h3 className="font-label-md text-label-md text-red-800 font-bold">
                  Potential Concerns
                </h3>
              </div>
              <p className="font-body-md text-body-md text-red-700">
                Combined elevated A1c and LDL levels suggest increased cardiovascular risk. Recommend
                follow-up testing in 3 months and lifestyle interventions.
              </p>
            </div>

            {/* Consult Button */}
            <Link
              to="#"
              className="w-full mt-4 bg-primary text-on-primary rounded-xl px-6 py-4 flex items-center justify-center gap-2 font-label-md text-label-md hover:-translate-y-0.5 transition-transform duration-200 shadow-sm hover:shadow-md"
            >
              <span className="material-symbols-outlined text-[20px]">medical_services</span>
              Consult with Physician
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav activeItem="Reports" />
    </div>
  );
}
