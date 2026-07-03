// Bridges React-held AuthContext state to the plain-module services (authService,
// assessmentSessionService) that aren't hooks and can't call useContext. AuthContext
// calls setAccessToken() every time its own state changes (login/refresh/logout) so
// the two stay in sync. The access token is deliberately kept only in memory here -
// never localStorage/sessionStorage - per the locked security decision.

let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}
