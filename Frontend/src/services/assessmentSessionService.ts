import { request, NotFoundError } from './httpClient';
import { getAccessToken } from './authTokenStore';
import type {
  AssessmentSessionResponse,
  AutoSaveRequest,
  CreateSessionRequest,
  UpdateStageRequest,
} from '../types/assessmentSession';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/api/assessment-sessions`;

// Only ever called from within ProtectedRoute-guarded pages, so an access token should
// always be present - the Authorization header is simply omitted (not sent as the
// literal string "Bearer null") if it's somehow missing, letting the backend 401 normally.
function sessionRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const accessToken = getAccessToken();
  return request<T>(BASE_URL, path, {
    ...options,
    credentials: 'include',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
}

export const assessmentSessionService = {
  createSession(payload?: CreateSessionRequest): Promise<AssessmentSessionResponse> {
    return sessionRequest('', { method: 'POST', body: JSON.stringify(payload ?? {}) });
  },

  async getCurrentSession(): Promise<AssessmentSessionResponse | null> {
    try {
      return await sessionRequest<AssessmentSessionResponse>('/current');
    } catch (err) {
      if (err instanceof NotFoundError) return null;
      throw err;
    }
  },

  getSession(sessionId: string): Promise<AssessmentSessionResponse> {
    return sessionRequest(`/${sessionId}`);
  },

  updateStage(sessionId: string, payload: UpdateStageRequest): Promise<AssessmentSessionResponse> {
    return sessionRequest(`/${sessionId}/stage`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  autoSave(sessionId: string, payload: AutoSaveRequest, keepalive = false): Promise<AssessmentSessionResponse> {
    return sessionRequest(`/${sessionId}/autosave`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      keepalive,
    });
  },

  completeSession(sessionId: string): Promise<AssessmentSessionResponse> {
    return sessionRequest(`/${sessionId}/complete`, { method: 'POST' });
  },

  cancelSession(sessionId: string): Promise<AssessmentSessionResponse> {
    return sessionRequest(`/${sessionId}`, { method: 'DELETE' });
  },
};
