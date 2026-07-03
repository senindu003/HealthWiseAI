// Mirrors the backend auth DTOs 1:1 (see Backend/.../auth/dto).

export type AuthProviderType = 'LOCAL' | 'GOOGLE';

export interface User {
  id: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  authProvider: AuthProviderType;
}

export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  expiresInSeconds: number;
}

export interface RegisterRequest {
  fullName: string;
  address: string;
  email: string;
  password: string;
  agreedToTerms: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}
