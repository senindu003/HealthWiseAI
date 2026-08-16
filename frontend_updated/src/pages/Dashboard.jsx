import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadDashboard } from "../lib/api";

const formatDate = (value) =>
  value ? new Date(value).toLocaleString() : "Not available";
const excerpt = (value, length = 110) =>
  !value
    ? "No saved record."
    : value.length > length
      ? `${value.slice(0, length)}…`
      : value;

function DashboardCard({ label, value, detail, tone = "indigo", onClick }) {
  const accent = {
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    violet: "bg-violet-500",
    sky: "bg-sky-500",
    rose: "bg-rose-500",
    cyan: "bg-cyan-500",
    indigo: "bg-indigo-500",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-200"
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{detail}</p>
      <span className="mt-4 block text-xs font-black text-indigo-600">
        View details →
      </span>
    </button>
  );
}

function RecordDialog({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
      />
      <section className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">
                HealthWise record
              </p>
              <h2 className="mt-1 text-xl font-black">{title}</h2>
              <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-xl hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>
        <div className="overflow-y-auto p-6">{children}</div>
      </section>
    </div>
  );
}

function Empty({ children }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

function RecommendationRecords({ records }) {
  if (!records.length)
    return <Empty>No recommendations have been saved yet.</Empty>;
  return (
    <div className="space-y-4">
      {records.map((record) => (
        <article
          key={record.id || record.generatedAt}
          className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-black text-slate-900">
              Personalised recommendations
            </h3>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700">
              {(record.recommendations || []).length} tests
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Saved {formatDate(record.generatedAt)}
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {record.summary}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(record.recommendations || []).map((item, index) => (
              <div
                key={index}
                className="rounded-xl border border-white bg-white p-3"
              >
                <p className="font-bold text-slate-800">
                  {item.test_name || item.name || "Recommended test"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.category || "General"}
                  {item.priority ? ` · ${item.priority}` : ""}
                </p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function AnalysisRecords({ records }) {
  if (!records.length)
    return <Empty>No report analyses have been saved yet.</Empty>;
  return (
    <div className="space-y-4">
      {records.map((record) => {
        const analysis = record.analysis || record;
        return (
          <article
            key={record.id || record.analyzedAt}
            className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-black text-slate-900">
                {analysis.overall_status?.title || "AI report analysis"}
              </h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-emerald-700">
                {analysis.overall_status?.level || "saved"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Saved {formatDate(record.analyzedAt)}
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {analysis.summary || "Saved report analysis."}
            </p>
            {(analysis.abnormal_findings || []).length > 0 && (
              <div className="mt-4 space-y-2">
                {analysis.abnormal_findings.map((finding, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white bg-white p-3"
                  >
                    <p className="font-bold text-slate-800">
                      {finding.parameter}{" "}
                      <span className="font-medium text-slate-500">
                        {finding.value}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {finding.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ReportRecords({ records, analyses }) {
  if (!records.length) return <Empty>No reports have been saved yet.</Empty>;
  return (
    <div className="space-y-4">
      {records.map((report) => {
        const linked = analyses.find(
          (analysis) => analysis.reportId === report.id,
        )?.analysis;
        return (
          <article
            key={report.id || report.uploadedAt}
            className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5"
          >
            <h3 className="font-black text-slate-900">{report.reportName}</h3>
            <p className="mt-2 text-xs text-slate-500">
              {report.reportType || "Laboratory Report"} · Saved{" "}
              {formatDate(report.uploadedAt)}
            </p>
            {linked ? (
              <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">
                {linked.summary || linked.overall_status?.title}
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No linked analysis is available yet.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState(null);

  useEffect(() => {
    let active = true;
    loadDashboard()
      .then((value) => {
        if (!active) return;
        const savedQuestionnaire = value.latestQuestionnaire?.questionnaire;
        if (savedQuestionnaire) {
          sessionStorage.setItem("user_historical_health_record", JSON.stringify(savedQuestionnaire));
        }
        setData(value);
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 401) navigate("/signin", { replace: true });
        else setError(err.message || "Dashboard data is unavailable.");
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (error)
    return (
      <main className="mx-auto max-w-6xl p-8">
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700"
        >
          {error}
        </div>
      </main>
    );
  if (!data)
    return (
      <main className="mx-auto max-w-6xl p-8">Loading your dashboard...</main>
    );

  const recommendations =
    data.recentRecommendations ||
    (data.latestRecommendation ? [data.latestRecommendation] : []);
  const reports =
    data.recentReports || (data.latestReport ? [data.latestReport] : []);
  const analyses =
    data.recentAnalyses || (data.latestAnalysis ? [data.latestAnalysis] : []);
  const dialog = {
    pending: {
      title: "Pending recommendations",
      subtitle: "Saved recommendation records",
      content: <RecommendationRecords records={recommendations} />,
    },
    completed: {
      title: "Completed analyses",
      subtitle: "Saved AI report analyses",
      content: <AnalysisRecords records={analyses} />,
    },
    recommendation: {
      title: "Latest recommendation",
      subtitle: "Latest personalised laboratory guidance",
      content: <RecommendationRecords records={recommendations.slice(0, 1)} />,
    },
    report: {
      title: "Latest report",
      subtitle: "Latest report and linked analysis",
      content: (
        <ReportRecords records={reports.slice(0, 1)} analyses={analyses} />
      ),
    },
  }[openDialog];

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Your health dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your saved clinical history and insights, securely loaded from
            MongoDB.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              sessionStorage.removeItem("healthwise_form_data");
              navigate("/assessment/profile");
            }}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20"
          >
            New assessment
          </button>
          <button
            onClick={() => navigate("/report-analysis")}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
          >
            Analyse report
          </button>
        </div>
      </header>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Pending recommendations"
          value={data.pendingRecommendationCount ?? 0}
          tone="amber"
          detail="Saved recommendations without a report analysis"
          onClick={() => setOpenDialog("pending")}
        />
        <DashboardCard
          label="Completed analyses"
          value={data.completedRecommendationCount ?? 0}
          detail="Saved report analyses"
          tone="emerald"
          onClick={() => setOpenDialog("completed")}
        />
        <DashboardCard
          label="Latest recommendation"
          value={data.latestRecommendation ? "Available" : "None"}
          detail={excerpt(data.latestRecommendation?.summary)}
          tone="violet"
          onClick={() => setOpenDialog("recommendation")}
        />
        <DashboardCard
          label="Latest report"
          value={data.latestReport ? "Available" : "None"}
          detail={data.latestReport?.reportName || "No saved report"}
          tone="sky"
          onClick={() => setOpenDialog("report")}
        />
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-black text-slate-900">Recent activity</h2>
        {data.timelineSummary?.length ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {data.timelineSummary.slice(0, 8).map((item, index) => (
              <li
                key={`${item.eventType || "event"}-${item.timestamp || index}`}
                className="py-3"
              >
                <p className="text-sm font-bold text-slate-800">
                  {item.title || "HealthWise activity"}
                </p>
                <p className="text-xs text-slate-500">
                  {item.description || item.eventType || "Saved record"}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase text-slate-400">
                  {formatDate(item.timestamp)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No saved activity yet.</p>
        )}
      </section>
      {dialog && (
        <RecordDialog
          title={dialog.title}
          subtitle={dialog.subtitle}
          onClose={() => setOpenDialog(null)}
        >
          {dialog.content}
        </RecordDialog>
      )}
    </main>
  );
}
