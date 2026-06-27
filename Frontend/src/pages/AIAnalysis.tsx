import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Step {
  label: string;
  icon: string;
  state: 'pending' | 'active' | 'completed';
}

export default function AIAnalysis() {
  const navigate = useNavigate();
  const [progressWidth, setProgressWidth] = useState('0%');
  const [steps, setSteps] = useState<Step[]>([
    { label: 'Reading Profile', icon: 'person_search', state: 'pending' },
    { label: 'Evaluating Risks', icon: 'analytics', state: 'pending' },
    { label: 'Checking Guidelines', icon: 'fact_check', state: 'pending' },
    { label: 'Generating Recommendations', icon: 'auto_awesome', state: 'pending' },
  ]);

  useEffect(() => {
    // Start progress bar animation
    const progressTimer = setTimeout(() => {
      setProgressWidth('100%');
    }, 50);

    // Step 1: appears at 0.5s, completed immediately
    const step1Timer = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, state: 'completed' } : s))
      );
    }, 500);

    // Step 2: appears at 2s, active
    const step2Timer = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => (i === 1 ? { ...s, state: 'active' } : s))
      );
    }, 2000);

    // Step 2 completes, Step 3 active at 3.5s
    const step3Timer = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => {
          if (i === 1) return { ...s, state: 'completed' };
          if (i === 2) return { ...s, state: 'active' };
          return s;
        })
      );
    }, 3500);

    // Step 3 completes, Step 4 active at 5s
    const step4Timer = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => {
          if (i === 2) return { ...s, state: 'completed' };
          if (i === 3) return { ...s, state: 'active' };
          return s;
        })
      );
    }, 5000);

    // Step 4 completes at 6.5s
    const step4CompleteTimer = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => (i === 3 ? { ...s, state: 'completed' } : s))
      );
    }, 6500);

    // Navigate after 7s
    const navTimer = setTimeout(() => {
      navigate('/recommended-tests');
    }, 7000);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      clearTimeout(step4Timer);
      clearTimeout(step4CompleteTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div className="bg-background min-h-screen flex flex-col font-body-md text-text-primary antialiased overflow-hidden">
      <main className="flex-grow flex items-center justify-center relative p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto h-screen">
        {/* Background blurred circles */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
          <div className="w-[800px] h-[800px] bg-tertiary-container/5 rounded-full blur-3xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="w-[600px] h-[600px] bg-primary-fixed/20 rounded-full blur-3xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="z-10 w-full max-w-3xl flex flex-col items-center gap-section-gap">
          {/* AI Core Animation */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border border-tertiary-container/20 ai-pulse"
              style={{ animationDelay: '0s' }}
            ></div>
            <div
              className="absolute inset-4 rounded-full border border-tertiary-container/30 ai-pulse"
              style={{ animationDelay: '0.5s' }}
            ></div>
            <div
              className="absolute inset-8 rounded-full border border-tertiary-container/40 ai-pulse"
              style={{ animationDelay: '1s' }}
            ></div>
            <div className="relative w-32 h-32 bg-surface-container-lowest rounded-full shadow-[0px_12px_32px_rgba(0,0,0,0.08)] border border-outline-variant/30 flex items-center justify-center z-20">
              <div className="absolute inset-0 bg-gradient-to-tr from-tertiary-container to-primary-container rounded-full opacity-10"></div>
              <span
                className="material-symbols-outlined text-[48px] text-tertiary-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                psychology
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-4">
            <h1 className="font-display-lg text-display-lg text-primary hidden md:block">
              Analyzing Profile
            </h1>
            <h1 className="text-headline-lg-mobile text-primary md:hidden">
              Analyzing Profile
            </h1>
            <p className="font-body-lg text-body-lg text-text-secondary">
              HealthWise AI is synthesizing clinical data...
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-md bg-surface-container-high rounded-full h-2 overflow-hidden shadow-inner">
            <div
              className="bg-tertiary-container h-full rounded-full transition-all duration-[6500ms] linear"
              style={{ width: progressWidth }}
            ></div>
          </div>

          {/* Timeline steps in glass panel */}
          <div className="w-full max-w-lg glass-panel rounded-2xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
            <div className="relative pl-8 space-y-5 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-surface-container-high">
              {steps.map((step) => (
                <div
                  key={step.label}
                  className={`flex items-center gap-3 transition-all duration-500 ${
                    step.state === 'pending' ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {/* Indicator */}
                  <div className="absolute left-0">
                    {step.state === 'completed' ? (
                      <div className="w-6 h-6 rounded-full bg-success/10 border-2 border-success flex items-center justify-center">
                        <span className="material-symbols-outlined text-success text-[14px]">
                          check
                        </span>
                      </div>
                    ) : step.state === 'active' ? (
                      <div className="w-6 h-6 rounded-full border-2 border-tertiary-container flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-surface-container-high bg-surface-container-high"></div>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {step.icon}
                  </span>
                  <span
                    className={`font-label-md text-label-md ${
                      step.state === 'completed'
                        ? 'text-success'
                        : step.state === 'active'
                          ? 'text-tertiary-container'
                          : 'text-text-tertiary'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
