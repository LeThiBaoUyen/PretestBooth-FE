import { httpClient } from "./httpClient";
import type { User } from "./types";

export interface PaginatedUsers {
  data: Partial<User>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const usersApi = {
  getUsers: (params: { page?: number; limit?: number; role?: string; search?: string; isLocked?: boolean }) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.role) query.append("role", params.role);
    if (params.search) query.append("search", params.search);
    if (params.isLocked !== undefined) query.append("isLocked", params.isLocked.toString());

    return httpClient.get<PaginatedUsers>(`/api/users?${query.toString()}`);
  },

  getUser: (id: string) => httpClient.get<Partial<User>>(`/api/users/${id}`),

  createUser: (data: any) => httpClient.post<{ message: string; id: string }>("/api/users", data),

  updateUser: (id: string, data: { name?: string; isLocked?: boolean; lockedReason?: string }) => 
    httpClient.patch<Partial<User>>(`/api/users/${id}`, data),

  // File should be mapped toFormData in the UI layer and passed via fetch directly because httpClient forces JSON
  // We'll export a generic URL that the UI can hit using native fetch + tokens
  getImportUrl: () => `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/users/import`,
};
