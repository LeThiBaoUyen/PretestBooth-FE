import { httpClient } from "./httpClient";
import type {
  KycCardThresholdConfig,
  KycRegisterRequest,
  KycRegisterResponse,
  KycStatusResponse,
  UpdateKycCardThresholdRequest,
} from "./types";

export const kycApi = {
  register: (payload: KycRegisterRequest) => {
    return httpClient.post<KycRegisterResponse>("/api/kyc/register", payload);
  },

  getStatus: () => {
    return httpClient.get<KycStatusResponse>("/api/kyc/status");
  },

  getCardThreshold: () => {
    return httpClient.get<KycCardThresholdConfig>("/api/kyc/card-threshold");
  },

  updateCardThreshold: (payload: UpdateKycCardThresholdRequest) => {
    return httpClient.post<KycCardThresholdConfig>("/api/kyc/card-threshold", payload);
  },
};
