import type {
  Exam,
  PaginatedExams,
  QueryExamsParams,
  CreateExamRequest,
  UpdateExamRequest,
  ShuffledExamSession,
  SessionAnswer,
  SaveAnswerRequest,
  SessionResult,
  GradeSessionRequest,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

class ExamsApiClient {
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
      if (error instanceof Error) throw error;
      throw new Error("An unexpected error occurred");
    }
  }

  // ==================== EXAM CRUD ====================

  async createExam(
    data: CreateExamRequest,
    accessToken: string,
  ): Promise<Exam> {
    return this.request<Exam>("/api/exams", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  async listExams(
    params?: QueryExamsParams,
    accessToken?: string,
  ): Promise<PaginatedExams> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.subjectId) searchParams.append("subjectId", params.subjectId);
    if (params?.topicId) searchParams.append("topicId", params.topicId);
    if (params?.difficulty)
      searchParams.append("difficulty", params.difficulty);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.isPublished !== undefined)
      searchParams.append("isPublished", params.isPublished.toString());
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return this.request<PaginatedExams>(
      `/api/exams${queryString ? `?${queryString}` : ""}`,
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      },
    );
  }

  async getExam(id: string, accessToken?: string): Promise<Exam> {
    return this.request<Exam>(`/api/exams/${id}`, {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    });
  }

  async updateExam(
    id: string,
    data: UpdateExamRequest,
    accessToken: string,
  ): Promise<Exam> {
    return this.request<Exam>(`/api/exams/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  async deleteExam(id: string, accessToken: string): Promise<void> {
    return this.request<void>(`/api/exams/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  // ==================== EXAM SESSION ====================

  async startSession(
    examId: string,
    accessToken: string,
  ): Promise<ShuffledExamSession> {
    return this.request<ShuffledExamSession>(`/api/exams/${examId}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getSession(
    sessionId: string,
    accessToken: string,
  ): Promise<ShuffledExamSession> {
    return this.request<ShuffledExamSession>(
      `/api/exams/sessions/${sessionId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  }

  async saveAnswer(
    sessionId: string,
    data: SaveAnswerRequest,
    accessToken: string,
  ): Promise<SessionAnswer> {
    return this.request<SessionAnswer>(
      `/api/exams/sessions/${sessionId}/answers`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(data),
      },
    );
  }

  async submitSession(
    sessionId: string,
    accessToken: string,
  ): Promise<SessionResult> {
    return this.request<SessionResult>(
      `/api/exams/sessions/${sessionId}/submit`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  }

  async getResults(
    sessionId: string,
    accessToken: string,
  ): Promise<SessionResult> {
    return this.request<SessionResult>(
      `/api/exams/sessions/${sessionId}/results`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  }

  async gradeSession(
    sessionId: string,
    data: GradeSessionRequest,
    accessToken: string,
  ): Promise<SessionResult> {
    return this.request<SessionResult>(
      `/api/exams/sessions/${sessionId}/grade`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(data),
      },
    );
  }
}

export const examsApiClient = new ExamsApiClient(API_BASE_URL);
