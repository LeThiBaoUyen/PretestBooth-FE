"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FormInput, SubmitButton } from "@/components/FormComponents";
import { apiClient } from "@/lib/api/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
  });
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

    if (!formData.code) {
      newErrors.code = "Mã xác thực không được để trống";
    } else if (!/^\d{6}$/.test(formData.code)) {
      newErrors.code = "Mã xác thực phải là 6 chữ số";
    }

    if (!formData.password) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
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
      await apiClient.resetPassword({
        email: formData.email,
        code: formData.code,
        newPassword: formData.password,
      });

      setSubmitMessage(
        "Mật khẩu đã được cập nhật thành công. Đang chuyển đến trang đăng nhập...",
      );

      // Redirect to login after short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Cập nhật mật khẩu thất bại. Vui lòng thử lại.";
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
                Đặt lại mật khẩu
              </h1>
              <p className="text-gray-600">
                Nhập mã xác thực 6 chữ số và mật khẩu mới
              </p>
            </div>

            {/* Info Alert */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Mã xác thực có hiệu lực trong <strong>5 phút</strong>. Nếu
                    hết hạn, vui lòng yêu cầu mã mới.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <FormInput
                type="email"
                name="email"
                placeholder="Email đăng ký"
                value={formData.email}
                onChange={handleChange}
                required
                error={errors.email}
              />

              <FormInput
                type="text"
                name="code"
                placeholder="Mã xác thực 6 chữ số"
                value={formData.code}
                onChange={handleChange}
                required
                error={errors.code}
                maxLength={6}
              />

              <FormInput
                type="password"
                name="password"
                placeholder="Mật khẩu mới"
                value={formData.password}
                onChange={handleChange}
                required
                error={errors.password}
              />

              <FormInput
                type="password"
                name="confirmPassword"
                placeholder="Xác nhận mật khẩu"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                error={errors.confirmPassword}
              />

              <SubmitButton text="Cập nhật mật khẩu" isLoading={isLoading} />
            </form>

            {submitMessage && (
              <div
                className={`p-3 rounded-lg text-center text-sm font-medium mb-6 ${
                  submitMessage.includes("đã được cập nhật")
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {submitMessage}
              </div>
            )}

            <div className="text-center space-y-2">
              <div>
                <Link
                  href="/forgot"
                  className="text-sm text-gray-600 hover:text-navy-600 transition"
                >
                  Chưa nhận được mã? Gửi lại
                </Link>
              </div>
              <Link
                href="/login"
                className="block text-navy-600 hover:text-navy-700 font-semibold"
              >
                Quay lại đăng nhập
              </Link>
              <div className="text-gray-600">
                Cần hỗ trợ?{" "}
                <Link
                  href="/contact"
                  className="text-navy-600 hover:text-navy-700 font-bold"
                >
                  Liên hệ hỗ trợ
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
