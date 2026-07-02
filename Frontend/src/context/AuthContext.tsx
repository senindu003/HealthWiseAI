import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { authService } from '../services/authService';
import { setAccessToken as syncAccessToken } from '../services/authTokenStore';
import type {
  ForgotPasswordRequest,
  GoogleAuthRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  User,
} from '../types/auth';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  loginWithGoogle: (payload: GoogleAuthRequest) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (payload: ForgotPasswordRequest) => Promise<void>;
  resetPassword: (payload: ResetPasswordRequest) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Refresh a little before the access token actually expires so a mid-session call never
// races an expiry (matters given useAutoSave's retry logic during the assessment wizard).
const REFRESH_SAFETY_MARGIN_SECONDS = 60;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback((expiresInSeconds: number) => {
    clearRefreshTimer();
    const delayMs = Math.max(expiresInSeconds - REFRESH_SAFETY_MARGIN_SECONDS, 5) * 1000;
    refreshTimer.current = setTimeout(async () => {
      try {
        const refreshed = await authService.refresh();
        syncAccessToken(refreshed.accessToken);
        scheduleRefresh(refreshed.expiresInSeconds);
      } catch {
        clearRefreshTimer();
        syncAccessToken(null);
        setUser(null);
      }
    }, delayMs);
  }, [clearRefreshTimer]);

  useEffect(() => {
    // Guard against React StrictMode's dev-only double-invoke (mount, cleanup, mount again
    // in the same tick) firing this twice - same pattern as AssessmentSessionContext's
    // resume-on-mount guard, so a superseded run never sets state after being cancelled.
    let cancelled = false;
    (async () => {
      try {
        const refreshed = await authService.refresh();
        if (cancelled) return;
        syncAccessToken(refreshed.accessToken);
        const me = await authService.me();
        if (cancelled) return;
        setUser(me);
        scheduleRefresh(refreshed.expiresInSeconds);
      } catch {
        // Normal "not logged in yet" case (no valid refresh cookie) - silent, no toast.
        if (!cancelled) {
          syncAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const response = await authService.login(payload);
    syncAccessToken(response.accessToken);
    setUser(response.user);
    scheduleRefresh(response.expiresInSeconds);
  }, [scheduleRefresh]);

  const register = useCallback(async (payload: RegisterRequest) => {
    const response = await authService.register(payload);
    syncAccessToken(response.accessToken);
    setUser(response.user);
    scheduleRefresh(response.expiresInSeconds);
  }, [scheduleRefresh]);

  const loginWithGoogle = useCallback(async (payload: GoogleAuthRequest) => {
    const response = await authService.googleAuth(payload);
    syncAccessToken(response.accessToken);
    setUser(response.user);
    scheduleRefresh(response.expiresInSeconds);
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    clearRefreshTimer();
    try {
      await authService.logout();
    } finally {
      syncAccessToken(null);
      setUser(null);
    }
  }, [clearRefreshTimer]);

  const forgotPassword = useCallback((payload: ForgotPasswordRequest) => authService.forgotPassword(payload), []);

  const resetPassword = useCallback((payload: ResetPasswordRequest) => authService.resetPassword(payload), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
