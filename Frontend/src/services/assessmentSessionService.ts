import type {
  ApiResponse,
  AssessmentSessionResponse,
  AutoSaveRequest,
  CreateSessionRequest,
  UpdateStageRequest,
} from '../types/assessmentSession';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/api/assessment-sessions`;
const USER_ID_STORAGE_KEY = 'healthwise_user_id';

// Stub identity mechanism until real auth exists: a UUID generated once per browser
// and persisted in localStorage. This is what lets the backend find the same session
// again after a refresh or a closed tab (see AssessmentSessionContext resume-on-mount).
export function getOrCreateUserId(): string {
  let userId = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  }
  return userId;
}

class NotFoundError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getOrCreateUserId(),
      ...options.headers,
    },
  });

  if (response.status === 404) {
    throw new NotFoundError('Not found');
  }

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new Error(body.error?.message ?? `Request to ${path} failed with status ${response.status}`);
  }

  return body.data as T;
}

export const assessmentSessionService = {
  createSession(payload?: CreateSessionRequest): Promise<AssessmentSessionResponse> {
    return request('', { method: 'POST', body: JSON.stringify(payload ?? {}) });
  },

  async getCurrentSession(): Promise<AssessmentSessionResponse | null> {
    try {
      return await request<AssessmentSessionResponse>('/current');
    } catch (err) {
      if (err instanceof NotFoundError) return null;
      throw err;
    }
  },

  getSession(sessionId: string): Promise<AssessmentSessionResponse> {
    return request(`/${sessionId}`);
  },

  updateStage(sessionId: string, payload: UpdateStageRequest): Promise<AssessmentSessionResponse> {
    return request(`/${sessionId}/stage`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  autoSave(sessionId: string, payload: AutoSaveRequest, keepalive = false): Promise<AssessmentSessionResponse> {
    return request(`/${sessionId}/autosave`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      keepalive,
    });
  },

  completeSession(sessionId: string): Promise<AssessmentSessionResponse> {
    return request(`/${sessionId}/complete`, { method: 'POST' });
  },

  cancelSession(sessionId: string): Promise<AssessmentSessionResponse> {
    return request(`/${sessionId}`, { method: 'DELETE' });
  },
};
