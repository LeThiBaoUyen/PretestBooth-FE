"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { FormInput, SubmitButton } from "@/components/FormComponents";
import Footer from "@/components/Footer";
import { apiClient } from "@/lib/api/auth";
import { boothSessionManager } from "@/lib/auth/boothSession";

export default function BoothAuthPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    boothCode: "",
    otp: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    if (boothSessionManager.getToken() && boothSessionManager.getMeta()) {
      router.replace("/login");
    }
  }, [router]);

  const activateMutation = useMutation({
    mutationFn: () =>
      apiClient.boothActivate({
        boothCode: formData.boothCode.trim(),
        otp: formData.otp.trim(),
      }),
    onSuccess: (response) => {
      boothSessionManager.save(response.boothSessionToken, {
        boothId: response.boothId,
        boothCode: response.boothCode,
        boothName: response.boothName,
      });
      setSubmitMessage("Kích hoạt booth thành công. Chuyển sang khu vực kiosk...");
      setTimeout(() => router.push("/login"), 800);
    },
    onError: (error: Error) => {
      setSubmitMessage(error.message || "Không thể kích hoạt booth.");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.boothCode.trim()) {
      newErrors.boothCode = "Booth code không được để trống";
    }
    if (!formData.otp.trim()) {
      newErrors.otp = "OTP không được để trống";
    }
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitMessage("");
    activateMutation.mutate();
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-navy-600 mb-2">Kích hoạt Booth</h1>
              <p className="text-gray-600">Nhập booth code và OTP do admin cung cấp</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <FormInput
                type="text"
                name="boothCode"
                placeholder="Ví dụ: BOOTH-01"
                value={formData.boothCode}
                onChange={handleChange}
                required
                error={errors.boothCode}
              />

              <FormInput
                type="text"
                name="otp"
                placeholder="Nhập OTP kích hoạt"
                value={formData.otp}
                onChange={handleChange}
                required
                error={errors.otp}
              />

              <SubmitButton
                text="Kích hoạt Booth"
                isLoading={activateMutation.status === "pending"}
              />
            </form>

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

            <div className="text-center text-sm text-gray-600">
              Nếu chưa có OTP, vui lòng liên hệ admin trực ca để cấp OTP mới.
            </div>
          </div>

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-navy-600 hover:text-navy-700 font-semibold">
              Đến màn hình đăng nhập kiosk
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
