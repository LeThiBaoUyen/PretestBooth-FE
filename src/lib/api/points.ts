import { httpClient } from "./httpClient";
import { normalizeArray, normalizePaginated } from "./response";

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

  getHistory: async (page = 1, limit = 20) => {
    const res = await httpClient.get<PaginatedPointTransactions | PointTransaction[]>(`/api/points/history?page=${page}&limit=${limit}`);
    return normalizePaginated<PointTransaction>(res, { page, limit }) as PaginatedPointTransactions;
  },

  getLeaderboard: async (limit = 20) => {
    const res = await httpClient.get<LeaderboardUser[] | { data?: LeaderboardUser[] }>(`/api/points/leaderboard?limit=${limit}`);
    return normalizeArray<LeaderboardUser>(res);
  },

  // Admin only
  manualAdjust: (data: { userId: string; points: number; reason: string }) => 
    httpClient.post<PointTransaction>("/api/points/adjust", data),
};
