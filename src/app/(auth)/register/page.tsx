"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { FormInput, SubmitButton } from "@/components/FormComponents";
import { apiClient } from "@/lib/api/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = "Họ và tên không được để trống";
    } else if (formData.name.length < 2) {
      newErrors.name = "Họ và tên phải có ít nhất 2 ký tự";
    }

    if (!formData.email) {
      newErrors.email = "Email không được để trống";
    } else if (
      !/^\d{8}\.[a-z]+@(student|teacher)\.iuh\.edu\.vn$/.test(formData.email)
    ) {
      newErrors.email =
        "Email phải theo định dạng: XXXXXXXX.yourname@(student|teacher).iuh.edu.vn";
    }

    if (!formData.password) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
    }

    if (!agreeTerms) {
      newErrors.terms = "Bạn phải đồng ý với điều khoản dịch vụ";
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
      await apiClient.register({
        email: formData.email,
        name: formData.name,
        password: formData.password,
      });

      setSubmitMessage(
        "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.",
      );

      // Redirect to login after short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Đăng ký thất bại. Vui lòng thử lại.";
      setSubmitMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
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
              <h1 className="text-3xl font-bold text-navy-600 mb-2">Đăng ký</h1>
              <p className="text-gray-600">Tạo tài khoản PRETEST BOOTH mới</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <FormInput
                type="text"
                name="name"
                placeholder="Họ và tên"
                value={formData.name}
                onChange={handleChange}
                required
                error={errors.name}
              />

              <FormInput
                type="email"
                name="email"
                placeholder="Email trường (XXXXXXXX.yourname@student.iuh.edu.vn)"
                value={formData.email}
                onChange={handleChange}
                required
                error={errors.email}
              />

              {/* Email format hint */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                <p className="text-xs text-blue-700">
                  💡 <strong>Lưu ý:</strong> Sử dụng email trường với định dạng:
                  <br />
                  <span className="font-mono text-blue-800">
                    XXXXXXXX.tenban@student.iuh.edu.vn
                  </span>
                  <br />
                  hoặc{" "}
                  <span className="font-mono text-blue-800">
                    XXXXXXXX.tenban@teacher.iuh.edu.vn
                  </span>
                </p>
              </div>

              <FormInput
                type="password"
                name="password"
                placeholder="Mật khẩu (tối thiểu 6 ký tự)"
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

              {/* Terms Agreement */}
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => {
                      setAgreeTerms(e.target.checked);
                      if (e.target.checked && errors.terms) {
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.terms;
                          return newErrors;
                        });
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-navy-600 focus:ring-navy-500 mt-0.5"
                  />
                  <span className="text-sm text-gray-700">
                    Tôi đồng ý với{" "}
                    <Link
                      href="#"
                      className="text-navy-600 hover:text-navy-700 font-medium transition"
                    >
                      Điều khoản dịch vụ
                    </Link>{" "}
                    và{" "}
                    <Link
                      href="#"
                      className="text-navy-600 hover:text-navy-700 font-medium transition"
                    >
                      Chính sách bảo mật
                    </Link>
                  </span>
                </label>
                {errors.terms && (
                  <p className="text-red-500 text-sm mt-2 ml-8">
                    {errors.terms}
                  </p>
                )}
              </div>

              <SubmitButton text="Đăng ký" isLoading={isLoading} />
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

            {/* Social Register */}
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
                Đã có tài khoản?{" "}
                <Link
                  href="/login"
                  className="text-navy-600 hover:text-navy-700 font-bold transition"
                >
                  Đăng nhập
                </Link>
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-rose-50 rounded-2xl p-6 border-2 border-rose-200">
            <h3 className="font-bold text-navy-600 mb-3">
              📋 Yêu cầu mật khẩu
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Ít nhất 8 ký tự</li>
              <li>✓ Chứa ít nhất 1 chữ hoa (A-Z)</li>
              <li>✓ Chứa ít nhất 1 chữ thường (a-z)</li>
              <li>✓ Chứa ít nhất 1 số (0-9)</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
