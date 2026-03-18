import { httpClient } from "./httpClient";
import type { Booth, BoothStatus, BoothStatusLog } from "./types";
import type { GenerateBoothActivationOtpResponse } from "./types";

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
  createBooth: (data: { name: string; code?: string; description?: string; location?: string }) =>
    httpClient.post<Booth>("/api/booths", data),

  updateBooth: (
    id: string,
    data: Partial<Booth> & { statusNote?: string }
  ) =>
    httpClient.patch<Booth>(`/api/booths/${id}`, data),

  getBoothStatusLogs: (id: string) =>
    httpClient.get<BoothStatusLog[]>(`/api/booths/${id}/status-logs`),

  generateActivationOtp: (boothCode: string) =>
    httpClient.post<GenerateBoothActivationOtpResponse>("/api/booths/activation-otp", { boothCode }),

  deleteBooth: (id: string) => httpClient.delete<{ message: string }>(`/api/booths/${id}`),
};
