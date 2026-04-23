"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Upload } from "lucide-react";
import FaceCameraCapture from "@/components/FaceCameraCapture";
import { kycApi } from "@/lib/api/kyc";
import type { KycStatusResponse } from "@/lib/api/types";
import { useAuth } from "@/lib/hooks/useAuth";

async function compressImageDataUrl(
  inputDataUrl: string,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number },
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 1280;
  const maxHeight = options?.maxHeight ?? 1280;
  const quality = options?.quality ?? 0.75;

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      const width = Math.max(1, Math.round(img.width * ratio));
      const height = Math.max(1, Math.round(img.height * ratio));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Không thể xử lý ảnh."));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => reject(new Error("Không thể đọc dữ liệu ảnh."));
    img.src = inputDataUrl;
  });
}

export default function KycPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, userLoading } = useAuth();

  const [status, setStatus] = useState<KycStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [studentCardImage, setStudentCardImage] = useState<string | null>(null);
  const [studentCardCaptureMode, setStudentCardCaptureMode] = useState<"camera" | "upload">("upload");
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestingManualReview, setRequestingManualReview] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

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
    () => status?.kycStatus === "VERIFIED" && status?.hasEmbedding && status?.cardVerified,
    [status],
  );

  const isManualReviewPending = status?.kycManualReviewStatus === "PENDING";
  const canRequestManualReview =
    status?.kycStatus === "REJECTED" && status?.kycManualReviewStatus !== "PENDING";

  const resetForm = () => {
    setStudentCardImage(null);
    setFaceImage(null);
    setMessage("");
    setError("");
  };

  const onSelectStudentCardFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh hợp lệ cho thẻ sinh viên.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!dataUrl) {
        setError("Không thể đọc file ảnh thẻ sinh viên.");
        return;
      }

      try {
        const compressed = await compressImageDataUrl(dataUrl, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.75,
        });
        setStudentCardImage(compressed);
        setError("");
      } catch {
        setError("Không thể xử lý file ảnh thẻ sinh viên.");
      }
    };
    reader.readAsDataURL(file);
  };

  const submitKyc = async () => {
    if (!consentAccepted) {
      setError("Bạn cần đồng ý điều khoản xử lý dữ liệu khuôn mặt trước khi gửi.");
      return;
    }

    if (!studentCardImage) {
      setError("Vui lòng cung cấp ảnh thẻ sinh viên (chụp hoặc upload) trước khi gửi KYC.");
      return;
    }

    if (!faceImage) {
      setError("Vui lòng chụp ảnh khuôn mặt trước khi gửi KYC.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const [compressedFaceImage, compressedStudentCardImage] = await Promise.all([
        compressImageDataUrl(faceImage, {
          maxWidth: 960,
          maxHeight: 960,
          quality: 0.65,
        }),
        compressImageDataUrl(studentCardImage, {
          maxWidth: 960,
          maxHeight: 960,
          quality: 0.65,
        }),
      ]);

      await kycApi.register({
        image: compressedFaceImage,
        studentCardImage: compressedStudentCardImage,
        consentVersion: "v2.0",
      });

      const nextStatus = await kycApi.getStatus();
      setStatus(nextStatus);
      queryClient.invalidateQueries({ queryKey: ["user"] });

      if (nextStatus.kycStatus === "VERIFIED") {
        setMessage("Đăng ký KYC thành công. Bạn có thể quay lại để đặt lịch booth.");
      } else {
        setMessage("Hồ sơ KYC đã được gửi. Nếu bị từ chối, bạn có thể gửi yêu cầu duyệt thủ công.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký KYC thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const requestManualReview = async () => {
    if (!canRequestManualReview) {
      return;
    }

    const reason = window.prompt("Nhập lý do yêu cầu duyệt thủ công (không bắt buộc):")?.trim();

    try {
      setRequestingManualReview(true);
      setError("");
      setMessage("");

      await kycApi.requestManualReview({
        reason: reason || undefined,
      });

      const nextStatus = await kycApi.getStatus();
      setStatus(nextStatus);
      setMessage("Đã gửi yêu cầu duyệt KYC thủ công. Vui lòng chờ giảng viên/admin xác nhận.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi yêu cầu duyệt thủ công");
    } finally {
      setRequestingManualReview(false);
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
              Đây là bước xác thực một lần trước khi đặt lịch booth. Hệ thống lưu embedding khuôn mặt và
              ảnh KYC để phục vụ duyệt thủ công khi cần thiết.
            </p>
          </section>

          {isManualReviewPending && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">Yêu cầu duyệt thủ công đang được xử lý</p>
                  <p className="mt-1 text-sm">
                    Giảng viên/Admin đang so sánh ảnh khuôn mặt KYC với ảnh thẻ sinh viên. Khi được duyệt,
                    bạn có thể đặt lịch booth ngay.
                  </p>
                </div>
              </div>
            </section>
          )}

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
                <h2 className="text-lg font-semibold text-slate-900">Bước 1: Cung cấp ảnh thẻ sinh viên</h2>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Tải ảnh thẻ sinh viên hoặc chụp trực tiếp bằng camera. Hệ thống sẽ đối sánh ảnh thẻ
                  với ảnh khuôn mặt ở bước kế tiếp.
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setStudentCardCaptureMode("upload")}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        studentCardCaptureMode === "upload"
                          ? "bg-navy-600 text-white"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Upload file
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentCardCaptureMode("camera")}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        studentCardCaptureMode === "camera"
                          ? "bg-navy-600 text-white"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Chụp bằng camera
                    </button>
                  </div>

                  {studentCardCaptureMode === "upload" ? (
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                      <Upload className="h-4 w-4" />
                      <span>Chọn ảnh thẻ sinh viên (JPG/PNG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onSelectStudentCardFile}
                        className="hidden"
                        disabled={submitting}
                      />
                    </label>
                  ) : (
                    <FaceCameraCapture
                      image={studentCardImage}
                      onImageChange={setStudentCardImage}
                      disabled={submitting}
                      captureLabel="Chụp ảnh thẻ sinh viên"
                    />
                  )}

                  {studentCardImage && studentCardCaptureMode === "upload" && (
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <img
                        src={studentCardImage}
                        alt="Student card preview"
                        className="max-h-56 w-full rounded object-contain"
                      />
                    </div>
                  )}

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
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Làm mới dữ liệu ảnh
                </button>

                <button
                  type="button"
                  onClick={submitKyc}
                  disabled={submitting || requestingManualReview}
                  className="rounded-lg bg-navy-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting ? "Đang gửi KYC..." : "Gửi đăng ký KYC"}
                </button>

                {canRequestManualReview && (
                  <button
                    type="button"
                    onClick={requestManualReview}
                    disabled={submitting || requestingManualReview}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {requestingManualReview ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {requestingManualReview ? "Đang gửi yêu cầu..." : "Yêu cầu duyệt thủ công"}
                  </button>
                )}

                {status?.kycManualReviewStatus === "REJECTED" && status?.kycManualReviewRejectionReason && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Lý do từ chối duyệt thủ công: {status.kycManualReviewRejectionReason}
                  </p>
                )}

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
                  image={faceImage}
                  onImageChange={setFaceImage}
                  disabled={submitting}
                  captureLabel="Chụp ảnh KYC"
                />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
