import { httpClient } from "./httpClient";
import type {
  Difficulty,
  ExtendSessionRequest,
  MonitorReasonRequest,
  PracticeSession,
  PracticeSessionAnswer,
} from "./types";

export interface CreatePracticeSessionRequest {
  duration?: number;
  totalItems?: number;
  difficulty?: Difficulty;
  subjectId?: string;
  topicId?: string;
  categoryId?: string;
  includeQuestions?: boolean;
  includeProblems?: boolean;
}

export interface SubmitPracticeAnswerRequest {
  itemId: string;
  selectedChoiceIds?: string[];
  textAnswer?: string;
  sourceCode?: string;
  language?: string;
  version?: string;
}

export const practiceApi = {
  createSession: (data: CreatePracticeSessionRequest) => 
    httpClient.post<{ sessionId: string; totalItems: number }>("/api/practice", data),

  getSession: (id: string) => httpClient.get<PracticeSession>(`/api/practice/${id}`),

  submitAnswer: (sessionId: string, data: SubmitPracticeAnswerRequest) =>
    httpClient.post<PracticeSessionAnswer>(`/api/practice/${sessionId}/answers`, data),

  completeSession: (id: string) => httpClient.post<PracticeSession>(`/api/practice/${id}/complete`),

  extendSessionByMonitor: (
    id: string,
    data: ExtendSessionRequest,
  ) =>
    httpClient.post<{
      sessionId: string;
      sessionType: "PRACTICE";
      previousDuration: number;
      duration: number;
      expiresAt: string;
      extendedMinutes: number;
      reason: string;
      updatedBy: string;
    }>(`/api/practice/${id}/monitor/extend`, data),

  abortSessionByMonitor: (id: string, data: MonitorReasonRequest) =>
    httpClient.post<{ message: string; sessionId: string; reason: string; updatedBy: string }>(
      `/api/practice/${id}/monitor/abort`,
      data,
    ),
};
