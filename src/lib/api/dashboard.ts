import { httpClient } from "./httpClient";
import type { StudentStats, AdminStats } from "./types";

export const dashboardApi = {
  getStudentStats: () => httpClient.get<StudentStats>("/api/dashboard/student"),
  getAdminStats: () => httpClient.get<AdminStats>("/api/dashboard/admin"),
};
