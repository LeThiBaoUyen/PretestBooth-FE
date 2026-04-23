"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { kycApi } from "@/lib/api/kyc";
import type { KycManualReviewDetail, KycManualReviewItem } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/hooks";

const PAGE_SIZE = 12;

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeScore(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toFixed(4);
}

export default function AdminKycModerationPage() {
  const { user, userLoading } = useAuth();
  const canReview = hasPermission(user, "APPROVE_KYC");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<KycManualReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<KycManualReviewDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadPending = useCallback(async () => {
    if (!canReview) return;

    try {
      setLoading(true);
      setError(null);

      const response = await kycApi.getPendingManualReviews({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        sortOrder: "desc",
      });

      setRows(response.data || []);
      setTotal(response.total || 0);

      if (response.data?.length) {
        setSelectedStudentId((prev) => prev && response.data.some((row) => row.id === prev) ? prev : response.data[0].id);
      } else {
        setSelectedStudentId(null);
        setDetail(null);
      }
    } catch (err: any) {
      setRows([]);
      setTotal(0);
      setError(err?.message || "Không thể tải danh sách duyệt KYC.");
    } finally {
      setLoading(false);
    }
  }, [canReview, page, search]);

  const loadDetail = useCallback(async (studentId: string) => {
    try {
      setLoadingDetail(true);
      setError(null);
      const response = await kycApi.getManualReviewDetail(studentId);
      setDetail(response);
    } catch (err: any) {
      setDetail(null);
      setError(err?.message || "Không thể tải chi tiết hồ sơ KYC.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!canReview) return;
    void loadPending();
  }, [canReview, loadPending]);

  useEffect(() => {
    if (!selectedStudentId || !canReview) return;
    void loadDetail(selectedStudentId);
  }, [canReview, loadDetail, selectedStudentId]);

  const summary = useMemo(() => {
    return {
      total,
      page,
      totalPages,
    };
  }, [page, total, totalPages]);

  const handleApprove = useCallback(async () => {
    if (!detail) return;

    const notes = window.prompt("Nhập ghi chú duyệt (không bắt buộc):")?.trim();

    try {
      setActionLoading("approve");
      setError(null);
      setDecisionMessage(null);

      const response = await kycApi.approveManualReview(detail.id, {
        notes: notes || undefined,
      });

      setDecisionMessage(response.message);
      await loadPending();
    } catch (err: any) {
      setError(err?.message || "Duyệt hồ sơ thất bại.");
    } finally {
      setActionLoading(null);
    }
  }, [detail, loadPending]);

  const handleReject = useCallback(async () => {
    if (!detail) return;

    const reason = window.prompt("Nhập lý do từ chối (bắt buộc):")?.trim();
    if (!reason) {
      window.alert("Bạn cần nhập lý do từ chối.");
      return;
    }

    const notes = window.prompt("Nhập ghi chú thêm (không bắt buộc):")?.trim();

    try {
      setActionLoading("reject");
      setError(null);
      setDecisionMessage(null);

      const response = await kycApi.rejectManualReview(detail.id, {
        reason,
        notes: notes || undefined,
      });

      setDecisionMessage(response.message);
      await loadPending();
    } catch (err: any) {
      setError(err?.message || "Từ chối hồ sơ thất bại.");
    } finally {
      setActionLoading(null);
    }
  }, [detail, loadPending]);

  if (userLoading) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-gray-500">
          Đang tải thông tin người dùng...
        </div>
      </main>
    );
  }

  if (!canReview) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          Bạn không có quyền duyệt KYC thủ công.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Duyệt KYC thủ công</h1>
              <p className="mt-1 text-sm text-slate-600">
                Giảng viên/Admin đối sánh ảnh khuôn mặt đã đăng ký với ảnh thẻ sinh viên trước khi mở quyền đặt lịch booth.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadPending()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Tải lại
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tổng hồ sơ chờ</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Trang hiện tại</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.page}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tổng số trang</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.totalPages}</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {decisionMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {decisionMessage}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Tìm theo tên/email/mã SV"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">Đang tải danh sách...</div>
              ) : rows.length === 0 ? (
                <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">Không có hồ sơ chờ duyệt.</div>
              ) : (
                rows.map((row) => {
                  const selected = row.id === selectedStudentId;
                  return (
                    <button
                      type="button"
                      key={row.id}
                      onClick={() => setSelectedStudentId(row.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        selected
                          ? "border-navy-400 bg-navy-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-900">{row.name || row.email}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {row.studentCode || "-"} • {row.className || "-"}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Yêu cầu lúc: {formatDateTime(row.kycManualReviewRequestedAt)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Score: {normalizeScore(row.studentCardFaceMatchScore)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Trước
              </button>
              <span className="text-xs text-slate-500">
                {page}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sau
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {!selectedStudentId ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                Chọn một hồ sơ ở cột bên trái để xem chi tiết.
              </div>
            ) : loadingDetail || !detail ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                Đang tải chi tiết hồ sơ...
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{detail.name || detail.email}</h2>
                    <p className="text-sm text-slate-600">
                      {detail.email} • {detail.studentCode || "-"} • {detail.className || "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Similarity score: <span className="font-semibold">{normalizeScore(detail.studentCardFaceMatchScore)}</span>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-900">Ảnh khuôn mặt KYC</p>
                    {detail.kycFaceImageUrl ? (
                      <img
                        src={detail.kycFaceImageUrl}
                        alt="KYC face"
                        className="h-72 w-full rounded-lg object-contain bg-white"
                      />
                    ) : (
                      <div className="flex h-72 items-center justify-center rounded-lg bg-white text-sm text-slate-500">
                        Không có ảnh khuôn mặt.
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-900">Ảnh thẻ sinh viên</p>
                    {detail.studentCardImageUrl ? (
                      <img
                        src={detail.studentCardImageUrl}
                        alt="Student card"
                        className="h-72 w-full rounded-lg object-contain bg-white"
                      />
                    ) : (
                      <div className="flex h-72 items-center justify-center rounded-lg bg-white text-sm text-slate-500">
                        Không có ảnh thẻ sinh viên.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Yêu cầu duyệt lúc:</span> {formatDateTime(detail.kycManualReviewRequestedAt)}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Lần thử KYC gần nhất:</span> {formatDateTime(detail.kycLastAttemptAt)}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Lý do sinh viên gửi:</span> {detail.kycManualReviewRequestedReason || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <p>
                      Nếu từ chối, hệ thống sẽ giữ hồ sơ ở trạng thái REJECTED và yêu cầu nhập lý do bắt buộc.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleApprove()}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Duyệt KYC
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleReject()}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Từ chối
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
