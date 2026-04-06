import { httpClient } from "./httpClient";
import type {
  BoothPolicyConfigResponse,
  UpdateBoothPolicyRequest,
} from "./types";

export const boothPoliciesApi = {
  getBoothPolicyConfig: () => {
    return httpClient.get<BoothPolicyConfigResponse>("/api/booth-policies");
  },
  updateBoothPolicyConfig: (payload: UpdateBoothPolicyRequest) => {
    return httpClient.patch<BoothPolicyConfigResponse>("/api/booth-policies", payload);
  },
};
