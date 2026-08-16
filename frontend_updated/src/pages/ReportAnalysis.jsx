import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeReport, saveReport } from "../lib/api";

const readQuestionnaire = () => {
  const raw =
    sessionStorage.getItem("healthwise_current_questionnaire") ||
    sessionStorage.getItem("healthwise_questionnaire") ||
    sessionStorage.getItem("healthwise_form_data");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function ReportAnalysis() {
  const navigate = useNavigate();
  const questionnaire = useMemo(readQuestionnaire, []);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("active_report_analysis"));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!questionnaire)
      return setError(
        "Complete the health assessment before analysing a report.",
      );
    if (!file || file.type !== "application/pdf")
      return setError("Select a PDF laboratory report.");
    setLoading(true);
    try {
      const analysis = await analyzeReport(file, questionnaire);
      setResult(analysis);
      sessionStorage.setItem(
        "active_report_analysis",
        JSON.stringify(analysis),
      );
    } catch (err) {
      setError(err.message || "Report analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!sessionStorage.getItem("accessToken"))
      return setError("Sign in before saving your report analysis.");
    if (!result) return setError("Analyse a report before saving.");
    setSaving(true);
    setError("");
    try {
      await saveReport({
        recommendationId: sessionStorage.getItem("latest_recommendation_id"),
        reportName: file?.name || "Laboratory report.pdf",
        reportType: "Laboratory Report",
        reportAnalysis: result,
      });
      setNotice("Report analysis saved to your history.");
    } catch (err) {
      setError(err.message || "Could not save the report analysis.");
    } finally {
      setSaving(false);
    }
  }

  const abnormalFindings = result?.abnormal_findings || [];
  const lifestyleTips = [
    ...(result?.lifestyle_recommendations?.continue || []),
    ...(result?.lifestyle_recommendations?.improve || []),
  ];
  const doctorConsultation = result?.doctor_consultation;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-black text-slate-900">
          Laboratory Report Analysis
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a PDF report for a private, structured review. Your
          questionnaire is used only for context.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {notice}
        </div>
      )}

      <form
        onSubmit={submit}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <label className="block text-sm font-bold text-slate-700">
          Laboratory report (PDF)
          <input
            className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm font-medium placeholder:text-slate-400"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <button
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? "Analysing report..." : "Analyse report"}
        </button>
      </form>

      {loading && (
        <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-8 space-y-3">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-5/6 rounded bg-slate-100" />
        </div>
      )}

      {result && (
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${result.overall_status?.level === "normal" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
              >
                {result.overall_status?.title || "Report reviewed"}
              </span>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {result.summary}
              </p>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save analysis"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="font-bold text-slate-900">Abnormal findings</h2>
              {abnormalFindings.length ? (
                <div className="mt-3 space-y-3">
                  {abnormalFindings.map((item) => (
                    <article
                      key={item.parameter}
                      className="rounded-xl border border-amber-100 bg-amber-50 p-4"
                    >
                      <b>
                        {item.parameter}: {item.value}
                      </b>
                      <p className="text-xs text-slate-600">
                        Range: {item.reference_range} - {item.status}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {item.explanation}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  No abnormal findings were returned.
                </p>
              )}
            </div>

            <div>
              <h2 className="font-bold text-slate-900">Lifestyle guidance</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                {lifestyleTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
              <h2 className="mt-5 font-bold text-slate-900">
                Medical follow-up
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {doctorConsultation?.recommended
                  ? `${doctorConsultation.urgency}: ${doctorConsultation.reason}`
                  : doctorConsultation?.reason}
              </p>
            </div>
          </div>

          <p className="border-t pt-4 text-xs text-slate-400">
            {result.disclaimer}
          </p>
        </section>
      )}

      <button
        onClick={() => navigate("/recommendations")}
        className="text-sm font-bold text-indigo-600"
      >
        View recommendations
      </button>
    </main>
  );
}
