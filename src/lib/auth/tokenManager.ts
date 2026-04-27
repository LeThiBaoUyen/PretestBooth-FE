import { QueryClient } from "@tanstack/react-query";

// Token Manager handles only access token in memory.
// Refresh token is managed by server-side HttpOnly cookie.

const ACCESS_TOKEN_QUERY_KEY = ["accessToken"];

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
   * Clear in-memory access token. Refresh cookie is cleared by server on logout.
   */
  clearTokens(): void {
    this.queryClient.removeQueries({ queryKey: ACCESS_TOKEN_QUERY_KEY });
  }

  /**
   * Check if access token exists
   */
  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.hasAccessToken();
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
