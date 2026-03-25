import { QueryClient } from "@tanstack/react-query";

// Token Manager for handling access tokens and refresh tokens
// - Access token: Stored in TanStack Query cache
// - Refresh token: Stored in HTTP-only cookie

const ACCESS_TOKEN_QUERY_KEY = ["accessToken"];
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

export class TokenManager {
  constructor(private queryClient: QueryClient) {}

  /**
   * Save access token to TanStack Query cache
   */
  saveAccessToken(token: string): void {
    this.queryClient.setQueryData(ACCESS_TOKEN_QUERY_KEY, token);
  }

  /**
   * Get access token from TanStack Query cache
   */
  getAccessToken(): string | null {
    return this.queryClient.getQueryData<string>(ACCESS_TOKEN_QUERY_KEY) || null;
  }

  /**
   * Save refresh token to cookies
   */
  saveRefreshToken(token: string): void {
    // Set cookie with httpOnly flag (requires server-side handling or middleware)
    // For now, we'll set a standard cookie that can be sent with requests
    const maxAge = 7 * 24 * 60 * 60; // 7 days
    document.cookie = `${REFRESH_TOKEN_COOKIE_NAME}=${token}; path=/; max-age=${maxAge}; SameSite=Strict`;
  }

  /**
   * Get refresh token from cookies
   */
  getRefreshToken(): string | null {
    if (typeof document === "undefined") return null;

    const name = REFRESH_TOKEN_COOKIE_NAME + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(";");

    for (let cookie of cookieArray) {
      cookie = cookie.trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length, cookie.length);
      }
    }
    return null;
  }

  /**
   * Clear both access and refresh tokens
   */
  clearTokens(): void {
    this.queryClient.removeQueries({ queryKey: ACCESS_TOKEN_QUERY_KEY });
    // Clear refresh token from cookies
    if (typeof document === "undefined") return;
    document.cookie = `${REFRESH_TOKEN_COOKIE_NAME}=; path=/; max-age=0`;
  }

  /**
   * Check if access token exists
   */
  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Check if refresh token exists
   */
  hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.hasAccessToken() && this.hasRefreshToken();
  }
}

let tokenManager: TokenManager | null = null;
let fallbackQueryClient: QueryClient | null = null;

/**
 * Initialize token manager with query client
 */
export function initializeTokenManager(queryClient: QueryClient): TokenManager {
  tokenManager = new TokenManager(queryClient);
  return tokenManager;
}

/**
 * Get the global token manager instance
 */
export function getTokenManager(): TokenManager {
  if (!tokenManager) {
    // In production bundles, module init order can differ across chunks.
    // Create a safe fallback manager instead of crashing the entire app.
    fallbackQueryClient ??= new QueryClient();
    tokenManager = new TokenManager(fallbackQueryClient);
  }
  return tokenManager;
}
