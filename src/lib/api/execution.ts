// Execution and Submissions API Service

import { getTokenManager } from "../auth/tokenManager";
import type {
  ExecuteCodeRequest,
  ExecuteCodeResponse,
  RunTestCaseRequest,
  RunTestCaseResponse,
  SubmitCodeRequest,
  SubmissionResponse,
  LanguageInfo,
  QuerySubmissionsParams,
  PaginatedSubmissions,
  SubmissionStats,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Helper to get access token from TokenManager
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const tokenManager = getTokenManager();
  return tokenManager.getAccessToken();
}

class ExecutionApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401) {
        const tokenManager = getTokenManager();
        const refreshToken = tokenManager.getRefreshToken();

        if (refreshToken) {
          // Try to refresh the access token
          try {
            const refreshResponse = await fetch(
              `${this.baseURL}/api/auth/refresh`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
              },
            );

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              const data = refreshData.data || refreshData;
              tokenManager.saveAccessToken(data.accessToken);
              tokenManager.saveRefreshToken(data.refreshToken);

              // Retry the original request with new token
              const newToken = data.accessToken;
              const retryConfig: RequestInit = {
                ...options,
                headers: {
                  "Content-Type": "application/json",
                  ...options.headers,
                  Authorization: `Bearer ${newToken}`,
                },
              };

              const retryResponse = await fetch(url, retryConfig);
              const retryJson = await retryResponse.json();

              if (!retryResponse.ok) {
                throw new Error(
                  Array.isArray(retryJson.message)
                    ? retryJson.message.join(", ")
                    : retryJson.message || "An error occurred",
                );
              }

              return retryJson.data || retryJson;
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and throw original error
            tokenManager.clearTokens();
          }
        }

        throw new Error("Unauthorized - Please login again");
      }

      const jsonResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(jsonResponse.message)
            ? jsonResponse.message.join(", ")
            : jsonResponse.message || "An error occurred",
        );
      }

      // Backend wraps responses in { statusCode, message, data }
      return jsonResponse.data || jsonResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }

  // Get available languages
  async getLanguages(): Promise<LanguageInfo[]> {
    return this.request<LanguageInfo[]>("/api/execution/languages");
  }

  // Execute code directly (playground mode)
  async executeCode(
    data: ExecuteCodeRequest,
    accessToken?: string,
  ): Promise<ExecuteCodeResponse> {
    const token = accessToken || getAccessToken();
    return this.request<ExecuteCodeResponse>("/api/execution/run", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(data),
    });
  }

  // Run code against a single test case
  async runTestCase(
    data: RunTestCaseRequest,
    accessToken?: string,
  ): Promise<RunTestCaseResponse> {
    const token = accessToken || getAccessToken();
    return this.request<RunTestCaseResponse>("/api/execution/test", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(data),
    });
  }

  // Submit code for evaluation
  async submitCode(
    data: SubmitCodeRequest,
    accessToken?: string,
  ): Promise<SubmissionResponse> {
    const token = accessToken || getAccessToken();
    return this.request<SubmissionResponse>("/api/execution/submit", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(data),
    });
  }
}

class SubmissionsApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const jsonResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(jsonResponse.message)
            ? jsonResponse.message.join(", ")
            : jsonResponse.message || "An error occurred",
        );
      }

      return jsonResponse.data || jsonResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }

  // Create a new submission
  async createSubmission(
    data: {
      language: string;
      version?: string;
      sourceCode: string;
      problemId: string;
    },
    accessToken?: string,
  ): Promise<SubmissionResponse> {
    const token = accessToken || getAccessToken();
    if (!token) throw new Error("Access token required");

    return this.request<SubmissionResponse>("/api/submissions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  }

  // Get all submissions with filters
  async getSubmissions(
    params: QuerySubmissionsParams = {},
    accessToken?: string,
  ): Promise<PaginatedSubmissions> {
    const token = accessToken || getAccessToken();
    if (!token) throw new Error("Access token required");

    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.problemId) searchParams.append("problemId", params.problemId);
    if (params.status) searchParams.append("status", params.status);
    if (params.language) searchParams.append("language", params.language);
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return this.request<PaginatedSubmissions>(
      `/api/submissions${queryString ? `?${queryString}` : ""}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }

  // Get submissions for a specific problem
  async getSubmissionsByProblem(
    problemId: string,
    params: QuerySubmissionsParams = {},
    accessToken?: string,
  ): Promise<PaginatedSubmissions> {
    const token = accessToken || getAccessToken();
    if (!token) throw new Error("Access token required");

    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.status) searchParams.append("status", params.status);
    if (params.language) searchParams.append("language", params.language);
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return this.request<PaginatedSubmissions>(
      `/api/submissions/problem/${problemId}${queryString ? `?${queryString}` : ""}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }

  // Get submission statistics for a problem
  async getSubmissionStats(
    problemId: string,
    accessToken?: string,
  ): Promise<SubmissionStats> {
    const token = accessToken || getAccessToken();
    if (!token) throw new Error("Access token required");

    return this.request<SubmissionStats>(
      `/api/submissions/problem/${problemId}/stats`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }

  // Get a single submission by ID
  async getSubmission(
    id: string,
    accessToken?: string,
  ): Promise<SubmissionResponse> {
    const token = accessToken || getAccessToken();
    if (!token) throw new Error("Access token required");

    return this.request<SubmissionResponse>(`/api/submissions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

const executionApiClient = new ExecutionApiClient(API_BASE_URL);
const submissionsApiClient = new SubmissionsApiClient(API_BASE_URL);

export const executionApi = executionApiClient;
export const submissionsApi = submissionsApiClient;
