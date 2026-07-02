import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="text-text-primary antialiased font-body-md bg-background hero-bg min-h-screen flex flex-col">
      <header className="w-full px-margin-desktop py-6 max-w-container-max mx-auto flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            health_and_safety
          </span>
          <span className="font-headline-md text-headline-md text-primary tracking-tight">
            HealthWise AI
          </span>
        </div>
        <div className="hidden md:flex gap-4">
          <button
            onClick={() => navigate("/signin")}
            className="font-label-md text-label-md text-text-secondary hover:text-primary transition-colors px-4 py-2"
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/signin", { state: { openRegister: true } })}
            className="font-label-md text-label-md bg-primary text-on-primary rounded-lg px-6 py-2 hover:-translate-y-0.5 transition-transform duration-200 shadow-sm hover:shadow-md"
          >
            Get Started
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full pb-section-gap relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-section-gap items-center w-full mt-12 lg:mt-0">
          <div className="flex flex-col gap-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-outline-variant/30 w-fit shadow-sm">
              <span
                className="material-symbols-outlined text-success text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              <span className="font-label-sm text-label-sm text-text-secondary">
                HIPAA Compliant &amp; Clinical Grade
              </span>
            </div>

            <h1 className="font-display-lg text-display-lg text-primary leading-tight">
              Medical precision, <br />
              powered by AI.
            </h1>

            <p className="font-body-lg text-body-lg text-text-secondary max-w-xl">
              Experience clarity in your health journey. HealthWise AI
              transforms complex medical reports and assessments into
              actionable, personalized insights with clinical-grade accuracy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button
                onClick={() => navigate("/signin", { state: { openRegister: true } })}
                className="font-label-md text-label-md bg-primary text-on-primary rounded-lg px-8 py-4 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_16px_rgba(0,15,34,0.15)] hover:shadow-[0_12px_24px_rgba(0,15,34,0.2)]"
              >
                Get Started
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </button>
              <button
                onClick={() => navigate("/onboarding")}
                className="font-label-md text-label-md bg-white border border-outline-variant/50 text-text-primary rounded-lg px-8 py-4 flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors duration-200 shadow-sm"
              >
                View Demo
              </button>
            </div>

            <div className="mt-8 flex items-center gap-4 text-text-tertiary">
              <span className="material-symbols-outlined text-xl">lock</span>
              <p className="font-label-sm text-label-sm">
                Your data is strictly confidential. We never share or sell
                personal health information.
              </p>
            </div>
          </div>

          {/* Hero Visual Bento Cards */}
          <div className="relative w-full h-full min-h-[500px] flex items-center justify-center">
            <div className="absolute inset-0 bg-primary-fixed/20 rounded-full blur-[100px] -z-10 mix-blend-multiply"></div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg relative z-0">
              {/* Card 1: Heart Rate */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0px_12px_32px_rgba(0,0,0,0.06)] border border-outline-variant/20 flex flex-col gap-4 transform translate-y-8 hover:-translate-y-1 transition-transform duration-300">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-on-primary-container"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    monitor_heart
                  </span>
                </div>
                <div>
                  <h3 className="font-label-md text-label-md text-text-secondary mb-1">
                    Heart Rate Variability
                  </h3>
                  <p className="font-headline-md text-headline-md text-primary">
                    64{" "}
                    <span className="font-body-md text-body-md text-text-tertiary">
                      ms
                    </span>
                  </p>
                </div>
                <div className="h-8 w-full rounded bg-surface-container-low overflow-hidden relative">
                  <div className="absolute bottom-0 left-0 h-1/2 w-1/3 bg-success rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-1/3 h-3/4 w-1/3 bg-success rounded-t-lg"></div>
                  <div className="absolute bottom-0 left-2/3 h-full w-1/3 bg-success rounded-tl-lg"></div>
                </div>
              </div>

              {/* Card 2: AI Analysis */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0px_12px_32px_rgba(0,0,0,0.06)] border border-outline-variant/20 flex flex-col gap-4 transform -translate-y-4 hover:-translate-y-6 transition-transform duration-300">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-on-secondary-container"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    psychology
                  </span>
                </div>
                <div>
                  <h3 className="font-label-md text-label-md text-text-secondary mb-1">
                    AI Analysis
                  </h3>
                  <p className="font-headline-md text-headline-md text-primary leading-tight">
                    Optimal
                  </p>
                </div>
                <p className="font-label-sm text-label-sm text-text-tertiary mt-auto">
                  Based on last 30 days
                </p>
              </div>

              {/* Card 3: Full width */}
              <div className="col-span-2 bg-surface-container-lowest rounded-2xl p-6 shadow-[0px_12px_32px_rgba(0,0,0,0.08)] border border-outline-variant/20 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-primary-fixed rounded-full blur-[40px] -z-10 opacity-50"></div>
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-on-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    description
                  </span>
                </div>
                <div className="flex-grow">
                  <h3 className="font-label-md text-label-md text-primary font-bold">
                    Comprehensive Blood Panel
                  </h3>
                  <p className="font-label-sm text-label-sm text-text-secondary">
                    Processed &amp; Analyzed successfully.
                  </p>
                </div>
                <span className="material-symbols-outlined text-success">
                  check_circle
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full mt-section-gap border-t border-outline-variant/20 bg-surface-container-lowest py-base px-margin-desktop max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center z-10 relative">
        <div className="font-label-md text-label-md font-bold text-primary mb-4 md:mb-0">
          HealthWise AI
        </div>
        <div className="font-label-sm text-label-sm text-text-tertiary mb-4 md:mb-0">
          &copy; 2026 HealthWise AI. Clinical use only.
        </div>
        <div className="flex gap-6">
          <a
            className="font-label-sm text-label-sm text-text-tertiary hover:text-primary transition-colors opacity-80 hover:opacity-100"
            href="#"
          >
            Clinical Disclaimers
          </a>
          <a
            className="font-label-sm text-label-sm text-text-tertiary hover:text-primary transition-colors opacity-80 hover:opacity-100"
            href="#"
          >
            System Status
          </a>
          <a
            className="font-label-sm text-label-sm text-text-tertiary hover:text-primary transition-colors opacity-80 hover:opacity-100"
            href="#"
          >
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
}
