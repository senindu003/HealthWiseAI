import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteAnalysis, deleteRecommendation, loadDashboard } from "../lib/api";

const formatDate = (value) => value ? new Date(value).toLocaleString() : "Not available";

function RecordDialog({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" />
    <section className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
      <header className="flex items-start justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-5 text-white"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-300">HealthWise records</p><h2 className="mt-1 text-xl font-black">{title}</h2><p className="mt-1 text-sm text-slate-300">{subtitle}</p></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-xl">×</button></header>
      <div className="overflow-y-auto p-6">{children}</div>
    </section>
  </div>;
}

function SetRecord({ set, onOpen, onDeleteSet, onDeleteAnalysis, showAnalysis }) {
  const analysis = set.analyses?.find((item) => item.analysisType === "SET");
  const status = set.analysisStatus || "PENDING";
  const badge = status === "COMPLETE" ? "bg-emerald-100 text-emerald-800" : status === "PARTIAL" ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-800";
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><p className="text-sm font-black text-slate-900">Created {formatDate(set.recommendation.generatedAt)}</p><span className={`rounded-full px-3 py-1 text-xs font-black ${badge}`}>{status.toLowerCase()}</span></div>
    <p className="mt-3 text-sm leading-6 text-slate-600">{set.recommendation.summary}</p>
    <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Recommended tests · {(set.recommendation.recommendations || []).length}</p><p className="mt-2 text-sm text-slate-700">{(set.recommendation.recommendations || []).map((test) => test.test_name || test.name).filter(Boolean).join(" · ") || "No tests recorded"}</p></div>
    <p className="mt-3 text-sm text-slate-600"><b>{set.reports?.length || 0}</b> report{set.reports?.length === 1 ? "" : "s"} uploaded{status === "PENDING" ? " — attach the remaining test reports to unlock combined analysis." : ""}</p>
    {showAnalysis && analysis && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"><p className="font-bold text-slate-800">{analysis.analysis?.overall_status?.title || "Saved report analysis"}</p><p className="mt-1 text-sm text-slate-600">{analysis.analysis?.summary || "Analysis saved for this set."}</p><p className="mt-2 text-xs text-slate-500">Saved {formatDate(analysis.analyzedAt)}</p></div>}
    <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => onOpen(set.recommendation.id)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Manage reports</button>{analysis && <button onClick={() => onDeleteAnalysis(analysis.id)} className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-bold text-amber-800">Delete analysis</button>}<button onClick={() => onDeleteSet(set.recommendation.id)} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700">Delete set</button></div>
  </article>;
}

function DashboardCard({ label, value, detail, tone, onClick }) {
  const line = tone === "amber" ? "bg-amber-500" : tone === "violet" ? "bg-violet-500" : "bg-emerald-500";
  return <button onClick={onClick} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><span className={`absolute inset-x-0 top-0 h-1 ${line}`} /><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-3 text-3xl font-black text-slate-950">{value}</p><p className="mt-2 text-sm leading-5 text-slate-500">{detail}</p><p className="mt-4 text-xs font-black text-indigo-600">View sets →</p></button>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState("");
  const refresh = async () => {
    const value = await loadDashboard();
    const questionnaire = value.latestQuestionnaire?.questionnaire;
    if (questionnaire) sessionStorage.setItem("user_historical_health_record", JSON.stringify(questionnaire));
    setData(value);
  };
  useEffect(() => { refresh().catch((err) => { if (err.status === 401) navigate("/signin", { replace: true }); else setError(err.message || "Dashboard data is unavailable."); }); }, [navigate]);
  const removeSet = async (id) => {
    if (!window.confirm("Permanently delete this recommendation set, every linked report PDF, and every linked analysis? This cannot be undone.")) return;
    try { await deleteRecommendation(id); await refresh(); setDialog(""); } catch (err) { setError(err.message || "Could not delete the recommendation set."); }
  };
  const removeAnalysis = async (id) => {
    if (!window.confirm("Permanently delete this saved analysis?")) return;
    try { await deleteAnalysis(id); await refresh(); setDialog(""); } catch (err) { setError(err.message || "Could not delete the analysis."); }
  };
  if (error) return <main className="mx-auto max-w-6xl p-8"><div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}</div></main>;
  if (!data) return <main className="mx-auto max-w-6xl p-8">Loading your dashboard...</main>;
  const pending = data.pendingRecommendations || [];
  const analysed = data.analysedRecommendations || [];
  const partial = analysed.filter((set) => set.analysisStatus === "PARTIAL");
  const complete = analysed.filter((set) => set.analysisStatus === "COMPLETE");
  const firstName = data.firstName?.trim();
  const records = dialog === "pending" ? pending : dialog === "partial" ? partial : complete;
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-black tracking-tight text-slate-950">{firstName ? `Welcome ${firstName}!` : "Welcome!"}</h1><p className="mt-1 text-sm text-slate-500">Your active recommendations and report analyses, securely organised by set.</p></div><div className="flex gap-3"><button onClick={() => { sessionStorage.removeItem("healthwise_form_data"); navigate("/assessment/profile"); }} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">New assessment</button><button onClick={() => navigate("/recommendations")} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">Manage reports</button></div></header>
    <section className="grid gap-5 md:grid-cols-3"><DashboardCard label="Pending recommendation sets" value={data.pendingRecommendationCount ?? pending.length} detail="Sets still missing high-priority reports or a saved meta-analysis." tone="amber" onClick={() => setDialog("pending")} /><DashboardCard label="Partial meta-analyses" value={data.partialAnalysisCount ?? partial.length} detail="Analyses based on all high-priority reports, with other reports still outstanding." tone="violet" onClick={() => setDialog("partial")} /><DashboardCard label="Complete meta-analyses" value={data.completeAnalysisCount ?? complete.length} detail="Analyses where every recommended test has an uploaded report." tone="emerald" onClick={() => setDialog("complete")} /></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-black text-slate-900">Recent activity</h2>{data.timelineSummary?.length ? <ul className="mt-4 divide-y divide-slate-100">{data.timelineSummary.slice(0, 8).map((item, index) => <li key={`${item.eventType || "event"}-${item.timestamp || index}`} className="py-3"><p className="text-sm font-bold text-slate-800">{item.title || "HealthWise activity"}</p><p className="text-xs text-slate-500">{item.description || item.eventType || "Saved record"}</p><p className="mt-1 text-[10px] font-semibold uppercase text-slate-400">{formatDate(item.timestamp)}</p></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No saved activity yet.</p>}</section>
    {dialog && <RecordDialog title={dialog === "pending" ? "Pending recommendation sets" : dialog === "partial" ? "Partial meta-analyses" : "Complete meta-analyses"} subtitle={dialog === "pending" ? "Upload high-priority reports to unlock meta-analysis; add every remaining report for completion." : dialog === "partial" ? "These analyses use the uploaded reports and remain incomplete until every recommended test report is attached." : "Every recommended test report was included in these saved analyses."} onClose={() => setDialog("")}>{records.length ? <div className="space-y-4">{records.map((set) => <SetRecord key={set.recommendation.id} set={set} showAnalysis={dialog !== "pending"} onOpen={(id) => navigate("/recommendations", { state: { recommendationId: id } })} onDeleteSet={removeSet} onDeleteAnalysis={removeAnalysis} />)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">No matching recommendation sets yet.</p>}</RecordDialog>}
  </main>;
}
