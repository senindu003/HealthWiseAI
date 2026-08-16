const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || "http://127.0.0.1:8000/api/v1";
const SPRING_BASE_URL = import.meta.env.VITE_SPRING_API_URL || "http://127.0.0.1:8080/api/v1";

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (response.ok) {
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  let message = "The request could not be completed.";
  try { const body = await response.json(); message = body.message || body.detail || message; } catch { /* non-JSON error */ }
  throw new ApiError(message, response.status);
}

function authHeaders(extra = {}) {
  const token = sessionStorage.getItem("accessToken");
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export const generateRecommendations = (questionnaire) => request(`${AI_BASE_URL}/recommendations`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(questionnaire),
});

export const analyzeReport = (reportFile, questionnaire) => {
  const data = new FormData();
  data.append("report_file", reportFile);
  data.append("questionnaire", JSON.stringify(questionnaire));
  return request(`${AI_BASE_URL}/report-analysis`, { method: "POST", body: data });
};

export const saveQuestionnaire = (questionnaire) => request(`${SPRING_BASE_URL}/questionnaires`, {
  method: "POST",
  headers: authHeaders({ "Content-Type": "application/json" }),
  body: JSON.stringify({ questionnaire }),
});

export const saveRecommendation = async ({ questionnaire, aiResponse }) => {
  const savedQuestionnaire = await saveQuestionnaire(questionnaire);
  return request(`${SPRING_BASE_URL}/recommendations`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      questionnaireId: savedQuestionnaire.id,
      summary: aiResponse.summary,
      recommendations: aiResponse.recommendations || [],
    }),
  });
};

export const saveReport = async ({ recommendationId = null, reportName, reportType = "Laboratory Report", reportAnalysis }) => {
  const report = await request(`${SPRING_BASE_URL}/reports`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ recommendationId, reportName, reportType }),
  });
  const analysis = await request(`${SPRING_BASE_URL}/analysis`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ reportId: report.id, analysis: reportAnalysis }),
  });
  return { report, analysis };
};

export const loadDashboard = () => request(`${SPRING_BASE_URL}/dashboard`, {
  headers: authHeaders(),
});

export const login = (email, password) => request(`${SPRING_BASE_URL}/auth/login`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
});

export const register = ({ firstName, lastName, email, password }) => request(`${SPRING_BASE_URL}/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ firstName, lastName, email, password }),
});

export const getCurrentUser = (accessToken) => request(`${SPRING_BASE_URL}/users/me`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
