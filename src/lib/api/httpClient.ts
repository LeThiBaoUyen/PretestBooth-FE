// HTTP client with automatic token refresh interceptor
import { getTokenManager } from "../auth/tokenManager";
import type { RefreshTokenResponse } from "../api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type ApiError = Error & { status?: number };

class HttpClient {
  private baseURL: string;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Refresh access token using HttpOnly refresh cookie.
   * A single in-flight refresh is shared by concurrent 401 requests.
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const tokenManager = getTokenManager();
        const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          tokenManager.clearTokens();
          throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }

        const json = (await response.json()) as {
          data?: RefreshTokenResponse;
          accessToken?: string;
        };
        const payload = json.data ?? json;

        if (!payload.accessToken) {
          throw new Error("Invalid refresh response");
        }

        tokenManager.saveAccessToken(payload.accessToken);
        return payload.accessToken;
      })().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
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
      credentials: "include",
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
        const newAccessToken = await this.refreshAccessToken();

        // Retry original request once with refreshed access token.
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        response = await fetch(url, config);
      }

      const data = await response.json();

      if (!response.ok) {
        let messageText = "Request failed";

        if (data) {
          if (Array.isArray(data.message)) {
            messageText = data.message.join(", ");
          } else if (typeof data.message === "string") {
            messageText = data.message;
          } else if (typeof data.detail === "string") {
            messageText = data.detail;
          } else if (typeof data.error === "string") {
            messageText = data.error;
          } else if (data.data && typeof data.data === "object") {
            if (Array.isArray((data.data as any).message)) {
              messageText = (data.data as any).message.join(", ");
            } else if (typeof (data.data as any).message === "string") {
              messageText = (data.data as any).message;
            } else if (typeof (data.data as any).detail === "string") {
              messageText = (data.data as any).detail;
            }
          }
        }

        const apiError = new Error(messageText) as ApiError;
        apiError.status = response.status;
        throw apiError;
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
