import type {
  Subject,
  Topic,
  Question,
  QuestionListItem,
  PaginatedQuestions,
  QueryQuestionsParams,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  CreateSubjectRequest,
  CreateTopicRequest,
} from "./types";
import { normalizeArray, normalizePaginated } from "./response";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/+$/, "");

class QuestionsApiClient {
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

  // ==================== SUBJECTS ====================

  async getSubjects(accessToken?: string): Promise<Subject[]> {
    const res = await this.request<Subject[] | { data?: Subject[] }>("/api/questions/subjects", {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    });
    return normalizeArray<Subject>(res);
  }

  async createSubject(
    data: CreateSubjectRequest,
    accessToken: string,
  ): Promise<Subject> {
    return this.request<Subject>("/api/questions/subjects", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  async updateSubject(
    id: string,
    data: CreateSubjectRequest,
    accessToken: string,
  ): Promise<Subject> {
    return this.request<Subject>(`/api/questions/subjects/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  async deleteSubject(id: string, accessToken: string): Promise<void> {
    return this.request<void>(`/api/questions/subjects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  // ==================== TOPICS ====================

  async getTopicsBySubject(
    subjectId: string,
    accessToken?: string,
  ): Promise<Topic[]> {
    const res = await this.request<Topic[] | { data?: Topic[] }>(
      `/api/questions/subjects/${subjectId}/topics`,
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      },
    );
    return normalizeArray<Topic>(res);
  }

  async createTopic(
    subjectId: string,
    data: CreateTopicRequest,
    accessToken: string,
  ): Promise<Topic> {
    return this.request<Topic>(`/api/questions/subjects/${subjectId}/topics`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  async updateTopic(
    id: string,
    data: CreateTopicRequest,
    accessToken: string,
  ): Promise<Topic> {
    return this.request<Topic>(`/api/questions/topics/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  async deleteTopic(id: string, accessToken: string): Promise<void> {
    return this.request<void>(`/api/questions/topics/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  // ==================== QUESTIONS ====================

  async getQuestions(
    params?: QueryQuestionsParams,
    accessToken?: string,
  ): Promise<PaginatedQuestions> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.questionType)
      searchParams.append("questionType", params.questionType);
    if (params?.difficulty)
      searchParams.append("difficulty", params.difficulty);
    if (params?.subjectId) searchParams.append("subjectId", params.subjectId);
    if (params?.topicId) searchParams.append("topicId", params.topicId);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.isPublished !== undefined)
      searchParams.append("isPublished", params.isPublished.toString());
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const queryString = searchParams.toString();
    const res = await this.request<PaginatedQuestions | QuestionListItem[]>(
      `/api/questions${queryString ? `?${queryString}` : ""}`,
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      },
    );
    return normalizePaginated<QuestionListItem>(res, {
      page: params?.page,
      limit: params?.limit,
    }) as PaginatedQuestions;
  }

  async getQuestionById(id: string, accessToken?: string): Promise<Question> {
    return this.request<Question>(`/api/questions/${id}`, {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    });
  }

  async createQuestion(
    data: CreateQuestionRequest,
    accessToken: string,
  ): Promise<Question> {
    return this.request<Question>("/api/questions", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  async updateQuestion(
    id: string,
    data: UpdateQuestionRequest,
    accessToken: string,
  ): Promise<Question> {
    return this.request<Question>(`/api/questions/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
  }

  async deleteQuestion(id: string, accessToken: string): Promise<void> {
    return this.request<void>(`/api/questions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async togglePublish(id: string, accessToken: string): Promise<Question> {
    return this.request<Question>(`/api/questions/${id}/publish`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}

export const questionsApiClient = new QuestionsApiClient(API_BASE_URL);
