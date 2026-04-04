import { httpClient } from "./httpClient";
import type { Booth, BoothStatus, BoothStatusLog } from "./types";
import type { GenerateBoothActivationOtpResponse } from "./types";
import type { ForceBoothLogoutResponse, MonitorReasonRequest } from "./types";
import { normalizeArray } from "./response";

export const boothsApi = {
  // Common
  getBooths: async (params?: { status?: BoothStatus }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    const res = await httpClient.get<Booth[] | { data?: Booth[] }>(`/api/booths${query.toString() ? `?${query.toString()}` : ""}`);
    return normalizeArray<Booth>(res);
  },

  getAvailableBooths: async (date: string, startTime: string, endTime: string) => {
    const res = await httpClient.get<Booth[] | { data?: Booth[] }>(
      `/api/booths/available?date=${date}&startTime=${startTime}&endTime=${endTime}`
    );
    return normalizeArray<Booth>(res);
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

  getBoothStatusLogs: async (id: string) => {
    const res = await httpClient.get<BoothStatusLog[] | { data?: BoothStatusLog[] }>(`/api/booths/${id}/status-logs`);
    return normalizeArray<BoothStatusLog>(res);
  },

  generateActivationOtp: (boothCode: string) =>
    httpClient.post<GenerateBoothActivationOtpResponse>("/api/booths/activation-otp", { boothCode }),

  forceLogoutBooth: (id: string, data: MonitorReasonRequest) =>
    httpClient.post<ForceBoothLogoutResponse>(`/api/booths/${id}/force-logout`, data),

  deleteBooth: (id: string) => httpClient.delete<{ message: string }>(`/api/booths/${id}`),
};
