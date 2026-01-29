"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/client/components/Header";
import Footer from "@/client/components/Footer";
import { FormInput, SubmitButton } from "@/client/components/FormComponents";
import { apiClient } from "@/client/lib/api/auth";

export default function ForgotPasswordPage() {
  const [formData, setFormData] = useState({ email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

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
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setSubmitMessage("");
    try {
      await apiClient.forgotPassword({ email: formData.email });
      setSubmitMessage(
        "Mã xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.",
      );
      setFormData({ email: "" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gửi yêu cầu thất bại. Vui lòng thử lại.";
      setSubmitMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
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
                Quên mật khẩu
              </h1>
              <p className="text-gray-600">
                Nhập email để nhận liên kết đặt lại mật khẩu
              </p>
            </div>

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

              <SubmitButton text="Gửi liên kết đặt lại" isLoading={isLoading} />
            </form>

            {submitMessage && (
              <div
                className={`p-3 rounded-lg text-center text-sm font-medium mb-6 ${
                  !submitMessage.includes("thất bại")
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {submitMessage}
              </div>
            )}

            {submitMessage && !submitMessage.includes("thất bại") && (
              <div className="mb-6">
                <Link
                  href="/reset"
                  className="block w-full text-center bg-navy-600 hover:bg-navy-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Nhập mã xác thực
                </Link>
              </div>
            )}

            <div className="text-center space-y-2">
              <Link
                href="/login"
                className="text-navy-600 hover:text-navy-700 font-semibold"
              >
                Quay lại đăng nhập
              </Link>
              <div className="text-gray-600">
                Chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="text-navy-600 hover:text-navy-700 font-bold"
                >
                  Đăng ký ngay
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
