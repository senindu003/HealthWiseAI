import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  analyzeReports, deleteReport, getQuestionnaire, getReportFile,
  loadDashboard, saveAnalysis, uploadReport,
} from "../lib/api";

const statusStyle = {
  PENDING: "bg-amber-100 text-amber-800",
  PARTIAL: "bg-violet-100 text-violet-800",
  COMPLETE: "bg-emerald-100 text-emerald-800",
};

export default function ReportAnalysis() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboard, setDashboard] = useState(null);
  const [selectedId, setSelectedId] = useState(location.state?.recommendationId || sessionStorage.getItem("latest_recommendation_id") || "");
  const [files, setFiles] = useState([]);
  const [complete, setComplete] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const allSets = useMemo(() => {
    const unique = new Map();
    [...(dashboard?.pendingRecommendations || []), ...(dashboard?.analysedRecommendations || [])]
      .forEach((set) => unique.set(set.recommendation.id, set));
    return [...unique.values()];
  }, [dashboard]);
  const selected = allSets.find((set) => set.recommendation.id === selectedId) || null;

  async function refresh() {
    const value = await loadDashboard();
    setDashboard(value);
    const available = [...(value.pendingRecommendations || []), ...(value.analysedRecommendations || [])];
    if ((!selectedId || !available.some((set) => set.recommendation.id === selectedId)) && available[0]) {
      setSelectedId(available[0].recommendation.id);
    }
    return value;
  }
  useEffect(() => { refresh().catch((err) => setError(err.message || "Could not load saved recommendation sets.")); }, []);
  useEffect(() => {
    if (selected?.analyses?.[0]) {
      setResult(selected.analyses[0].analysis);
      setComplete(selected.analyses[0].complete);
    } else {
      setResult(null);
      setComplete(false);
    }
  }, [selectedId, selected?.analyses?.[0]?.id]);

  async function addReports(event) {
    event.preventDefault();
    if (!selected) return setError("Choose a saved recommendation set first.");
    if (!files.length) return setError("Choose one or more PDF laboratory reports.");
    if (files.some((file) => !file.name.toLowerCase().endsWith(".pdf"))) return setError("Only PDF laboratory reports can be uploaded.");
    setLoading(true); setError(""); setNotice("");
    try {
      for (const file of files) await uploadReport(selected.recommendation.id, file);
      setFiles([]); setResult(null); await refresh();
      setNotice("Reports saved to this recommendation set. Analyse them together when you are ready.");
    } catch (err) { setError(err.message || "Could not save the selected reports."); }
    finally { setLoading(false); }
  }

  async function analyse() {
    if (!selected?.reports?.length) return setError("Upload at least one report before starting analysis.");
    setLoading(true); setError(""); setNotice("");
    try {
      const questionnaire = await getQuestionnaire(selected.recommendation.questionnaireId);
      const storedFiles = await Promise.all(selected.reports.map((report) => getReportFile(report.id, report.reportName)));
      const analysis = await analyzeReports(storedFiles, questionnaire.questionnaire);
      await saveAnalysis({
        recommendationId: selected.recommendation.id,
        reportIds: selected.reports.map((report) => report.id),
        complete,
        analysis,
      });
      setResult(analysis); await refresh();
      setNotice(complete
        ? "Complete analysis saved for this recommendation set."
        : "Partial analysis saved. It covers only the reports uploaded so far.");
    } catch (err) { setError(err.message || "Report analysis failed. Please try again."); }
    finally { setLoading(false); }
  }

  async function removeReport(reportId) {
    if (!window.confirm("Remove this report? Any analysis for this set will be cleared because it would no longer cover all uploaded reports.")) return;
    setLoading(true); setError("");
    try { await deleteReport(reportId); setResult(null); await refresh(); setNotice("Report removed. Re-run analysis after updating the set."); }
    catch (err) { setError(err.message || "Could not remove the report."); }
    finally { setLoading(false); }
  }

  const findings = result?.abnormal_findings || [];
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-black text-slate-950">Recommendation-set report analysis</h1>
        <p className="mt-1 text-sm text-slate-500">Attach all available laboratory reports to one saved recommendation set, then analyse them together.</p>
      </header>
      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div>}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <label className="block text-sm font-bold text-slate-700">Recommendation set
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3">
            <option value="">Choose a saved recommendation set</option>
            {allSets.map((set) => <option key={set.recommendation.id} value={set.recommendation.id}>{new Date(set.recommendation.generatedAt).toLocaleDateString()} — {(set.recommendation.recommendations || []).length} recommended tests</option>)}
          </select>
        </label>
        {selected && <>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-black text-slate-900">Recommended tests</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[selected.analysisStatus]}`}>{selected.analysisStatus.toLowerCase()}</span></div>
            <p className="mt-2 text-sm text-slate-600">{selected.recommendation.summary}</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">{(selected.recommendation.recommendations || []).map((test, index) => <li key={`${test.test_name}-${index}`} className="rounded-lg bg-white p-3 text-sm font-semibold text-slate-700">{test.test_name || test.name || "Recommended test"}</li>)}</ul>
          </div>
          <form onSubmit={addReports} className="space-y-3">
            <label className="block text-sm font-bold text-slate-700">Add laboratory reports (PDF)
              <input multiple accept="application/pdf,.pdf" type="file" onChange={(event) => setFiles([...event.target.files])} className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm" />
            </label>
            <button disabled={loading} className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 disabled:opacity-60">{loading ? "Saving…" : "Save reports to this set"}</button>
          </form>
          <div className="rounded-2xl border border-slate-200 p-4">
            <h2 className="font-black text-slate-900">Uploaded reports ({selected.reports?.length || 0})</h2>
            {selected.reports?.length ? <ul className="mt-3 space-y-2">{selected.reports.map((report) => <li key={report.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span>{report.reportName}</span><button disabled={loading} onClick={() => removeReport(report.id)} className="text-xs font-bold text-rose-700">Remove</button></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No reports have been uploaded for this set.</p>}
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-slate-700"><input type="checkbox" checked={complete} onChange={(event) => setComplete(event.target.checked)} className="mt-1" /><span><b>I’ve uploaded all available reports.</b><br />Select this only when you are ready to mark the analysis complete. Otherwise, it remains partial and pending.</span></label>
          <button onClick={analyse} disabled={loading || !selected.reports?.length} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{loading ? "Analysing uploaded reports…" : "Analyse uploaded reports"}</button>
        </>}
      </section>
      {result && <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">{complete ? "Complete analysis" : "Partial analysis — uploaded reports only"}</span><h2 className="mt-4 text-xl font-black text-slate-900">{result.overall_status?.title || "Report review"}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{result.summary}</p>{!complete && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">This review covers only the reports currently uploaded for this recommendation set. It may not address every recommended test yet.</p>}<div className="mt-5 space-y-3">{findings.map((finding, index) => <article key={`${finding.parameter}-${index}`} className="rounded-xl border border-slate-100 p-4"><b>{finding.parameter}: {finding.value}</b><p className="mt-1 text-sm text-slate-600">{finding.explanation}</p></article>)}</div><p className="mt-5 border-t pt-4 text-xs text-slate-500">{result.disclaimer}</p></section>}
      <button onClick={() => navigate("/dashboard")} className="text-sm font-bold text-indigo-700">Back to dashboard</button>
    </main>
  );
}
