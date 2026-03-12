import { httpClient } from "./httpClient";
import type { Booking, AvailabilityResponse, BookingStatus, BookingType } from "./types";

export interface PaginatedBookings {
  data: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const bookingsApi = {
  // Student & Admin
  getBookings: (params: {
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
    
    return httpClient.get<PaginatedBookings>(`/api/bookings?${query.toString()}`);
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

  // Admin specific
  checkIn: (id: string) => httpClient.patch<Booking>(`/api/bookings/${id}/check-in`),
  checkOut: (id: string) => httpClient.patch<Booking>(`/api/bookings/${id}/check-out`),
};
