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
  PaginatedExamSessions,
  QueryExamSessionsParams,
} from "./types";
import { httpClient } from "./httpClient";

class ExamsApiClient {
  // ==================== EXAM CRUD ====================

  async createExam(
    data: CreateExamRequest,
    _accessToken: string,
  ): Promise<Exam> {
    return httpClient.post<Exam>("/api/exams", data);
  }

  async listExams(
    params?: QueryExamsParams,
    _accessToken?: string,
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
    return httpClient.get<PaginatedExams>(`/api/exams${queryString ? `?${queryString}` : ""}`);
  }

  async getExam(id: string, _accessToken?: string): Promise<Exam> {
    return httpClient.get<Exam>(`/api/exams/${id}`);
  }

  async updateExam(
    id: string,
    data: UpdateExamRequest,
    _accessToken: string,
  ): Promise<Exam> {
    return httpClient.patch<Exam>(`/api/exams/${id}`, data);
  }

  async deleteExam(id: string, _accessToken: string): Promise<void> {
    return httpClient.delete<void>(`/api/exams/${id}`);
  }

  // ==================== EXAM SESSION ====================

  async startSession(
    examId: string,
    _accessToken: string,
  ): Promise<ShuffledExamSession> {
    return httpClient.post<ShuffledExamSession>(`/api/exams/${examId}/start`);
  }

  async getSession(
    sessionId: string,
    _accessToken: string,
  ): Promise<ShuffledExamSession> {
    return httpClient.get<ShuffledExamSession>(`/api/exams/sessions/${sessionId}`);
  }

  async saveAnswer(
    sessionId: string,
    data: SaveAnswerRequest,
    _accessToken: string,
  ): Promise<SessionAnswer> {
    return httpClient.post<SessionAnswer>(`/api/exams/sessions/${sessionId}/answers`, data);
  }

  async submitSession(
    sessionId: string,
    _accessToken: string,
  ): Promise<SessionResult> {
    return httpClient.post<SessionResult>(`/api/exams/sessions/${sessionId}/submit`);
  }

  async getResults(
    sessionId: string,
    _accessToken: string,
  ): Promise<SessionResult> {
    return httpClient.get<SessionResult>(`/api/exams/sessions/${sessionId}/results`);
  }

  async gradeSession(
    sessionId: string,
    data: GradeSessionRequest,
    _accessToken: string,
  ): Promise<SessionResult> {
    return httpClient.patch<SessionResult>(`/api/exams/sessions/${sessionId}/grade`, data);
  }

  // ==================== EXAM SESSIONS LIST ====================

  async listSessions(
    params?: QueryExamSessionsParams,
    _accessToken?: string,
  ): Promise<PaginatedExamSessions> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.status) searchParams.append("status", params.status);
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    return httpClient.get<PaginatedExamSessions>(`/api/exams/sessions${queryString ? `?${queryString}` : ""}`);
  }
}

export const examsApiClient = new ExamsApiClient();
