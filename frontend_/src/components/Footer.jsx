import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white mt-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Licensing & Corporate Cryptography Parameters Checkpoints */}
        <div className="text-center md:text-left space-y-1">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            HealthWise Diagnostics Architecture
          </span>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-md">
            &copy; 2026 HealthWise AI Platform. Managed data states are securely
            encapsulated locally via system telemetry models.
          </p>
        </div>

        {/* Compliance Link Tree Arrays */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <a
            href="#"
            className="hover:text-indigo-600 transition-colors focus:outline-none"
          >
            Clinical Guardrails
          </a>
          <span className="text-slate-200 select-none hidden sm:inline">
            &bull;
          </span>
          <a
            href="#"
            className="hover:text-indigo-600 transition-colors focus:outline-none"
          >
            HIPAA Infrastructure Status
          </a>
          <span className="text-slate-200 select-none hidden sm:inline">
            &bull;
          </span>
          <a
            href="#"
            className="hover:text-indigo-600 transition-colors focus:outline-none"
          >
            Data Privacy Ledger
          </a>
        </div>
      </div>
    </footer>
  );
}
