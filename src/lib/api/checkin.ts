import { httpClient } from "./httpClient";
import type {
  CheckinThresholdConfig,
  CheckinVerifyRequest,
  CheckinVerifyResponse,
  UpdateCheckinThresholdRequest,
} from "./types";

export const checkinApi = {
  verify: (payload: CheckinVerifyRequest) => {
    return httpClient.post<CheckinVerifyResponse>("/api/checkin/verify", payload);
  },
  getThreshold: () => {
    return httpClient.get<CheckinThresholdConfig>("/api/checkin/threshold");
  },
  updateThreshold: (payload: UpdateCheckinThresholdRequest) => {
    return httpClient.patch<CheckinThresholdConfig>("/api/checkin/threshold", payload);
  },
};
