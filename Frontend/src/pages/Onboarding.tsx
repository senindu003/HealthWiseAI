import { useState } from "react";
import { useNavigate } from "react-router-dom";

const slides = [
  {
    icon: "monitor_heart",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Welcome to HealthWise AI",
    description:
      "Your intelligent health companion that transforms complex medical data into clear, actionable insights. Let's get you started on your journey to better health understanding.",
  },
  {
    icon: "psychology",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    title: "AI-Powered Insights",
    description:
      "Our advanced AI analyzes your health data with clinical-grade precision, providing personalized recommendations and tracking your wellness trends over time.",
  },
  {
    icon: "warning",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    title: "Clinical Disclaimer",
    description:
      "HealthWise AI is designed to assist and inform, not to replace professional medical advice. Always consult with qualified healthcare providers for medical decisions.",
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleStart = () => {
    navigate("/assessment/profile");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center font-body-md text-text-primary antialiased px-margin-mobile md:px-margin-desktop py-8"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      <div className="w-full max-w-lg">
        {/* Slider container */}
        <div className="bg-white rounded-3xl shadow-[0px_12px_32px_rgba(0,0,0,0.08)] border border-outline-variant/20 overflow-hidden">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                width: "300%",
                transform: `translateX(-${(currentSlide * 100) / 3}%)`,
              }}
            >
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className="w-full flex flex-col items-center text-center p-section-gap"
                  style={{ flex: "0 0 33.333%" }}
                >
                  {/* Icon circle */}
                  <div
                    className={`w-20 h-20 rounded-full ${slide.iconBg} flex items-center justify-center mb-gutter`}
                  >
                    <span
                      className={`material-symbols-outlined text-4xl ${slide.iconColor}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {slide.icon}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="font-headline-lg text-headline-lg text-primary mb-4">
                    {slide.title}
                  </h2>

                  {/* Description */}
                  <p className="font-body-md text-body-md text-text-secondary max-w-sm">
                    {slide.description}
                  </p>

                  {/* Disclaimer box (only on last slide) */}
                  {index === 2 && (
                    <div className="mt-6 w-full max-w-sm bg-red-50 border border-red-200/50 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-500 text-xl mt-0.5">
                          info
                        </span>
                        <p className="font-label-sm text-label-sm text-red-700 text-left">
                          By continuing, you acknowledge that this tool provides
                          informational insights only and is not a substitute for
                          professional medical diagnosis or treatment.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="px-section-gap pb-section-gap flex items-center justify-between">
            {/* Back button */}
            <div className="w-24">
              {currentSlide > 0 && (
                <button
                  onClick={handleBack}
                  className="font-label-md text-label-md text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">
                    arrow_back
                  </span>
                  Back
                </button>
              )}
            </div>

            {/* Dot indicators */}
            <div className="flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "bg-primary w-6"
                      : "bg-outline-variant w-2"
                  }`}
                />
              ))}
            </div>

            {/* Next / Start button */}
            <div className="w-24 flex justify-end">
              {currentSlide < slides.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="font-label-md text-label-md bg-primary text-on-primary rounded-lg px-5 py-2.5 flex items-center gap-1 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Next
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  className="font-label-md text-label-md bg-primary text-on-primary rounded-lg px-5 py-2.5 flex items-center gap-1 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Start
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
