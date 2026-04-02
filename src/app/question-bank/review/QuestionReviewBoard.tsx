"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, MessageSquare, RefreshCw, Wrench, XCircle } from "lucide-react";
import { questionsApiClient } from "@/lib/api/questions";
import type { QuestionReviewSession, QuestionReviewStatus } from "@/lib/api/types";
import { useAuth } from "@/lib/hooks/useAuth";

type ReviewDecisionStatus = "APPROVED" | "NEEDS_REVISION";

const REVIEWABLE_STATUSES: ReviewDecisionStatus[] = [
  "APPROVED",
  "NEEDS_REVISION",
];

const QUICK_STATUS_FILTERS: Array<{ label: string; value: QuestionReviewStatus | "ALL" }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Chờ duyệt", value: "PENDING" },
  { label: "Chờ duyệt lại", value: "RESUBMITTED" },
  { label: "Cần sửa", value: "NEEDS_REVISION" },
  { label: "Đã duyệt", value: "APPROVED" },
];

function getCurrentQuarter() {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

function getStatusText(status: QuestionReviewStatus) {
  switch (status) {
    case "PENDING":
      return "Chờ duyệt";
    case "RESUBMITTED":
      return "Chờ duyệt lại";
    case "APPROVED":
      return "Đã duyệt";
    case "NEEDS_REVISION":
      return "Cần sửa";
    case "SKIPPED":
      return "Bỏ qua";
  }
}

function getStatusClass(status: QuestionReviewStatus) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "RESUBMITTED":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "NEEDS_REVISION":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "SKIPPED":
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getStatusIcon(status: QuestionReviewStatus) {
  switch (status) {
    case "PENDING":
      return <Clock3 className="h-3.5 w-3.5" />;
    case "RESUBMITTED":
      return <RefreshCw className="h-3.5 w-3.5" />;
    case "APPROVED":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "NEEDS_REVISION":
      return <Wrench className="h-3.5 w-3.5" />;
    case "SKIPPED":
      return <XCircle className="h-3.5 w-3.5" />;
  }
}

function getDecisionActionText(status: ReviewDecisionStatus) {
  switch (status) {
    case "APPROVED":
      return "Duyệt";
    case "NEEDS_REVISION":
      return "Yêu cầu sửa";
  }
}

export default function QuestionReviewBoard() {
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();

  const now = useMemo(() => new Date(), []);
  const [quarter, setQuarter] = useState<number>(getCurrentQuarter());
  const [year, setYear] = useState<number>(now.getFullYear());
  const [status, setStatus] = useState<QuestionReviewStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [notesBySession, setNotesBySession] = useState<Record<string, string>>({});
  const [statusBySession, setStatusBySession] = useState<Record<string, ReviewDecisionStatus>>({});

  const isAuthorized = !!user && ["LECTURER", "ADMIN"].includes(user.role);
  const canGenerate = user?.role === "ADMIN";

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const sessionsQuery = useQuery({
    queryKey: ["question-review-sessions", quarter, year, status, page, accessToken],
    queryFn: () =>
      questionsApiClient.getReviewSessions(
        {
          quarter,
          year,
          status: status === "ALL" ? undefined : status,
          page,
          limit: 10,
        },
        accessToken!,
      ),
    enabled: isAuthorized && !!accessToken,
  });

  useEffect(() => {
    if (!sessionsQuery.data?.data) return;

    const nextNotes: Record<string, string> = {};
    const nextStatus: Record<string, ReviewDecisionStatus> = {};

    sessionsQuery.data.data.forEach((session: QuestionReviewSession) => {
      nextNotes[session.id] = session.notes || "";
      nextStatus[session.id] =
        session.status === "NEEDS_REVISION" ? "NEEDS_REVISION" : "APPROVED";
    });

    setNotesBySession((prev) => ({ ...prev, ...nextNotes }));
    setStatusBySession((prev) => ({ ...prev, ...nextStatus }));
  }, [sessionsQuery.data]);

  const submitMutation = useMutation({
    mutationFn: (payload: { sessionId: string; status: ReviewDecisionStatus; notes?: string }) =>
      questionsApiClient.submitQuestionReview(payload, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-review-sessions"] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      questionsApiClient.generateReviewSessions(
        {
          quarter,
          year,
        },
        accessToken!,
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["question-review-sessions"] });
      alert(`Đã tạo ${result.createdSessions}/${result.totalPublishedQuestions} session cho Q${result.quarter}/${result.year}.`);
    },
  });

  const handleSubmitSession = async (sessionId: string) => {
    const chosenStatus = statusBySession[sessionId] || "APPROVED";
    const notes = notesBySession[sessionId]?.trim();

    await submitMutation.mutateAsync({
      sessionId,
      status: chosenStatus,
      notes: notes || undefined,
    });
  };

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          Bạn không có quyền truy cập chức năng review câu hỏi.
        </div>
      </div>
    );
  }

  const reviewData = sessionsQuery.data;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-700">Rà soát câu hỏi theo quý</h1>
          <p className="mt-1 text-sm text-slate-600">
            Giảng viên duyệt, yêu cầu chỉnh sửa và lưu ghi chú audit trail.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/question-bank/questions"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Quay lại ngân hàng
          </Link>
          {canGenerate && (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-600 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
              Tạo session quý này
            </button>
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Tổng</p>
          <p className="text-2xl font-bold text-slate-800">{reviewData?.stats.total ?? 0}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="text-xs text-amber-600">Chờ duyệt</p>
          <p className="text-2xl font-bold text-amber-700">{reviewData?.stats.pending ?? 0}</p>
        </div>
        <div className="rounded-lg bg-cyan-50 p-3">
          <p className="text-xs text-cyan-600">Chờ duyệt lại</p>
          <p className="text-2xl font-bold text-cyan-700">{reviewData?.stats.resubmitted ?? 0}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs text-emerald-600">Đã duyệt</p>
          <p className="text-2xl font-bold text-emerald-700">{reviewData?.stats.approved ?? 0}</p>
        </div>
        <div className="rounded-lg bg-rose-50 p-3">
          <p className="text-xs text-rose-600">Cần sửa</p>
          <p className="text-2xl font-bold text-rose-700">{reviewData?.stats.needsRevision ?? 0}</p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Lọc nhanh theo trạng thái</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_STATUS_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setStatus(item.value);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                status === item.value
                  ? "bg-navy-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Quý</label>
          <select
            value={quarter}
            onChange={(e) => {
              setQuarter(Number(e.target.value));
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={1}>Quý 1</option>
            <option value={2}>Quý 2</option>
            <option value={3}>Quý 3</option>
            <option value={4}>Quý 4</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Năm</label>
          <select
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as QuestionReviewStatus | "ALL");
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">Tất cả</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="RESUBMITTED">Chờ duyệt lại</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="NEEDS_REVISION">Cần sửa</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => sessionsQuery.refetch()}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Làm mới
          </button>
        </div>
      </div>

      {sessionsQuery.isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-navy-600" />
        </div>
      ) : sessionsQuery.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          Không tải được danh sách review session. Vui lòng thử lại.
        </div>
      ) : reviewData?.data.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Không có session review phù hợp bộ lọc.
        </div>
      ) : (
        <div className="space-y-4">
          {reviewData?.data.map((session) => (
            <div key={session.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{session.question.content}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {session.question.subject?.name || "Không rõ môn"}
                    {session.question.topic?.name ? ` • ${session.question.topic.name}` : ""}
                    {` • ${session.question.difficulty}`}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(session.status)}`}
                >
                  {getStatusIcon(session.status)}
                  {getStatusText(session.status)}
                </span>
              </div>

              {session.question.choices && session.question.choices.length > 0 && (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Đáp án/Options</p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {session.question.choices.map((choice) => (
                      <li key={choice.id} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${choice.isCorrect ? "bg-emerald-500" : "bg-slate-300"}`} />
                        <span>{choice.content}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quyết định review
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {REVIEWABLE_STATUSES.map((item) => (
                      <button
                        key={item}
                        onClick={() =>
                          setStatusBySession((prev) => ({
                            ...prev,
                            [session.id]: item,
                          }))
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          statusBySession[session.id] === item
                            ? "bg-navy-600 text-white"
                            : "border border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        {getDecisionActionText(item)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reviewer gần nhất
                  </label>
                  <p className="text-sm text-slate-700">
                    {session.reviewer?.name || session.reviewer?.email || "Chưa có"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {session.reviewedAt ? new Date(session.reviewedAt).toLocaleString("vi-VN") : "--"}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ghi chú review
                </label>
                <textarea
                  value={notesBySession[session.id] ?? ""}
                  onChange={(e) =>
                    setNotesBySession((prev) => ({
                      ...prev,
                      [session.id]: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Nhập ghi chú audit trail cho quyết định review..."
                />
              </div>

              {session.actions && session.actions.length > 0 && (
                <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <summary className="cursor-pointer font-semibold">Lịch sử review ({session.actions.length})</summary>
                  <div className="mt-2 space-y-2">
                    {session.actions.map((action) => (
                      <div key={action.id} className="rounded-md border border-slate-200 bg-white p-2">
                        <p className="font-medium">
                          {getStatusText(action.status)} - {action.reviewer?.name || action.reviewer?.email || action.reviewedBy}
                        </p>
                        <p className="text-xs text-slate-500">{new Date(action.reviewedAt).toLocaleString("vi-VN")}</p>
                        {action.notes && (
                          <p className="mt-1 flex items-start gap-1 text-xs text-slate-700">
                            <MessageSquare className="mt-0.5 h-3 w-3" />
                            <span>{action.notes}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <div className="mt-3 flex items-center justify-end gap-2">
                <Link
                  href={`/question-bank/questions/${session.question.id}/edit?reviewSessionId=${session.id}&returnTo=${encodeURIComponent(`/question-bank/review?quarter=${quarter}&year=${year}&status=${status}&page=${page}`)}`}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sửa câu hỏi
                </Link>
                <button
                  onClick={() => handleSubmitSession(session.id)}
                  disabled={submitMutation.isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitMutation.isPending ? "Đang lưu..." : "Lưu review"}
                </button>
              </div>
            </div>
          ))}

          {reviewData?.pagination.totalPages && reviewData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-sm text-slate-600">
                Trang {page}/{reviewData.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(reviewData.pagination.totalPages, p + 1))}
                disabled={page === reviewData.pagination.totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
