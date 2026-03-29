// Authentication API Service

import type {
  LoginRequest,
  LoginResponse,
  BoothActivateRequest,
  BoothActivateResponse,
  BoothLogoutRequest,
  BoothLoginRequest,
  BoothLoginResponse,
  BoothSessionStatusResponse,
  GenerateBoothActivationOtpRequest,
  GenerateBoothActivationOtpResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ApiError,
} from "./types";
import { httpClient } from "./httpClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const jsonResponse = await response.json();

      if (!response.ok) {
        const error: ApiError = jsonResponse;
        throw new Error(
          Array.isArray(error.message)
            ? error.message.join(", ")
            : error.message,
        );
      }

      // Backend wraps responses in { statusCode, message, data }
      // Extract the actual data
      return jsonResponse.data || jsonResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(
    data: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse> {
    return this.request<ForgotPasswordResponse>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async resetPassword(
    data: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    return this.request<ResetPasswordResponse>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    return this.request<VerifyEmailResponse>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async resendVerification(
    data: ResendVerificationRequest,
  ): Promise<ResendVerificationResponse> {
    return this.request<ResendVerificationResponse>(
      "/api/auth/resend-verification",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async logout(accessToken: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async getMe(accessToken: string): Promise<LoginResponse["user"]> {
    return this.request<LoginResponse["user"]>("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async boothActivate(data: BoothActivateRequest): Promise<BoothActivateResponse> {
    return this.request<BoothActivateResponse>("/api/auth/booth-activate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async boothLogin(data: BoothLoginRequest): Promise<BoothLoginResponse> {
    return this.request<BoothLoginResponse>("/api/auth/booth-login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async boothLogout(
    data: BoothLogoutRequest,
    accessToken?: string,
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/auth/booth-logout", {
      method: "POST",
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
      body: JSON.stringify(data),
    });
  }

  async getBoothSessionStatus(
    boothSessionToken: string,
  ): Promise<BoothSessionStatusResponse> {
    const encodedToken = encodeURIComponent(boothSessionToken);
    return this.request<BoothSessionStatusResponse>(
      `/api/auth/booth-session?boothSessionToken=${encodedToken}`,
      { method: "GET" },
    );
  }

  async generateBoothActivationOtp(
    data: GenerateBoothActivationOtpRequest,
  ): Promise<GenerateBoothActivationOtpResponse> {
    return httpClient.post<GenerateBoothActivationOtpResponse>(
      "/api/booths/activation-otp",
      data,
    );
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
