import { httpClient } from "./httpClient";

export type ProctoringEventType = 
  | "TAB_SWITCH" 
  | "WINDOW_BLUR" 
  | "FULLSCREEN_EXIT" 
  | "COPY_PASTE" 
  | "MULTIPLE_FACES" 
  | "NO_FACE" 
  | "DEVICE_DISCONNECTED";

export interface ReportProctoringEventRequest {
  sessionId: string;
  eventType: ProctoringEventType;
  metadata?: Record<string, any>;
}

export interface ReportProctoringEventResponse {
  eventId: string;
  totalSeverity: number;
  actionTaken: "LOGGED" | "POINT_PENALTY" | "EXAM_CANCELLED" | "EXAM_TERMINATED_TAB_SWITCH" | "PRACTICE_TERMINATED_TAB_SWITCH";
}

export interface ProctoringReport {
  session: { status: string; score: number | null; user: { name: string; studentCode: string } };
  totalEvents: number;
  totalSeverity: number;
  events: { id: string; eventType: ProctoringEventType; warningLevel: number; timestamp: string; metadata: any }[];
}

export const proctoringApi = {
  reportEvent: (data: ReportProctoringEventRequest) => 
    httpClient.post<ReportProctoringEventResponse>("/api/proctoring/event", data),

  getSessionReport: (sessionId: string) => 
    httpClient.get<ProctoringReport>(`/api/proctoring/session/${sessionId}`),
};
