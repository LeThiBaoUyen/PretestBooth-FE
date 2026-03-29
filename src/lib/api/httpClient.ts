// HTTP client with automatic token refresh interceptor
import { getTokenManager } from "../auth/tokenManager";
import type { RefreshTokenResponse } from "../api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

class HttpClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Subscribe to token refresh completion
   */
  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  /**
   * Add subscriber to token refresh
   */
  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      const tokenManager = getTokenManager();
      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // If refresh fails, clear tokens and redirect to login
        tokenManager.clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Failed to refresh token");
      }

      const data = (await response.json()) as RefreshTokenResponse;

      // Save new tokens
      tokenManager.saveAccessToken(data.accessToken);
      tokenManager.saveRefreshToken(data.refreshToken);

      return data.accessToken;
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    }
  }

  /**
   * Make an HTTP request with automatic token refresh
   */
  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const tokenManager = getTokenManager();
    const accessToken = tokenManager.getAccessToken();

    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    };

    try {
      let response = await fetch(url, config);

      // If 401 Unauthorized, try to refresh token
      if (response.status === 401) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            this.isRefreshing = false;
            this.onRefreshed(newAccessToken);

            // Retry the original request with new token
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${newAccessToken}`,
            };
            response = await fetch(url, config);
          } catch (refreshError) {
            this.isRefreshing = false;
            throw refreshError;
          }
        } else {
          // Wait for token to be refreshed
          return new Promise((resolve, reject) => {
            this.addRefreshSubscriber((newAccessToken: string) => {
              config.headers = {
                ...config.headers,
                Authorization: `Bearer ${newAccessToken}`,
              };
              fetch(url, config)
                .then((res) => res.json())
                .then(resolve)
                .catch(reject);
            });
          });
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Request failed",
        );
      }

      // Auto-unwrap the backend's TransformInterceptor payload if present
      return (data.data !== undefined ? data.data : data) as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint, { method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint, { method: "DELETE" });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const httpClient = new HttpClient(API_BASE_URL);
