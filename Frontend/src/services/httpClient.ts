import type { ApiResponse } from '../types/api';

export class NotFoundError extends Error {}

// Shared fetch/JSON/error-throw conventions used by both assessmentSessionService and
// authService: parse the ApiResponse<T> envelope, throw on !success, surface 404s as
// NotFoundError so callers can distinguish "not found" from other failures.
export async function request<T>(baseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
