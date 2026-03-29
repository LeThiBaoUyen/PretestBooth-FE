import { httpClient } from "./httpClient";
import type { CheckinVerifyRequest, CheckinVerifyResponse } from "./types";

export const checkinApi = {
  verify: (payload: CheckinVerifyRequest) => {
    return httpClient.post<CheckinVerifyResponse>("/api/checkin/verify", payload);
  },
};
