import { httpClient } from "./httpClient";
import type { Booth, BoothStatus } from "./types";

export const boothsApi = {
  // Common
  getBooths: (params?: { status?: BoothStatus }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    return httpClient.get<Booth[]>(`/api/booths${query.toString() ? `?${query.toString()}` : ""}`);
  },

  getAvailableBooths: (date: string, startTime: string, endTime: string) => {
    return httpClient.get<Booth[]>(
      `/api/booths/available?date=${date}&startTime=${startTime}&endTime=${endTime}`
    );
  },

  getBooth: (id: string) => httpClient.get<Booth>(`/api/booths/${id}`),

  // Admin Only
  createBooth: (data: { name: string; description?: string; location?: string }) =>
    httpClient.post<Booth>("/api/booths", data),

  updateBooth: (id: string, data: Partial<Booth>) =>
    httpClient.patch<Booth>(`/api/booths/${id}`, data),

  deleteBooth: (id: string) => httpClient.delete<{ message: string }>(`/api/booths/${id}`),
};
