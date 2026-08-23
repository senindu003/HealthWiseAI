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

export const analyzeReports = (reportFiles, questionnaire) => {
  const data = new FormData();
  reportFiles.forEach((reportFile) => data.append("report_files", reportFile));
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

export const uploadReport = (recommendationId, testName, reportFile) => {
  const data = new FormData();
  data.append("recommendationId", recommendationId);
  data.append("testName", testName);
  data.append("reportFile", reportFile);
  return request(`${SPRING_BASE_URL}/reports`, {
    method: "POST",
    headers: authHeaders(),
    body: data,
  });
};

export const listReports = (recommendationId) => request(
  `${SPRING_BASE_URL}/reports?recommendationId=${encodeURIComponent(recommendationId)}`,
  { headers: authHeaders() },
);

export const getReportFile = async (reportId, reportName = "laboratory-report.pdf") => {
  const response = await fetch(`${SPRING_BASE_URL}/reports/${reportId}/file`, { headers: authHeaders() });
  if (!response.ok) {
    let message = "The saved report could not be read.";
    try { message = (await response.json()).message || message; } catch { /* non-JSON error */ }
    throw new ApiError(message, response.status);
  }
  return new File([await response.blob()], reportName, { type: "application/pdf" });
};

export const deleteReport = (reportId) => request(`${SPRING_BASE_URL}/reports/${reportId}`, {
  method: "DELETE", headers: authHeaders(),
});

export const saveAnalysis = ({ recommendationId, reportIds, complete, analysis }) =>
  request(`${SPRING_BASE_URL}/analysis`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ recommendationId, reportIds, complete, analysis }),
  });

export const deleteAnalysis = (analysisId) => request(`${SPRING_BASE_URL}/analysis/${analysisId}`, {
  method: "DELETE", headers: authHeaders(),
});

export const deleteRecommendation = (recommendationId) => request(`${SPRING_BASE_URL}/recommendations/${recommendationId}`, {
  method: "DELETE", headers: authHeaders(),
});

export const getQuestionnaire = (questionnaireId) => request(`${SPRING_BASE_URL}/questionnaires/${questionnaireId}`, {
  headers: authHeaders(),
});

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
