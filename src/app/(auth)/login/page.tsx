"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FormInput, SubmitButton } from "@/components/FormComponents";
import { apiClient } from "@/lib/api/auth";
import { getTokenManager } from "@/lib/auth/tokenManager";
import { boothSessionManager } from "@/lib/auth/boothSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tokenManager = getTokenManager();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [boothMeta, setBoothMeta] = useState<ReturnType<
    typeof boothSessionManager.getMeta
  > | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);

  useEffect(() => {
    // Keep first client render aligned with server HTML, then hydrate client-only data.
    setBoothMeta(boothSessionManager.getMeta());

    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next"));
  }, []);

  const resolveRedirectPath = () => {
    if (!nextPath) return "/dashboard";

    // Prevent open redirects. Only allow app-internal absolute paths.
    if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
      return "/dashboard";
    }

    return nextPath;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }
    if (!formData.password) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }
    return newErrors;
  };

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const boothSessionToken = boothSessionManager.getToken();
      if (boothSessionToken) {
        try {
          return await apiClient.boothLogin({
            email: data.email,
            password: data.password,
            boothSessionToken,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          // Non-student accounts should still be able to sign in to manage kiosk actions.
          if (message.includes("Booth login chỉ áp dụng cho sinh viên")) {
            return apiClient.login(data);
          }
          throw error;
        }
      }

      return apiClient.login(data);
    },
    onSuccess: async (response) => {
      // Save access token to TanStack Query cache
      tokenManager.saveAccessToken(response.accessToken);

      // Store user info in query cache and invalidate to trigger refetch
      queryClient.setQueryData(["user"], response.user);
      queryClient.invalidateQueries({ queryKey: ["user"] });

      const checkedInType = (response as any)?.checkedInBooking?.type as
        | "PRACTICE"
        | "EXAM"
        | undefined;
      const pendingCheckinBooking = (response as any)?.pendingCheckinBooking as
        | { id: string; type: "PRACTICE" | "EXAM" }
        | undefined;
      const boothBookingType = checkedInType || pendingCheckinBooking?.type || null;
      const boothAccessMode = (response as any)?.accessMode as
        | "SCHEDULED"
        | "WALK_IN"
        | undefined;
      const walkInProtection = (response as any)?.walkInProtection as
        | {
            nextExamStartTime?: string | null;
            warnAt?: string | null;
            forceLogoutAt?: string | null;
            noShowGraceUntil?: string | null;
          }
        | undefined;

      if (boothSessionManager.getToken() && boothSessionManager.getMeta()) {
        if (response.user.role === "STUDENT") {
          boothSessionManager.setBookingType(boothBookingType);
          boothSessionManager.setAccessMode(boothAccessMode || null);
          boothSessionManager.setWalkInProtection(walkInProtection || {});
        } else {
          boothSessionManager.setBookingType(null);
          boothSessionManager.setAccessMode(null);
          boothSessionManager.setWalkInProtection({});
        }
      }

      const kioskRedirect = checkedInType
        ? checkedInType === "PRACTICE"
          ? "/practice"
          : "/exams"
        : pendingCheckinBooking
          ? `/booth/check-in?bookingId=${encodeURIComponent(pendingCheckinBooking.id)}&type=${pendingCheckinBooking.type}`
          : null;

      setSubmitMessage("Đăng nhập thành công! Đang chuyển hướng...");
      setTimeout(() => {
        router.push(kioskRedirect || resolveRedirectPath());
      }, 1000);
    },
    onError: (error: any) => {
      const message = error?.message || "Đăng nhập thất bại. Vui lòng thử lại.";
      setSubmitMessage(message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setSubmitMessage("");
    loginMutation.mutate(formData);
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mx-auto mb-4 bg-white rounded-xl shadow-lg px-4 py-3">
                <Image
                  src="/assets/iuhcm-logo.png"
                  alt="IUHCM Logo"
                  width={220}
                  height={63}
                  className="h-12 sm:h-14 w-auto"
                />
              </div>
              <h1 className="text-3xl font-bold text-navy-600 mb-2">
                Đăng nhập
              </h1>
              <p className="text-gray-600">Chào mừng quay lại PRETEST BOOTH</p>
              {boothMeta && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <p className="font-semibold">
                    Booth đang active: {boothMeta.boothName} ({boothMeta.boothCode})
                  </p>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <FormInput
                type="email"
                name="email"
                placeholder="Nhập email của bạn"
                value={formData.email}
                onChange={handleChange}
                required
                error={errors.email}
              />

              <FormInput
                type="password"
                name="password"
                placeholder="Nhập mật khẩu"
                value={formData.password}
                onChange={handleChange}
                required
                error={errors.password}
              />

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-navy-600 focus:ring-navy-500"
                  />
                  <span className="text-gray-700">Nhớ tôi</span>
                </label>
                <Link
                  href="/forgot"
                  className="text-navy-600 hover:text-navy-700 font-medium transition"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <SubmitButton
                text="Đăng nhập"
                isLoading={loginMutation.status === "pending"}
              />
            </form>

            {/* Message */}
            {submitMessage && (
              <div
                className={`p-3 rounded-lg text-center text-sm font-medium mb-6 ${
                  submitMessage.includes("thành công")
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {submitMessage}
              </div>
            )}

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">hoặc</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 border-2 border-gray-300 hover:border-navy-300 bg-white hover:bg-navy-50 text-gray-700 font-medium py-3 rounded-lg transition"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 border-2 border-gray-300 hover:border-navy-300 bg-white hover:bg-navy-50 text-gray-700 font-medium py-3 rounded-lg transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
                Microsoft
              </button>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-gray-600">
                Chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="text-navy-600 hover:text-navy-700 font-bold transition"
                >
                  Đăng ký ngay
                </Link>
              </p>
              {!boothMeta && (
                <p className="mt-3 text-sm text-gray-500">
                  Đăng nhập tại booth?{" "}
                  <Link
                    href="/booth-auth"
                    className="text-navy-600 hover:text-navy-700 font-bold transition"
                  >
                    Kích hoạt booth tại đây
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-navy-50 rounded-2xl p-6 border-2 border-navy-200">
            <h3 className="font-bold text-navy-600 mb-3">💡 Mẹo đăng nhập</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Sử dụng email sinh viên IUHCM của bạn</li>
              <li>✓ Mật khẩu phải có ít nhất 6 ký tự</li>
              <li>✓ Bảo mật tài khoản của bạn</li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
