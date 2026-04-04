import { httpClient } from "./httpClient";
import type {
  ActiveMonitoringSessionItem,
  AvailabilityResponse,
  Booking,
  BookingStatus,
  BookingType,
  ForceCheckoutResponse,
  MonitorNotifyRequest,
  MonitorNotifyResponse,
  MonitorReasonRequest,
  QueryActiveMonitoringParams,
} from "./types";
import { normalizePaginated } from "./response";

export interface PaginatedBookings {
  data: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedActiveMonitoringSessions {
  data: ActiveMonitoringSessionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const bookingsApi = {
  // Student & Admin
  getBookings: async (params: {
    page?: number;
    limit?: number;
    status?: BookingStatus;
    type?: BookingType;
    date?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.status) query.append("status", params.status);
    if (params.type) query.append("type", params.type);
    if (params.date) query.append("date", params.date);
    if (params.sortOrder) query.append("sortOrder", params.sortOrder);
    
    const res = await httpClient.get<PaginatedBookings | Booking[]>(`/api/bookings?${query.toString()}`);
    return normalizePaginated<Booking>(res, {
      page: params.page,
      limit: params.limit,
    }) as PaginatedBookings;
  },

  getAvailability: (date: string) => {
    return httpClient.get<AvailabilityResponse>(`/api/bookings/availability?date=${date}`);
  },

  // Student specific
  createBooking: (data: { boothId: string; type: BookingType; date: string; startTime: string; endTime: string }) => {
    return httpClient.post<Booking>("/api/bookings", data);
  },

  cancelBooking: (id: string) => {
    return httpClient.patch<Booking>(`/api/bookings/${id}/cancel`);
  },

  getActiveMonitoringSessions: async (params: QueryActiveMonitoringParams = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.boothId) query.append("boothId", params.boothId);
    if (params.activityType) query.append("activityType", params.activityType);
    if (params.search) query.append("search", params.search);
    if (params.sortOrder) query.append("sortOrder", params.sortOrder);

    const res = await httpClient.get<PaginatedActiveMonitoringSessions | ActiveMonitoringSessionItem[]>(
      `/api/bookings/monitor/active${query.toString() ? `?${query.toString()}` : ""}`,
    );

    return normalizePaginated<ActiveMonitoringSessionItem>(res, {
      page: params.page,
      limit: params.limit,
    }) as PaginatedActiveMonitoringSessions;
  },

  forceCheckoutByMonitor: (bookingId: string, data: MonitorReasonRequest) => {
    return httpClient.post<ForceCheckoutResponse>(`/api/bookings/${bookingId}/force-checkout`, data);
  },

  notifyByMonitor: (bookingId: string, data: MonitorNotifyRequest) => {
    return httpClient.post<MonitorNotifyResponse>(`/api/bookings/${bookingId}/notify`, data);
  },
};
