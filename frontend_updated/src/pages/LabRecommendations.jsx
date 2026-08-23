import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  analyzeReports,
  deleteReport,
  getQuestionnaire,
  getReportFile,
  loadDashboard,
  saveAnalysis,
  saveRecommendation,
  uploadReport,
} from "../lib/api";

const CATEGORY_ICONS = {
  hematology: "science",
  cardiovascular: "monitor_heart",
  endocrinology: "water_drop",
  chemistry: "biotech",
};
const normalize = (value = "") =>
  value.trim().replace(/\s+/g, " ").toLowerCase();
const testName = (test) => test.test_name || test.name || "Recommended test";

function AnalysisDialog({ analysis, onClose }) {
  if (!analysis) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        aria-label="Close analysis"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />
      <section className="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
        <header className="flex items-start justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-5 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-300">
              HealthWise analysis
            </p>
            <h2 className="mt-1 text-xl font-black">
              {analysis.overall_status?.title || "Combined report review"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-xl"
          >
            ×
          </button>
        </header>
        <div className="space-y-5 p-6">
          <p className="text-sm leading-7 text-slate-700">{analysis.summary}</p>
          {(analysis.abnormal_findings || []).length > 0 && (
            <div>
              <h3 className="font-black text-slate-900">
                Findings requiring attention
              </h3>
              <div className="mt-3 space-y-3">
                {analysis.abnormal_findings.map((finding, index) => (
                  <article
                    key={`${finding.parameter}-${index}`}
                    className="rounded-2xl border border-amber-100 bg-amber-50 p-4"
                  >
                    <p className="font-bold text-slate-900">
                      {finding.parameter}: {finding.value}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {finding.explanation}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">Lifestyle guidance</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {[
                  ...(analysis.lifestyle_recommendations?.continue || []),
                  ...(analysis.lifestyle_recommendations?.improve || []),
                ].map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">Medical follow-up</h3>
              <p className="mt-2 text-sm text-slate-600">
                {analysis.doctor_consultation?.reason ||
                  "No follow-up guidance returned."}
              </p>
            </div>
          </div>
          <p className="border-t pt-4 text-xs leading-5 text-slate-500">
            {analysis.disclaimer}
          </p>
        </div>
      </section>
    </div>
  );
}

export default function LabRecommendations() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputs = useRef({});
  const [searchQuery, setSearchQuery] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [selectedId, setSelectedId] = useState(
    location.state?.recommendationId || "",
  );
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dialogAnalysis, setDialogAnalysis] = useState(null);
  const sessionRecommendation = useMemo(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("active_lab_recommendations") || "null",
      );
    } catch {
      return null;
    }
  }, []);

  const sets = useMemo(() => {
    const unique = new Map();
    [
      ...(dashboard?.pendingRecommendations || []),
      ...(dashboard?.analysedRecommendations || []),
    ].forEach((set) => unique.set(set.recommendation.id, set));
    return [...unique.values()];
  }, [dashboard]);
  const selectedSet =
    sets.find((set) => set.recommendation.id === selectedId) || null;
  const activeRecommendation =
    selectedSet?.recommendation || (!selectedId ? sessionRecommendation : null);
  const activeTests = useMemo(() => {
    const unique = new Map();
    (activeRecommendation?.recommendations || []).forEach((test) =>
      unique.set(normalize(testName(test)), test),
    );
    return [...unique.values()];
  }, [activeRecommendation]);
  const reports = selectedSet?.reports || [];
  const analyses = selectedSet?.analyses || [];
  const savedSetAnalysis =
    analyses.find((analysis) => analysis.analysisType === "SET")?.analysis ||
    null;
  const allReportsAttached = Boolean(
    selectedSet &&
    activeTests.length &&
    activeTests.every((test) =>
      reports.some(
        (report) =>
          normalize(report.recommendedTestName) === normalize(testName(test)),
      ),
    ),
  );

  const visibleTests = useMemo(
    () =>
      activeTests.filter((test) => {
        const query = searchQuery.toLowerCase();
        return (
          !query ||
          [
            testName(test),
            test.category,
            test.priority,
            test.personalized_explanation,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(query),
          )
        );
      }),
    [activeTests, searchQuery],
  );

  const refresh = async () => {
    const value = await loadDashboard();
    setDashboard(value);
    const available = [
      ...(value.pendingRecommendations || []),
      ...(value.analysedRecommendations || []),
    ];
    const preferred = sessionStorage.getItem("latest_recommendation_id");
    if (
      !selectedId ||
      !available.some((set) => set.recommendation.id === selectedId)
    ) {
      setSelectedId(
        available.find((set) => set.recommendation.id === preferred)
          ?.recommendation.id ||
          available[0]?.recommendation.id ||
          "",
      );
    }
    return value;
  };
  useEffect(() => {
    refresh().catch((err) =>
      setError(err.message || "Could not load your saved recommendation sets."),
    );
  }, []);

  async function saveCurrentSet() {
    const rawQuestionnaire = sessionStorage.getItem("healthwise_questionnaire");
    if (
      !sessionRecommendation ||
      !rawQuestionnaire ||
      !sessionStorage.getItem("accessToken")
    )
      return setError(
        "Sign in and complete an assessment before saving recommendations.",
      );
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const saved = await saveRecommendation({
        questionnaire: JSON.parse(rawQuestionnaire),
        aiResponse: sessionRecommendation,
      });
      sessionStorage.setItem("latest_recommendation_id", saved.id);
      setSelectedId(saved.id);
      await refresh();
      setNotice(
        "Recommendation set saved. Attach a PDF report to each relevant test card.",
      );
    } catch (err) {
      setError(err.message || "Could not save this recommendation set.");
    } finally {
      setBusy("");
    }
  }

  async function attachReport(test, file) {
    if (!file || !selectedSet) return;
    if (!file.name.toLowerCase().endsWith(".pdf"))
      return setError("Upload a PDF laboratory report.");
    const name = testName(test);
    setBusy(`upload:${name}`);
    setError("");
    setNotice("");
    try {
      await uploadReport(selectedSet.recommendation.id, name, file);
      await refresh();
      setNotice(
        `Report attached to ${name}. ${allReportsAttached ? "You can now analyse the set." : "Upload the remaining recommended reports to enable analysis."}`,
      );
    } catch (err) {
      setError(err.message || "Could not attach this report.");
    } finally {
      setBusy("");
      if (fileInputs.current[name]) fileInputs.current[name].value = "";
    }
  }

  async function analyseSet() {
    if (!selectedSet || !allReportsAttached) return;
    setBusy("analyse");
    setError("");
    setNotice("");
    try {
      const questionnaire = await getQuestionnaire(
        selectedSet.recommendation.questionnaireId,
      );
      const reportFiles = await Promise.all(
        reports.map((report) => getReportFile(report.id, report.reportName)),
      );
      const analysis = await analyzeReports(
        reportFiles,
        questionnaire.questionnaire,
      );
      await saveAnalysis({
        recommendationId: selectedSet.recommendation.id,
        reportIds: reports.map((report) => report.id),
        analysisType: "SET",
        complete: true,
        analysis,
      });
      await refresh();
      setDialogAnalysis(analysis);
      setNotice("Combined analysis saved for this recommendation set.");
    } catch (err) {
      setError(err.message || "Could not analyse the uploaded reports.");
    } finally {
      setBusy("");
    }
  }

  async function analyseSingleReport(report) {
    if (!selectedSet) return;
    setBusy(`analyse:${report.id}`);
    setError("");
    setNotice("");
    try {
      const questionnaire = await getQuestionnaire(
        selectedSet.recommendation.questionnaireId,
      );
      const reportFile = await getReportFile(report.id, report.reportName);
      const analysis = await analyzeReports(
        [reportFile],
        questionnaire.questionnaire,
      );
      await saveAnalysis({
        recommendationId: selectedSet.recommendation.id,
        reportIds: [report.id],
        analysisType: "INDIVIDUAL",
        complete: false,
        analysis,
      });
      await refresh();
      setDialogAnalysis(analysis);
      setNotice(`Analysis saved for ${report.reportName}.`);
    } catch (err) {
      setError(err.message || "Could not analyse this report.");
    } finally {
      setBusy("");
    }
  }

  async function removeReport(report) {
    if (
      !window.confirm(
        `Permanently remove ${report.reportName}? Its individual analysis and any combined set analysis will also be removed.`,
      )
    )
      return;
    setBusy(`remove:${report.id}`);
    setError("");
    setNotice("");
    try {
      await deleteReport(report.id);
      await refresh();
      setNotice(
        `${report.reportName} and analyses that depended on it were removed.`,
      );
    } catch (err) {
      setError(err.message || "Could not remove this report.");
    } finally {
      setBusy("");
    }
  }

  if (!activeRecommendation && dashboard)
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <h1 className="text-2xl font-black text-slate-900">
          No saved recommendations yet
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Complete an assessment to receive a new recommendation set.
        </p>
        <button
          onClick={() => navigate("/assessment/profile")}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
        >
          Start assessment
        </button>
      </main>
    );
  if (!activeRecommendation)
    return (
      <main className="mx-auto max-w-6xl p-8">Loading recommendations...</main>
    );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 md:px-8">
        <header>
          <h1 className="text-2xl font-black tracking-tight">
            Your recommended laboratory tests
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            {activeRecommendation.summary ||
              "Review each recommended test, attach its relevant laboratory report, and receive one combined analysis when every card is ready."}
          </p>
        </header>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
            Recommendation set
            <select
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setError("");
                setNotice("");
              }}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-bold text-slate-800"
            >
              <option value="">Current unsaved recommendations</option>
              {sets.map((set) => (
                <option
                  key={set.recommendation.id}
                  value={set.recommendation.id}
                >
                  {new Date(
                    set.recommendation.generatedAt,
                  ).toLocaleDateString()}{" "}
                  · {(set.recommendation.recommendations || []).length}{" "}
                  recommended tests
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {selectedSet
                ? `${reports.length} uploaded report${reports.length === 1 ? "" : "s"} across ${activeTests.length} required test cards.`
                : "Save this set to attach reports to its cards."}
            </p>
            {!selectedSet ? (
              <button
                onClick={saveCurrentSet}
                disabled={busy === "save"}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy === "save" ? "Saving…" : "Save recommendation set"}
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={analyseSet}
                  disabled={!allReportsAttached || Boolean(busy)}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === "analyse"
                    ? "Analysing all reports…"
                    : allReportsAttached
                      ? "Meta-analysis"
                      : "Upload all Reports to enable Meta-analysis"}
                </button>
                {savedSetAnalysis && (
                  <button
                    onClick={() => setDialogAnalysis(savedSetAnalysis)}
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    View meta-analysis
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
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
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-400">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search your recommended tests"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleTests.map((test, index) => {
            const name = testName(test);
            const attached = reports.filter(
              (report) =>
                normalize(report.recommendedTestName) === normalize(name),
            );
            const primaryReport = attached[0];
            const individual = primaryReport
              ? analyses.find(
                  (analysis) =>
                    analysis.analysisType === "INDIVIDUAL" &&
                    analysis.reportIds?.includes(primaryReport.id),
                )
              : null;
            const uploading = busy === `upload:${name}`;
            const icon = CATEGORY_ICONS[normalize(test.category)] || "science";
            return (
              <article
                key={`${name}-${index}`}
                className="flex flex-col justify-between rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                      <span className="material-symbols-outlined">{icon}</span>
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${attached.length ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                    >
                      {primaryReport ? "report attached" : "report needed"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      {name}
                    </h2>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {test.category || "General"} ·{" "}
                      {test.priority || "routine"}
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {test.personalized_explanation ||
                      "Recommended for your health profile."}
                  </p>
                  {primaryReport && (
                    <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700">
                      ✓ {primaryReport.reportName}
                    </p>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <input
                    ref={(element) => {
                      fileInputs.current[name] = element;
                    }}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(event) =>
                      attachReport(test, event.target.files?.[0])
                    }
                  />
                  <button
                    onClick={() =>
                      primaryReport
                        ? removeReport(primaryReport)
                        : fileInputs.current[name]?.click()
                    }
                    disabled={!selectedSet || Boolean(busy)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${primaryReport ? "border-rose-200 text-rose-700" : "border-indigo-200 bg-white text-indigo-700"}`}
                  >
                    {primaryReport
                      ? busy === `remove:${primaryReport.id}`
                        ? "Removing…"
                        : "Remove report"
                      : uploading
                      ? "Attaching report…"
                      : selectedSet
                        ? "Upload report"
                        : "Save set to upload reports"}
                  </button>
                  {primaryReport && (
                    <button
                      onClick={() => analyseSingleReport(primaryReport)}
                      disabled={Boolean(busy)}
                      className="rounded-xl text-indigo-600 px-3 py-2.5 text-xs font-bold bg-white disabled:opacity-50"
                    >
                      {busy === `analyse:${primaryReport.id}`
                        ? "Analysing…"
                        : "Analyse report"}
                    </button>
                  )}
                  {individual && (
                    <button
                      onClick={() => setDialogAnalysis(individual.analysis)}
                      className="rounded-xl border border-indigo-200 px-3 py-2.5 text-xs font-bold text-indigo-700"
                    >
                      View analysis
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
        {selectedSet && (
          <p className="text-center text-xs text-slate-400">
            Analysis combines every report attached to this selected
            recommendation set.
          </p>
        )}
      </main>
      <AnalysisDialog
        analysis={dialogAnalysis}
        onClose={() => setDialogAnalysis(null)}
      />
    </div>
  );
}
