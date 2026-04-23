import { httpClient } from "./httpClient";
import type {
  ApproveKycManualReviewRequest,
  KycManualReviewDetail,
  KycManualReviewListResponse,
  KycCardThresholdConfig,
  KycRegisterRequest,
  KycRegisterResponse,
  KycStatusResponse,
  ManualReviewDecisionResponse,
  QueryKycManualReviewRequest,
  RejectKycManualReviewRequest,
  RequestKycManualReviewRequest,
  RequestKycManualReviewResponse,
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

  requestManualReview: (payload: RequestKycManualReviewRequest) => {
    return httpClient.post<RequestKycManualReviewResponse>("/api/kyc/manual-review/request", payload);
  },

  getPendingManualReviews: (query: QueryKycManualReviewRequest = {}) => {
    const params = new URLSearchParams();

    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search) params.set("search", query.search);
    if (query.sortOrder) params.set("sortOrder", query.sortOrder);

    const suffix = params.toString();
    return httpClient.get<KycManualReviewListResponse>(
      `/api/kyc/manual-review/pending${suffix ? `?${suffix}` : ""}`,
    );
  },

  getManualReviewDetail: (studentId: string) => {
    return httpClient.get<KycManualReviewDetail>(`/api/kyc/manual-review/${studentId}`);
  },

  approveManualReview: (studentId: string, payload: ApproveKycManualReviewRequest) => {
    return httpClient.post<ManualReviewDecisionResponse>(
      `/api/kyc/manual-review/${studentId}/approve`,
      payload,
    );
  },

  rejectManualReview: (studentId: string, payload: RejectKycManualReviewRequest) => {
    return httpClient.post<ManualReviewDecisionResponse>(
      `/api/kyc/manual-review/${studentId}/reject`,
      payload,
    );
  },
};
