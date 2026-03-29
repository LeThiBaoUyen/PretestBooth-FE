"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import Footer from "@/components/Footer";
import FaceCameraCapture from "@/components/FaceCameraCapture";
import { kycApi } from "@/lib/api/kyc";
import type { KycStatusResponse } from "@/lib/api/types";
import { useAuth } from "@/lib/hooks/useAuth";

const LIVENESS_ACTIONS: Array<"BLINK" | "SMILE"> = ["BLINK", "SMILE"];

function getActionLabel(action: "BLINK" | "SMILE") {
  return action === "BLINK" ? "Nháy mắt" : "Mỉm cười";
}

export default function KycPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, userLoading } = useAuth();

  const [status, setStatus] = useState<KycStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [challengeAction, setChallengeAction] = useState<"BLINK" | "SMILE">("BLINK");
  const [image, setImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const randomAction = LIVENESS_ACTIONS[Math.floor(Math.random() * LIVENESS_ACTIONS.length)];
    setChallengeAction(randomAction);
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!user) return;

    const loadStatus = async () => {
      try {
        setLoadingStatus(true);
        const response = await kycApi.getStatus();
        setStatus(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải trạng thái KYC");
      } finally {
        setLoadingStatus(false);
      }
    };

    loadStatus();
  }, [user, userLoading]);

  const alreadyVerified = useMemo(
    () => status?.kycStatus === "VERIFIED" && status?.hasEmbedding,
    [status],
  );

  const resetChallenge = () => {
    const randomAction = LIVENESS_ACTIONS[Math.floor(Math.random() * LIVENESS_ACTIONS.length)];
    setChallengeAction(randomAction);
    setLivenessPassed(false);
    setImage(null);
    setMessage("");
    setError("");
  };

  const submitKyc = async () => {
    if (!consentAccepted) {
      setError("Bạn cần đồng ý điều khoản xử lý dữ liệu khuôn mặt trước khi gửi.");
      return;
    }

    if (!livenessPassed) {
      setError("Vui lòng hoàn thành bước liveness trước khi gửi KYC.");
      return;
    }

    if (!image) {
      setError("Vui lòng chụp ảnh khuôn mặt trước khi gửi KYC.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await kycApi.register({
        image,
        consentVersion: "v1.0",
        liveness: {
          action: challengeAction,
          passed: true,
          confidence: 0.95,
        },
      });

      const nextStatus = await kycApi.getStatus();
      setStatus(nextStatus);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setMessage("Đăng ký KYC thành công. Bạn có thể quay lại để đặt lịch booth.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký KYC thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (userLoading || loadingStatus) {
    return <div className="p-10 text-center text-slate-600">Đang tải trạng thái KYC...</div>;
  }

  if (!user) {
    return <div className="p-10 text-center text-slate-600">Vui lòng đăng nhập để tiếp tục.</div>;
  }

  if (user.role !== "STUDENT") {
    return <div className="p-10 text-center text-red-600">Chỉ sinh viên mới cần đăng ký KYC.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col">
      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-navy-900">Facial KYC Registration</h1>
            <p className="mt-2 text-sm text-slate-600">
              Đây là bước xác thực một lần trước khi đặt lịch booth. Hệ thống chỉ lưu vector embedding,
              không lưu ảnh thô.
            </p>
          </section>

          {alreadyVerified ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
              <div className="flex items-center gap-3 text-lg font-semibold">
                <CheckCircle2 className="h-6 w-6" />
                KYC đã được xác minh
              </div>
              <p className="mt-2 text-sm">
                Bạn đã hoàn tất đăng ký khuôn mặt. Có thể tiếp tục đặt lịch sử dụng booth.
              </p>
              <button
                type="button"
                onClick={() => router.push("/booths/booking")}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Đi đến đặt lịch
              </button>
            </section>
          ) : (
            <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Bước 1: Mock Liveness</h2>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-5 w-5" />
                    <div>
                      <p className="font-semibold">Yêu cầu thao tác: {getActionLabel(challengeAction)}</p>
                      <p className="mt-1">Hoàn tất thao tác trước camera rồi nhấn xác nhận.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <label className="flex items-start gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(event) => setConsentAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt dưới dạng embedding để phục vụ KYC
                      và check-in booth.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setLivenessPassed(true)}
                    className="rounded-lg border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50"
                  >
                    Tôi đã hoàn thành thao tác {getActionLabel(challengeAction)}
                  </button>

                  <button
                    type="button"
                    onClick={resetChallenge}
                    className="ml-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Tạo thử thách mới
                  </button>
                </div>

                <button
                  type="button"
                  onClick={submitKyc}
                  disabled={submitting}
                  className="rounded-lg bg-navy-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting ? "Đang gửi KYC..." : "Gửi đăng ký KYC"}
                </button>

                {message && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {message}
                  </p>
                )}

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}
              </div>

              <div>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">Bước 2: Chụp khuôn mặt</h2>
                <FaceCameraCapture
                  image={image}
                  onImageChange={setImage}
                  disabled={submitting}
                  captureLabel="Chụp ảnh KYC"
                />
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
