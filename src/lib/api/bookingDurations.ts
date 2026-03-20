import { httpClient } from "./httpClient";
import type { BookingDurationOption, BookingType } from "./types";

export const bookingDurationsApi = {
  getDurationOptions: (params?: { type?: BookingType; isActive?: boolean }) => {
    const query = new URLSearchParams();

    if (params?.type) query.append("type", params.type);
    if (params?.isActive !== undefined) query.append("isActive", String(params.isActive));

    const suffix = query.toString() ? `?${query.toString()}` : "";
    return httpClient.get<BookingDurationOption[]>(`/api/booking-durations${suffix}`);
  },

  createDurationOption: (data: {
    type: BookingType;
    durationMinutes: number;
    isActive?: boolean;
    displayOrder?: number;
  }) => {
    return httpClient.post<BookingDurationOption>("/api/booking-durations", data);
  },

  updateDurationOption: (
    id: string,
    data: {
      type?: BookingType;
      durationMinutes?: number;
      isActive?: boolean;
      displayOrder?: number | null;
    },
  ) => {
    return httpClient.patch<BookingDurationOption>(`/api/booking-durations/${id}`, data);
  },

  deleteDurationOption: (id: string) => {
    return httpClient.delete<{ message: string }>(`/api/booking-durations/${id}`);
  },
};
