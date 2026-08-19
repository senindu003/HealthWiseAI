import React from "react";

export default function Footer() {
  return (
    <footer className="mt-auto flex justify-center border-t border-slate-200/80 bg-white px-4 py-4 font-sans sm:px-6 lg:px-8">
      <div className="space-y-1 text-center">
        <span className="text-xs font-black uppercase tracking-wider text-slate-900">
          HealthWise Diagnostics
        </span>

        <p className="mx-auto max-w-md text-center text-[10px] font-medium leading-relaxed text-slate-400">
          &copy; 2026 HealthWise AI Platform.
        </p>
      </div>
    </footer>
  );
}
