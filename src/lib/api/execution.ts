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
  QueryUnifiedSubmissionsParams,
  PaginatedUnifiedSubmissions,
  QuerySubmissionTestGroupsParams,
  PaginatedSubmissionTestGroups,
  QuerySubmissionTestMembersParams,
  PaginatedSubmissionTestMembers,
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
  private static readonly DEFAULT_TIMEOUT_MS = 30_000;
  private static readonly EXECUTION_TIMEOUT_MS = 60_000;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit,
    timeoutMs: number,
    retries = 1,
  ): Promise<T> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= retries) {
      try {
        return await this.request<T>(endpoint, options, timeoutMs);
      } catch (error) {
        const err = error instanceof Error ? error : new Error("An unexpected error occurred");
        lastError = err;

        const isTransient =
          err.message.includes("Execution request timed out") ||
          err.message.includes("NetworkError") ||
          err.message.includes("Failed to fetch") ||
          err.message.includes("503") ||
          err.message.includes("502") ||
          err.message.includes("504");

        if (!isTransient || attempt === retries) {
          throw err;
        }

        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        attempt += 1;
      }
    }

    throw lastError || new Error("An unexpected error occurred");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs = ExecutionApiClient.DEFAULT_TIMEOUT_MS,
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
      const response = await this.fetchWithTimeout(url, config, timeoutMs);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401) {
        const tokenManager = getTokenManager();
        const refreshToken = tokenManager.getRefreshToken();

        if (refreshToken) {
          // Try to refresh the access token
          try {
            const refreshResponse = await this.fetchWithTimeout(
              `${this.baseURL}/api/auth/refresh`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
              },
              ExecutionApiClient.DEFAULT_TIMEOUT_MS,
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

              const retryResponse = await this.fetchWithTimeout(
                url,
                retryConfig,
                timeoutMs,
              );
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
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Execution request timed out");
      }
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
    return this.requestWithRetry<ExecuteCodeResponse>(
      "/api/execution/run",
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(data),
      },
      ExecutionApiClient.EXECUTION_TIMEOUT_MS,
      1,
    );
  }

  // Run code against a single test case
  async runTestCase(
    data: RunTestCaseRequest,
    accessToken?: string,
  ): Promise<RunTestCaseResponse> {
    const token = accessToken || getAccessToken();
    return this.requestWithRetry<RunTestCaseResponse>(
      "/api/execution/test",
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(data),
      },
      ExecutionApiClient.EXECUTION_TIMEOUT_MS,
      1,
    );
  }

  // Submit code for evaluation
  async submitCode(
    data: SubmitCodeRequest,
    accessToken?: string,
  ): Promise<SubmissionResponse> {
    const token = accessToken || getAccessToken();
    return this.requestWithRetry<SubmissionResponse>(
      "/api/execution/submit",
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(data),
      },
      ExecutionApiClient.EXECUTION_TIMEOUT_MS,
      1,
    );
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

  // Get unified list of both coding submissions and exam sessions
  async getUnifiedSubmissions(
    params: QueryUnifiedSubmissionsParams = {},
    accessToken?: string,
  ): Promise<PaginatedUnifiedSubmissions> {
    const token = accessToken || getAccessToken();
    if (!token) throw new Error("Access token required");

    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.type) searchParams.append("type", params.type);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return this.request<PaginatedUnifiedSubmissions>(
      `/api/submissions/all${queryString ? `?${queryString}` : ""}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }

  async getSubmissionTestGroups(
    params: QuerySubmissionTestGroupsParams = {},
    accessToken?: string,
  ): Promise<PaginatedSubmissionTestGroups> {
    const token = accessToken || getAccessToken();
    if (!token) throw new Error("Access token required");

    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.type) searchParams.append("type", params.type);
    if (params.keyword) searchParams.append("keyword", params.keyword);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return this.request<PaginatedSubmissionTestGroups>(
      `/api/submissions/tests${queryString ? `?${queryString}` : ""}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }

  async getSubmissionTestMembers(
    type: "PROBLEM" | "EXAM",
    entityId: string,
    params: QuerySubmissionTestMembersParams = {},
    accessToken?: string,
  ): Promise<PaginatedSubmissionTestMembers> {
    const token = accessToken || getAccessToken();
    if (!token) throw new Error("Access token required");

    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return this.request<PaginatedSubmissionTestMembers>(
      `/api/submissions/tests/${type}/${entityId}/submissions${queryString ? `?${queryString}` : ""}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }
}

const executionApiClient = new ExecutionApiClient(API_BASE_URL);
const submissionsApiClient = new SubmissionsApiClient(API_BASE_URL);

export const executionApi = executionApiClient;
export const submissionsApi = submissionsApiClient;
