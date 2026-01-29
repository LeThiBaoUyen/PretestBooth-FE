"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/client/components/Header";
import Footer from "@/client/components/Footer";
import { apiClient } from "@/client/lib/api/auth";

export default function AuthVerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Không tìm thấy token xác thực trong URL.");
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await apiClient.verifyEmail({ token });
      setStatus("success");
      setMessage(response.message || "Email đã được xác thực thành công!");

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      setStatus("error");
      const errorMessage =
        error instanceof Error ? error.message : "Xác thực email thất bại. Token có thể đã hết hạn.";
      setMessage(errorMessage);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 py-12 px-4">
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
                Xác thực Email
              </h1>
              <p className="text-gray-600">
                {status === "loading" && "Đang xác thực email của bạn..."}
                {status === "success" && "Email đã được xác thực!"}
                {status === "error" && "Có lỗi xảy ra"}
              </p>
            </div>

            {/* Status Icon */}
            <div className="flex justify-center mb-6">
              {status === "loading" && (
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-navy-600 border-t-transparent"></div>
              )}
              {status === "success" && (
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
              {status === "error" && (
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Message */}
            <div
              className={`p-4 rounded-lg text-center text-sm font-medium mb-6 ${
                status === "success"
                  ? "bg-green-100 text-green-700"
                  : status === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {message}
            </div>

            {/* Actions */}
            {status === "success" && (
              <div className="text-center space-y-3">
                <p className="text-gray-600 text-sm mb-4">
                  Đang tự động chuyển đến trang đăng nhập sau 3 giây...
                </p>
                <Link
                  href="/login"
                  className="inline-block w-full bg-navy-600 hover:bg-navy-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Đăng nhập ngay
                </Link>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <Link
                  href="/register"
                  className="block w-full text-center bg-navy-600 hover:bg-navy-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Đăng ký lại
                </Link>
                <Link
                  href="/login"
                  className="block text-center text-navy-600 hover:text-navy-700 font-medium transition"
                >
                  Quay lại đăng nhập
                </Link>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-navy-50 rounded-2xl p-6 border-2 border-navy-200">
            <h3 className="font-bold text-navy-600 mb-3">💡 Lưu ý</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Token xác thực có thời hạn sử dụng</li>
              <li>✓ Nếu token hết hạn, vui lòng đăng ký lại</li>
              <li>✓ Kiểm tra hộp thư spam nếu không nhận được email</li>
              <li>✓ Liên hệ hỗ trợ nếu vấn đề vẫn tiếp tục</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
