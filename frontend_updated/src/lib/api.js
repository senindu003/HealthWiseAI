const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || "http://127.0.0.1:8000/api/v1";
const SPRING_BASE_URL = import.meta.env.VITE_SPRING_API_URL || "http://127.0.0.1:8080/api/v1";

export class ApiError extends Error {
  constructor(message, status, detail = null) { super(message); this.status = status; this.detail = detail; }
}

function readableApiError(body, fallback) {
  const detail = body?.message || body?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (!item || typeof item !== "object") return null;
        const field = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== "body").join(".")
          : "";
        return field ? `${field}: ${item.msg || "is invalid"}` : item.msg;
      })
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  return fallback;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (response.ok) {
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  let message = "The request could not be completed.";
  let body = null;
  try { body = await response.json(); message = readableApiError(body, message); } catch { /* non-JSON error */ }
  throw new ApiError(message, response.status, body?.detail || body);
}

function authHeaders(extra = {}) {
  const token = sessionStorage.getItem("accessToken");
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export const generateRecommendations = (questionnaire) => request(`${AI_BASE_URL}/recommendations`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(questionnaire),
});

export const sendSymptomChatTurn = (payload) => request(`${AI_BASE_URL}/symptom-chat/turn`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
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
  if (!aiResponse?.validationToken) {
    throw new ApiError("This recommendation result has not passed evidence validation and cannot be saved.", 422);
  }
  const savedQuestionnaire = await saveQuestionnaire(questionnaire);
  return request(`${SPRING_BASE_URL}/recommendations`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      questionnaireId: savedQuestionnaire.id,
      stage4ValidationToken: aiResponse.validationToken,
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

// One overwriteable baseline per user. Stage 3 is deliberately excluded.
export const saveBaseline = ({ stage1, stage2 }) => request(`${SPRING_BASE_URL}/questionnaires/baseline`, {
  method: "PUT",
  headers: authHeaders({ "Content-Type": "application/json" }),
  body: JSON.stringify({ questionnaire: { stage1, stage2 } }),
});

export const saveAnalysis = ({ recommendationId, reportIds, analysisType, complete, analysis }) =>
  request(`${SPRING_BASE_URL}/analysis`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ recommendationId, reportIds, analysisType, complete, analysis }),
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
