import { request } from './httpClient';
import { getAccessToken } from './authTokenStore';
import type {
  AuthResponse,
  ForgotPasswordRequest,
  GoogleAuthRequest,
  LoginRequest,
  RefreshResponse,
  RegisterRequest,
  ResetPasswordRequest,
  User,
} from '../types/auth';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/api/auth`;

// Always sends credentials so the httpOnly refresh cookie flows on cross-port dev/prod
// requests, and attaches the in-memory access token (never localStorage) when present.
function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
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

export const authService = {
  register(payload: RegisterRequest): Promise<AuthResponse> {
    return authRequest('/register', { method: 'POST', body: JSON.stringify(payload) });
  },

  login(payload: LoginRequest): Promise<AuthResponse> {
    return authRequest('/login', { method: 'POST', body: JSON.stringify(payload) });
  },

  googleAuth(payload: GoogleAuthRequest): Promise<AuthResponse> {
    return authRequest('/google', { method: 'POST', body: JSON.stringify(payload) });
  },

  refresh(): Promise<RefreshResponse> {
    return authRequest('/refresh', { method: 'POST' });
  },

  logout(): Promise<void> {
    return authRequest('/logout', { method: 'POST' });
  },

  forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
    return authRequest('/forgot-password', { method: 'POST', body: JSON.stringify(payload) });
  },

  resetPassword(payload: ResetPasswordRequest): Promise<void> {
    return authRequest('/reset-password', { method: 'POST', body: JSON.stringify(payload) });
  },

  me(): Promise<User> {
    return authRequest('/me');
  },
};
