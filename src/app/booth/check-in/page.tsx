"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import FaceCameraCapture from "@/components/FaceCameraCapture";
import { checkinApi } from "@/lib/api/checkin";
import { boothSessionManager } from "@/lib/auth/boothSession";
import { useAuth } from "@/lib/hooks/useAuth";

export default function BoothCheckInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userLoading } = useAuth();

  const bookingId = searchParams.get("bookingId");
  const bookingType = (searchParams.get("type") || "") as "PRACTICE" | "EXAM";
  const [image, setImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  const nextPath = useMemo(() => {
    if (bookingType === "PRACTICE") return "/practice";
    if (bookingType === "EXAM") return "/exams";
    return "/dashboard";
  }, [bookingType]);

  const resetAttempt = () => {
    setImage(null);
  };

  const handleVerify = async () => {
    if (!bookingId) {
      setError("Thiếu bookingId để xác thực check-in.");
      return;
    }

    if (!image) {
      setError("Vui lòng chụp ảnh khuôn mặt trước khi xác thực.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await checkinApi.verify({
        bookingId,
        image,
        verifierDeviceId: boothSessionManager.getMeta()?.boothCode,
      });

      if (response.matched) {
        setResultMessage("Xác thực thành công. Đang chuyển vào phiên làm bài...");
        setTimeout(() => router.push(nextPath), 900);
      } else {
        setError(
          `Xác thực thất bại (similarity=${response.similarityScore.toFixed(4)}). Vui lòng thử lại.`,
        );
        resetAttempt();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác thực check-in thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (userLoading) {
    return <div className="p-10 text-center text-slate-600">Đang kiểm tra thông tin người dùng...</div>;
  }

  if (!user) {
    return (
      <div className="p-10 text-center text-slate-600">
        Vui lòng đăng nhập để check-in. <Link href="/login" className="font-semibold text-navy-700">Đến trang đăng nhập</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur">
          <h1 className="text-2xl font-bold">Booth Facial Check-in</h1>
          <p className="mt-2 text-sm text-slate-200">
            Chụp khuôn mặt để xác thực check-in trước khi vào ca học.
          </p>
          {bookingId && (
            <p className="mt-2 text-xs text-slate-300">Booking ID: {bookingId}</p>
          )}
        </section>

        <section className="grid gap-6 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur lg:grid-cols-2">
          <div className="space-y-4">
            <p className="rounded-xl border border-cyan-200/40 bg-cyan-200/10 p-4 text-sm text-cyan-100">
              Nhìn thẳng camera, đảm bảo đủ sáng rồi bấm xác thực.
            </p>

            <button
              type="button"
              onClick={handleVerify}
              disabled={submitting}
              className="block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {submitting ? "Đang xác thực..." : "Xác thực check-in"}
            </button>

            {resultMessage && (
              <div className="rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> {resultMessage}
                </span>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-300/40 bg-red-300/10 px-3 py-2 text-sm text-red-100">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <XCircle className="h-4 w-4" /> {error}
                </span>
              </div>
            )}
          </div>

          <FaceCameraCapture
            image={image}
            onImageChange={setImage}
            disabled={submitting}
            captureLabel="Chụp khuôn mặt để check-in"
          />
        </section>
      </div>
    </main>
  );
}
