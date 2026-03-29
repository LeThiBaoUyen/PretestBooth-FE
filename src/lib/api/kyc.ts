import { httpClient } from "./httpClient";
import type {
  KycRegisterRequest,
  KycRegisterResponse,
  KycStatusResponse,
} from "./types";

export const kycApi = {
  register: (payload: KycRegisterRequest) => {
    return httpClient.post<KycRegisterResponse>("/api/kyc/register", payload);
  },

  getStatus: () => {
    return httpClient.get<KycStatusResponse>("/api/kyc/status");
  },
};
