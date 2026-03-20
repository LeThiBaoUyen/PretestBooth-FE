import { httpClient } from "./httpClient";

export interface PointTransaction {
  id: string;
  type: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface PaginatedPointTransactions {
  data: PointTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  email: string;
  studentCode: string | null;
  totalPoints: number;
}

export const pointsApi = {
  getMyPoints: () => httpClient.get<{ totalPoints: number }>("/api/points/me"),

  getHistory: (page = 1, limit = 20) => 
    httpClient.get<PaginatedPointTransactions>(`/api/points/history?page=${page}&limit=${limit}`),

  getLeaderboard: (limit = 20) => 
    httpClient.get<LeaderboardUser[]>(`/api/points/leaderboard?limit=${limit}`),

  // Admin only
  manualAdjust: (data: { userId: string; points: number; reason: string }) => 
    httpClient.post<PointTransaction>("/api/points/adjust", data),
};
