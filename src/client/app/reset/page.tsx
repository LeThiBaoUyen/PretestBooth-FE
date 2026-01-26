"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/client/components/Header";
import Footer from "@/client/components/Footer";
import { FormInput, SubmitButton } from "@/client/components/FormComponents";

export default function ResetPasswordPage() {
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
    }

    if (!formData.password) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (formData.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
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
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSubmitMessage(
        "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.",
      );
      setFormData({ email: "", code: "", password: "", confirmPassword: "" });
    } catch (error) {
      setSubmitMessage("Cập nhật thất bại. Vui lòng thử lại.");
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
                Cập nhật mật khẩu
              </h1>
              <p className="text-gray-600">
                Nhập mã xác thực và mật khẩu mới của bạn
              </p>
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
                placeholder="Mã xác thực (OTP)"
                value={formData.code}
                onChange={handleChange}
                required
                error={errors.code}
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
              <Link
                href="/login"
                className="text-navy-600 hover:text-navy-700 font-semibold"
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
