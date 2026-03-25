// Problems API Service

import type {
  Problem,
  ProblemListItem,
  PaginatedProblems,
  QueryProblemsParams,
  CreateProblemRequest,
  UpdateProblemRequest,
} from "./types";
import { normalizePaginated } from "./response";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/+$/, "");

class ProblemsApiClient {
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

      // Backend wraps responses in { statusCode, message, data }
      return jsonResponse.data || jsonResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }

  async getProblems(params?: QueryProblemsParams): Promise<PaginatedProblems> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.difficulty)
      searchParams.append("difficulty", params.difficulty);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.isPublished !== undefined)
      searchParams.append("isPublished", params.isPublished.toString());
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);
    if (params?.subjectId) searchParams.append("subjectId", params.subjectId);
    if (params?.topicId) searchParams.append("topicId", params.topicId);

    const queryString = searchParams.toString();
    const res = await this.request<PaginatedProblems | ProblemListItem[]>(
      `/api/problems${queryString ? `?${queryString}` : ""}`,
    );
    return normalizePaginated<ProblemListItem>(res, {
      page: params?.page,
      limit: params?.limit,
    }) as PaginatedProblems;
  }

  async getProblemBySlug(slug: string, accessToken?: string): Promise<Problem> {
    return this.request<Problem>(`/api/problems/slug/${slug}`, {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    });
  }

  async getProblemById(id: string, accessToken?: string): Promise<Problem> {
    return this.request<Problem>(`/api/problems/${id}`, {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    });
  }

  async createProblem(
    data: CreateProblemRequest,
    accessToken: string,
  ): Promise<Problem> {
    return this.request<Problem>("/api/problems", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });
  }

  async updateProblem(
    id: string,
    data: UpdateProblemRequest,
    accessToken: string,
  ): Promise<Problem> {
    return this.request<Problem>(`/api/problems/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });
  }

  async deleteProblem(id: string, accessToken: string): Promise<void> {
    return this.request<void>(`/api/problems/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
}

export const problemsApiClient = new ProblemsApiClient(API_BASE_URL);
export const problemsApi = problemsApiClient;
