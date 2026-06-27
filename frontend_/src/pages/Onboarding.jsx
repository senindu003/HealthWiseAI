import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const slides = [
  {
    icon: "🫀",
    iconBg: "bg-indigo-50 border-indigo-100 text-indigo-600",
    title: "Welcome to HealthWise AI",
    description:
      "An intelligent health companion designed to transform complex, multi-stage biometric data models into clear, scannable structural insights and clinical evaluation maps.",
  },
  {
    icon: "🧠",
    iconBg: "bg-emerald-50 border-emerald-100 text-emerald-600",
    title: "AI-Powered Guidance",
    description:
      "Processes systemic diagnostic indicators with clinical-grade parameter checking, offering clear cross-references and tracking risk trends dynamically over active sessions.",
  },
  {
    icon: "⚠️",
    iconBg: "bg-rose-50 border-rose-100 text-rose-600",
    title: "Clinical Reference Guard",
    description:
      "Designed to assist analytical reporting structures and optimize preventative insights. This mapping portal operates strictly as an educational validation sandbox framework.",
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
    <div className="min-h-screen flex items-center justify-center font-sans text-slate-800 antialiased bg-gradient-to-tr from-slate-50 to-slate-100 p-6 relative overflow-hidden">
      {/* Ambient background blur blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-0">
        <div className="w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl absolute -translate-x-1/3" />
        <div className="w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl absolute translate-x-1/3" />
      </div>

      <div className="w-full max-w-lg z-10">
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col justify-between p-6 md:p-8 space-y-8">
          {/* Animated Carousel Track Frame */}
          <div className="overflow-hidden relative w-full">
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
                  className="w-full flex flex-col items-center text-center px-2 space-y-4"
                  style={{ flex: "0 0 33.333%" }}
                >
                  {/* Styled Rounded Icon Frame */}
                  <div
                    className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-2xl shadow-sm shadow-slate-100 ${slide.iconBg}`}
                  >
                    {slide.icon}
                  </div>

                  {/* Copy Writing Elements Header */}
                  <div className="space-y-2">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      {slide.title}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                      {slide.description}
                    </p>
                  </div>

                  {/* Warning Box Footer Callout Block */}
                  {index === 2 && (
                    <div className="w-full max-w-sm bg-rose-50/60 border border-rose-100 rounded-2xl p-4 text-left animate-fadeIn">
                      <div className="flex gap-3 text-xs leading-relaxed font-medium text-rose-800">
                        <span className="text-base select-none">ℹ️</span>
                        <p>
                          By advancing forward, you acknowledge that this tool
                          compiles informational guidelines parameter models and
                          cannot substitute for physical primary practitioner
                          health network diagnoses.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Navigational Control Footers Element Row */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            {/* Backward Navigation trigger */}
            <div className="w-20">
              {currentSlide > 0 && (
                <button
                  onClick={handleBack}
                  className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1 group"
                >
                  <span className="group-hover:-translate-x-0.5 transition-transform">
                    ←
                  </span>{" "}
                  Back
                </button>
              )}
            </div>

            {/* Pagination Indicators Grid Dots */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? "bg-indigo-600 w-5" : "bg-slate-200 w-1.5"}`}
                />
              ))}
            </div>

            {/* Forward/Start Operation Controls Wrapper */}
            <div className="w-20 flex justify-end">
              {currentSlide < slides.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-sm transition-all hover:scale-[1.01]"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-md shadow-indigo-600/10 transition-all hover:scale-[1.01]"
                >
                  Start
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
