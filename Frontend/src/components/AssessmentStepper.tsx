interface AssessmentStepperProps {
  currentStep: number;
  completionPercent: string;
}

const steps = [
  { number: 1, label: 'Basic Profile' },
  { number: 2, label: 'Medical History' },
  { number: 3, label: 'Symptoms' },
  { number: 4, label: 'Review' },
];

export default function AssessmentStepper({
  currentStep,
  completionPercent,
}: AssessmentStepperProps) {
  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isFuture = step.number > currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md font-bold ${
                    isCompleted
                      ? 'bg-success text-on-primary'
                      : isCurrent
                        ? 'bg-success text-on-primary'
                        : 'bg-surface-container-highest text-on-surface-variant'
                  }`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-[18px]">
                      check
                    </span>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`font-label-sm text-label-sm mt-1 whitespace-nowrap ${
                    isFuture ? 'text-text-tertiary' : 'text-text-primary'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div className="h-0.5 w-full rounded-full bg-surface-container-highest">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        step.number < currentStep
                          ? 'bg-success w-full'
                          : 'w-0'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className="h-full bg-success rounded-full transition-all duration-500"
          style={{ width: completionPercent }}
        />
      </div>
    </div>
  );
}
