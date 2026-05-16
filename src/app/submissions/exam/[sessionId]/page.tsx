"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { examsApiClient } from "@/lib/api/exams";
import { useAuth } from "@/lib/hooks";
import type {
  SessionResultItem,
  ExamSessionStatus,
  QuestionType,
  ResultPublicationStatus,
  SessionResultTestCase,
} from "@/lib/api/types";

const STATUS_COLORS: Record<ExamSessionStatus, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-indigo-100 text-indigo-800",
  GRADED: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<ExamSessionStatus, string> = {
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  GRADED: "Đã chấm",
};

const PUBLICATION_STATUS_COLORS: Record<ResultPublicationStatus, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
};

const PUBLICATION_STATUS_LABELS: Record<ResultPublicationStatus, string> = {
  PENDING_REVIEW: "Chờ duyệt công bố",
  PUBLISHED: "Đã công bố",
};

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Đang chấm",
  RUNNING: "Đang chạy",
  ACCEPTED: "Đạt",
  WRONG_ANSWER: "Sai kết quả",
  COMPILE_ERROR: "Lỗi biên dịch",
  COMPILATION_ERROR: "Lỗi biên dịch",
  RUNTIME_ERROR: "Lỗi runtime",
  TIME_LIMIT_EXCEEDED: "Quá thời gian",
  MEMORY_LIMIT_EXCEEDED: "Quá bộ nhớ",
  INTERNAL_ERROR: "Lỗi hệ thống",
};

function questionTypeLabel(questionType?: QuestionType) {
  if (!questionType) return null;
  if (questionType === "SINGLE_CHOICE") return "Một đáp án";
  if (questionType === "MULTIPLE_CHOICE") return "Nhiều đáp án";
  return "Trả lời ngắn";
}

function submissionStatusLabel(status: string) {
  return SUBMISSION_STATUS_LABELS[status] || status;
}

function testCaseBadgeClass(testCase: SessionResultTestCase) {
  return testCase.passed
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-red-200 bg-red-50 text-red-700";
}

function proctoringEventLabel(eventType: string) {
  if (eventType === "TAB_SWITCH") return "Chuyển tab / rời khỏi màn hình thi";
  if (eventType === "WINDOW_BLUR") return "Mất focus cửa sổ thi";
  if (eventType === "FULLSCREEN_EXIT") return "Thoát toàn màn hình";
  if (eventType === "COPY_PASTE") return "Sử dụng copy/paste";
  if (eventType === "MULTIPLE_FACES") return "Nhiều khuôn mặt trong khung hình";
  if (eventType === "NO_FACE") return "Không phát hiện khuôn mặt";
  if (eventType === "DEVICE_DISCONNECTED") return "Thiết bị giám sát bị ngắt kết nối";
  return eventType;
}

function warningLevelClass(level: number) {
  if (level >= 3) return "bg-red-100 text-red-800";
  if (level === 2) return "bg-orange-100 text-orange-800";
  return "bg-amber-100 text-amber-800";
}

function formatWarningMetadata(metadata: any) {
  if (!metadata) return null;
  return (
    <div className="space-y-3">
      {metadata.message && (
        <p className="text-sm font-medium text-slate-200">{metadata.message}</p>
      )}
      {metadata.timestamp && (
        <p className="text-[10px] text-slate-400">
          Thời điểm: {new Date(metadata.timestamp).toLocaleString("vi-VN")}
        </p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {metadata.imageSrc && (
          <div>
            <p className="text-[10px] text-slate-400 mb-1 font-semibold uppercase">Ảnh Camera:</p>
            <img 
              src={metadata.imageSrc} 
              alt="Ảnh Camera" 
              className="w-full rounded-md border border-slate-700 hover:scale-[1.02] transition-transform cursor-zoom-in"
              onClick={() => window.open(metadata.imageSrc, '_blank')}
            />
          </div>
        )}
        {metadata.screenSrc && (
          <div>
            <p className="text-[10px] text-slate-400 mb-1 font-semibold uppercase">Ảnh Màn Hình:</p>
            <img 
              src={metadata.screenSrc} 
              alt="Ảnh Màn Hình" 
              className="w-full rounded-md border border-slate-700 hover:scale-[1.02] transition-transform cursor-zoom-in"
              onClick={() => window.open(metadata.screenSrc, '_blank')}
            />
          </div>
        )}
      </div>

      {!metadata.message && !metadata.imageSrc && !metadata.screenSrc && (
        <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}

type DraftGrade = { score: string; isCorrect: boolean; feedback: string };

export default function ExamSessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const hasSessionId = Boolean(sessionId);
  const canReviewResult = user?.role === "ADMIN" || user?.role === "LECTURER";
  const [draftGrades, setDraftGrades] = useState<
    Record<string, DraftGrade>
  >({});
  const [isFallbackReviewOpen, setIsFallbackReviewOpen] = useState(false);

  const { data: result, isLoading, isError, error } = useQuery({
    queryKey: ["exam-session-result", sessionId],
    queryFn: () => examsApiClient.getResults(sessionId, accessToken || ""),
    enabled: hasSessionId,
  });

  const manuallyGradableItems = useMemo(
    () =>
      result?.items.filter(
        (item) =>
          item.section === "PROBLEM" ||
          (item.section === "QUESTION" && item.questionType === "SHORT_ANSWER"),
      ) || [],
    [result],
  );
  const shortAnswerItems = useMemo(
    () =>
      result?.items.filter(
        (item) => item.section === "QUESTION" && item.questionType === "SHORT_ANSWER",
      ) || [],
    [result],
  );
  const fallbackReview = canReviewResult ? result?.fallbackReview : null;
  const hasFallbackReviewImages = Boolean(
    fallbackReview?.fallbackEvidenceImageUrl ||
      fallbackReview?.studentCardImageUrl ||
      fallbackReview?.registeredFaceImageUrl,
  );
  const shouldAutoOpenFallbackReview = Boolean(
    fallbackReview?.shouldAutoExpand ||
      fallbackReview?.fallbackAppliedAt ||
      fallbackReview?.fallbackEvidenceImageUrl ||
      fallbackReview?.checkinStatus === "FAILED_BUT_ALLOWED",
  );

  useEffect(() => {
    if (!result || !canReviewResult) {
      return;
    }

    const initialDrafts: Record<string, DraftGrade> = {};

    for (const item of manuallyGradableItems) {
      initialDrafts[item.examItemId] = {
        score: String(item.manualScore ?? item.score ?? 0),
        isCorrect: item.manualIsCorrect ?? item.isCorrect ?? false,
        feedback: item.reviewerFeedback || "",
      };
    }

    setDraftGrades(initialDrafts);
  }, [result, canReviewResult, manuallyGradableItems]);

  useEffect(() => {
    setIsFallbackReviewOpen(shouldAutoOpenFallbackReview);
  }, [result?.id, shouldAutoOpenFallbackReview]);

  const gradeMutation = useMutation({
    mutationFn: async (payload: {
      examItemId: string;
      score: number;
      isCorrect: boolean;
      feedback?: string;
    }) =>
      examsApiClient.gradeSession(
        sessionId,
        {
          items: [payload],
        },
        accessToken || "",
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["exam-session-result", sessionId],
      });
    },
  });

  const regradeProblemMutation = useMutation({
    mutationFn: async (examItemId: string) =>
      examsApiClient.regradeProblemItem(sessionId, examItemId, accessToken || ""),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["exam-session-result", sessionId],
      });
    },
  });
  const publishMutation = useMutation({
    mutationFn: async () => examsApiClient.publishSessionResults(sessionId, accessToken || ""),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["exam-session-result", sessionId],
      });
    },
  });

  if (!hasSessionId || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Đang tải...</div>
      </div>
    );
  }

  if (!result) {
    const errorMessage = isError
      ? (error as Error)?.message || "Bạn chưa có quyền xem chi tiết bài làm này."
      : "Không tìm thấy kết quả bài thi";

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {isError ? "Không thể xem kết quả bài làm" : "Không tìm thấy kết quả bài làm"}
          </h2>
          <p className="mb-4 text-sm text-gray-600">{errorMessage}</p>
          <Link
            href="/submissions"
            className="inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
          >
            Quay lại lịch sử nộp bài
          </Link>
        </div>
      </div>
    );
  }

  const pct =
    result.maxScore && result.maxScore > 0
      ? Math.round(((result.score || 0) / result.maxScore) * 100)
      : 0;

  const canViewItemDetails = result.canViewItemDetails;
  const canViewProctoringWarnings = user?.role === "ADMIN" || user?.role === "LECTURER";
  const isPracticeSession = result.examType === "PRACTICE";
  const sessionLabel = isPracticeSession ? "bài luyện tập" : "bài thi";
  const sessionLabelTitle = isPracticeSession ? "Bài luyện tập" : "Phiên thi";
  const proctoringWarnings = canViewProctoringWarnings ? (result.proctoringWarnings || []) : [];
  const questionItems = result.items.filter((i) => i.section === "QUESTION");
  const problemItems = result.items.filter((i) => i.section === "PROBLEM");
  const publicationLabel =
    PUBLICATION_STATUS_LABELS[result.resultPublicationStatus] || result.resultPublicationStatus;
  const publicationClass =
    PUBLICATION_STATUS_COLORS[result.resultPublicationStatus] || "bg-slate-100 text-slate-800";
  const requiresPublishAction =
    canReviewResult && result.resultPublicationStatus === "PENDING_REVIEW";

  const saveManualGrade = (examItemId: string, maxPoints: number) => {
    const draft = draftGrades[examItemId];
    if (!draft) {
      return;
    }

    const parsedScore = Number(draft.score);
    if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > maxPoints) {
      alert(`Điểm phải nằm trong khoảng 0 đến ${maxPoints}`);
      return;
    }

    gradeMutation.mutate({
      examItemId,
      score: parsedScore,
      isCorrect: draft.isCorrect,
      feedback: draft.feedback.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Kết quả {sessionLabel}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${publicationClass}`}>
              {publicationLabel}
            </span>
            {!canViewItemDetails && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Chỉ xem tổng quan
              </span>
            )}
          </div>
        </div>

        {/* Session Overview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {result.examTitle}
              </h2>
              <p className="text-gray-500 mt-1">
                {sessionLabelTitle}: {result.id.slice(0, 8)}...
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${publicationClass}`}>
                {publicationLabel}
              </span>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  STATUS_COLORS[result.status as ExamSessionStatus] ||
                  "bg-gray-100 text-gray-800"
                }`}
              >
                {STATUS_LABELS[result.status as ExamSessionStatus] || result.status}
              </span>
            </div>
          </div>

          {requiresPublishAction && (
            <div className="mb-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {publishMutation.isPending ? "Đang công bố..." : "Công bố điểm cho sinh viên"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Tổng điểm</p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  pct >= 80
                    ? "text-green-600"
                    : pct >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {result.score !== null ? result.score : "—"} /{" "}
                {result.maxScore || "—"}
              </p>
              {result.maxScore !== null && result.maxScore > 0 && (
                <p className="text-sm text-gray-500 mt-1">{pct}%</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Câu đúng</p>
              <p className="text-3xl font-bold mt-1 text-green-600">
                {result.correctItems}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                / {result.totalItems} câu
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Chờ chấm</p>
              <p className="text-3xl font-bold mt-1 text-orange-500">
                {result.pendingItems}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Thời gian</p>
              <p className="text-lg font-semibold mt-1 text-gray-900">
                {result.startedAt
                  ? new Date(result.startedAt).toLocaleString("vi-VN")
                  : "—"}
              </p>
              {result.finishedAt && (
                <p className="text-sm text-gray-500 mt-1">
                  → {new Date(result.finishedAt).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
          </div>
        </div>

        {result.resultPublicationStatus === "PENDING_REVIEW" && !canReviewResult && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Kết quả đang chờ giảng viên xác nhận</p>
            <p className="mt-1 text-sm">
              Điểm của {sessionLabel} này sẽ được công bố sau khi giảng viên kiểm duyệt phần tự luận ngắn.
            </p>
          </div>
        )}

        {result.resultPublicationStatus === "PUBLISHED" && result.resultPublishedAt && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <p className="font-semibold">Điểm đã được công bố</p>
            <p className="mt-1 text-sm">
              Công bố lúc: {new Date(result.resultPublishedAt).toLocaleString("vi-VN")}
              {result.resultRevisionCount > 0 && (
                <span>
                  {" "}
                  • Đã điều chỉnh {result.resultRevisionCount} lần sau công bố
                </span>
              )}
            </p>
          </div>
        )}

        {canReviewResult && hasFallbackReviewImages && fallbackReview && (
          <details
            className="mb-6 rounded-lg bg-white shadow-sm"
            open={isFallbackReviewOpen}
            onToggle={(event) => setIsFallbackReviewOpen(event.currentTarget.open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Ảnh đối chiếu check-in fallback
                </h2>
                <p className="text-sm text-gray-500">
                  Gập mặc định, chỉ mở khi phiên có fallback hoặc khi giảng viên cần đối chiếu.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {isFallbackReviewOpen ? "Thu gọn" : "Mở rộng"}
              </span>
            </summary>

            <div className="border-t border-slate-200 p-6">
              <div className="mb-4 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Check-in status</p>
                  <p className="font-semibold">{fallbackReview.checkinStatus || "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Số lần xác thực</p>
                  <p className="font-semibold">{fallbackReview.checkinAttemptCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Fallback applied at</p>
                  <p className="font-semibold">
                    {fallbackReview.fallbackAppliedAt
                      ? new Date(fallbackReview.fallbackAppliedAt).toLocaleString("vi-VN")
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-sm font-semibold text-slate-800">Ảnh fallback (lần cuối)</p>
                  {fallbackReview.fallbackEvidenceImageUrl ? (
                    <img
                      src={fallbackReview.fallbackEvidenceImageUrl}
                      alt="Fallback evidence"
                      className="h-56 w-full rounded-md border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">
                      Không có ảnh fallback
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-sm font-semibold text-slate-800">Ảnh thẻ sinh viên</p>
                  {fallbackReview.studentCardImageUrl ? (
                    <img
                      src={fallbackReview.studentCardImageUrl}
                      alt="Student card"
                      className="h-56 w-full rounded-md border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">
                      Không có ảnh thẻ
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-sm font-semibold text-slate-800">Ảnh đăng ký ban đầu</p>
                  {fallbackReview.registeredFaceImageUrl ? (
                    <img
                      src={fallbackReview.registeredFaceImageUrl}
                      alt="Registered face"
                      className="h-56 w-full rounded-md border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">
                      Không có ảnh đăng ký
                    </div>
                  )}
                </div>
              </div>
            </div>
          </details>
        )}

        {canViewProctoringWarnings && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Cảnh báo hành vi trái phép</h2>
            <p className="text-sm text-gray-500 mb-4">
              Danh sách cảnh báo giám sát được ghi nhận trong phiên thi này.
            </p>

            {proctoringWarnings.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                Không có cảnh báo hành vi trái phép trong phiên thi này.
              </div>
            ) : (
              <div className="space-y-3">
                {proctoringWarnings.map((warning) => (
                  <div
                    key={warning.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${warningLevelClass(
                          warning.warningLevel,
                        )}`}
                      >
                        Mức {warning.warningLevel}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {proctoringEventLabel(warning.eventType)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(warning.timestamp).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    <details className="mt-3 group">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-navy-600 flex items-center gap-1">
                        <span className="group-open:rotate-90 transition-transform">▶</span>
                        Chi tiết vi phạm & bằng chứng
                      </summary>
                      <div className="mt-2 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100 shadow-inner">
                        {formatWarningMetadata(warning.metadata)}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!canViewItemDetails && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Không có quyền xem chi tiết từng câu</p>
            <p className="mt-1 text-sm">
              {result.detailMessage ||
                "Đề thi này chỉ cho phép xem điểm tổng quan, không hiển thị nội dung từng câu."}
            </p>
          </div>
        )}

        {canReviewResult && shortAnswerItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Duyệt câu tự luận ngắn</h2>
                <p className="text-sm text-gray-500">
                  Giảng viên/Quản trị viên có thể xác nhận hoặc chỉnh điểm câu AI chấm trước khi công bố.
                </p>
              </div>
              {requiresPublishAction && (
                <button
                  type="button"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {publishMutation.isPending ? "Đang công bố..." : "Công bố điểm"}
                </button>
              )}
            </div>

            <div className="space-y-4">
              {shortAnswerItems.map((item, idx) => {
                const draft = draftGrades[item.examItemId] || {
                  score: String(item.manualScore ?? item.score ?? 0),
                  isCorrect: item.manualIsCorrect ?? item.isCorrect ?? false,
                  feedback: item.reviewerFeedback || "",
                };

                return (
                  <div key={item.examItemId} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        Câu {idx + 1}: {item.questionContent || "(không có nội dung)"}
                      </p>
                      <span className="text-sm text-slate-600">Tối đa {item.points} điểm</span>
                    </div>

                    <div className="mb-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
                      <p>
                        <span className="font-semibold">Trả lời sinh viên:</span>{" "}
                        {item.textAnswer?.trim() || "(không trả lời)"}
                      </p>
                      {item.correctAnswer && (
                        <p className="mt-1 text-emerald-800">
                          <span className="font-semibold">Đáp án tham chiếu:</span> {item.correctAnswer}
                        </p>
                      )}
                      {(item.aiSuggestedScore !== null && item.aiSuggestedScore !== undefined) && (
                        <p className="mt-1 text-indigo-700">
                          <span className="font-semibold">AI gợi ý:</span> {item.aiSuggestedScore}/{item.points}
                          {item.aiGradingRationale ? ` • ${item.aiGradingRationale}` : ""}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex flex-col text-sm text-slate-700">
                        Điểm chấm tay
                        <input
                          type="number"
                          min={0}
                          max={item.points}
                          step="0.01"
                          value={draft.score}
                          onChange={(event) =>
                            setDraftGrades((prev) => ({
                              ...prev,
                              [item.examItemId]: {
                                ...draft,
                                score: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 rounded-md border border-slate-300 px-3 py-2"
                        />
                      </label>

                      <label className="flex items-center gap-2 text-sm text-slate-700 md:mt-6">
                        <input
                          type="checkbox"
                          checked={draft.isCorrect}
                          onChange={(event) =>
                            setDraftGrades((prev) => ({
                              ...prev,
                              [item.examItemId]: {
                                ...draft,
                                isCorrect: event.target.checked,
                              },
                            }))
                          }
                        />
                        Đánh dấu đúng
                      </label>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => saveManualGrade(item.examItemId, item.points)}
                          disabled={gradeMutation.isPending}
                          className="w-full rounded-md bg-navy-600 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
                        >
                          {gradeMutation.isPending ? "Đang lưu..." : "Lưu chấm điểm"}
                        </button>
                      </div>
                    </div>

                    <label className="mt-3 block text-sm text-slate-700">
                      Nhận xét cho sinh viên
                      <textarea
                        value={draft.feedback}
                        onChange={(event) =>
                          setDraftGrades((prev) => ({
                            ...prev,
                            [item.examItemId]: {
                              ...draft,
                              feedback: event.target.value,
                            },
                          }))
                        }
                        rows={3}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                        placeholder="Nhập nhận xét chấm điểm..."
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Question Items */}
        {canViewItemDetails && questionItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Phần câu hỏi ({questionItems.length} câu)
            </h2>
            <div className="space-y-4">
              {questionItems.map((item, idx) => (
                <ItemCard key={item.examItemId} item={item} index={idx + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Problem Items */}
        {canViewItemDetails && problemItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Phần bài code ({problemItems.length} bài)
            </h2>
            <div className="space-y-4">
              {problemItems.map((item, idx) => (
                <ItemCard
                  key={item.examItemId}
                  item={item}
                  index={idx + 1}
                  canReviewResult={canReviewResult}
                  draft={draftGrades[item.examItemId]}
                  isSavingGrade={gradeMutation.isPending}
                  isRegrading={regradeProblemMutation.isPending}
                  onDraftChange={(examItemId, draft) =>
                    setDraftGrades((prev) => ({ ...prev, [examItemId]: draft }))
                  }
                  onSaveManualGrade={saveManualGrade}
                  onRegradeProblem={(examItemId) => regradeProblemMutation.mutate(examItemId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  index,
  canReviewResult = false,
  draft,
  onDraftChange,
  onSaveManualGrade,
  onRegradeProblem,
  isSavingGrade = false,
  isRegrading = false,
}: {
  item: SessionResultItem;
  index: number;
  canReviewResult?: boolean;
  draft?: DraftGrade;
  onDraftChange?: (examItemId: string, draft: DraftGrade) => void;
  onSaveManualGrade?: (examItemId: string, maxPoints: number) => void;
  onRegradeProblem?: (examItemId: string) => void;
  isSavingGrade?: boolean;
  isRegrading?: boolean;
}) {
  const isCorrect = item.isCorrect === true;
  const isPending = item.isCorrect === null;
  const isWrong = item.isCorrect === false;
  const submission = item.submission;
  const sourceCode = item.sourceCode?.trim() || "";
  const questionType = questionTypeLabel(item.questionType);
  const problemDraft = draft || {
    score: String(item.manualScore ?? item.score ?? 0),
    isCorrect: item.manualIsCorrect ?? item.isCorrect ?? false,
    feedback: item.reviewerFeedback || "",
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        isCorrect
          ? "border-green-200 bg-green-50"
          : isWrong
            ? "border-red-200 bg-red-50"
            : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">#{index}</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              item.section === "QUESTION"
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {item.section === "QUESTION" ? "Câu hỏi" : "Bài code"}
          </span>
          {questionType && (
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
              {questionType}
            </span>
          )}
          <span className="text-gray-900 font-medium">
            {item.questionContent || item.problemTitle || "—"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {item.score !== null ? item.score : "—"} / {item.points} điểm
          </span>
          {isCorrect && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Đúng
            </span>
          )}
          {isWrong && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Sai
            </span>
          )}
          {isPending && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Chờ chấm
            </span>
          )}
        </div>
      </div>

      {item.section === "QUESTION" && (
        <div className="mt-3 space-y-3 text-sm text-gray-700">
          {item.questionType === "SHORT_ANSWER" && (
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p>
                <span className="font-semibold">Trả lời của bạn:</span>{" "}
                {item.textAnswer?.trim() || "(không trả lời)"}
              </p>
              {item.correctAnswer && (
                <p className="mt-1">
                  <span className="font-semibold text-green-700">Đáp án đúng:</span>{" "}
                  {item.correctAnswer}
                </p>
              )}
              {item.reviewerFeedback && (
                <p className="mt-1 text-indigo-800">
                  <span className="font-semibold">Nhận xét giảng viên:</span> {item.reviewerFeedback}
                </p>
              )}
            </div>
          )}

          {item.choices && item.choices.length > 0 && (
            <div className="space-y-2">
              {item.choices.map((choice) => {
                const selected = choice.isSelected;
                const correct = choice.isCorrect;

                let className =
                  "rounded-md border border-slate-200 bg-white p-3 text-slate-700";
                if (correct && selected) {
                  className =
                    "rounded-md border border-green-300 bg-green-50 p-3 text-green-800";
                } else if (correct) {
                  className =
                    "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-emerald-800";
                } else if (selected) {
                  className =
                    "rounded-md border border-rose-300 bg-rose-50 p-3 text-rose-700";
                }

                return (
                  <div key={choice.id} className={className}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{choice.content}</span>
                      {selected && (
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          Đã chọn
                        </span>
                      )}
                      {correct && (
                        <span className="rounded bg-green-200 px-2 py-0.5 text-xs font-semibold text-green-800">
                          Đáp án đúng
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!item.choices?.length && item.selectedChoiceIds?.length > 0 && (
            <p>Đáp án đã chọn: {item.selectedChoiceIds.length} lựa chọn</p>
          )}

          {item.questionExplanation && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="font-semibold text-blue-900">Giải thích</p>
              <p className="mt-1 text-blue-900/90">{item.questionExplanation}</p>
            </div>
          )}
        </div>
      )}

      {item.section === "PROBLEM" && (
        <div className="mt-3 space-y-3 text-sm text-gray-700">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ngôn ngữ</p>
            <p className="mt-1 font-semibold text-slate-900">{item.language || "(không xác định)"}</p>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-900 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-300">Mã nguồn đã nộp</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-100">
              {sourceCode || "Bạn chưa nộp mã nguồn cho mục này."}
            </pre>
          </div>

          {submission ? (
            <>
              <div
                className={`grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-3 ${
                  submission.executionTime !== null ? "sm:grid-cols-3" : "sm:grid-cols-2"
                }`}
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Trạng thái</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {submissionStatusLabel(submission.status)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Test case</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {submission.passedTestCases}/{submission.totalTestCases} passed
                  </p>
                </div>
                {submission.executionTime !== null && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Thời gian chạy</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {`${submission.executionTime} ms`}
                    </p>
                  </div>
                )}
              </div>

              {submission.compileOutput && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="font-semibold text-red-800">Lỗi biên dịch</p>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-red-700">
                    {submission.compileOutput}
                  </pre>
                </div>
              )}

              {submission.errorMessage && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="font-semibold text-red-800">Lỗi runtime</p>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-red-700">
                    {submission.errorMessage}
                  </pre>
                </div>
              )}

              {submission.testCaseResults && submission.testCaseResults.length > 0 && (
                <details className="rounded-md border border-slate-200 bg-white p-3">
                  <summary className="cursor-pointer font-semibold text-slate-800">
                    Chi tiết test case ({submission.testCaseResults.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {submission.testCaseResults.map((testCase, testCaseIndex) => (
                      <div
                        key={`${testCase.testCaseId}-${testCaseIndex}`}
                        className={`rounded-md border p-3 ${testCaseBadgeClass(testCase)}`}
                      >
                        <p className="font-semibold">
                          Case #{testCase.order + 1} • {testCase.passed ? "Passed" : "Failed"}
                        </p>
                        <p className="mt-1 text-xs">Input: {testCase.input}</p>
                        <p className="text-xs">Expected: {testCase.expectedOutput}</p>
                        <p className="text-xs">Actual: {testCase.actualOutput}</p>
                        {testCase.message && (
                          <p className="mt-1 text-xs font-medium">{testCase.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          ) : (
            <p className="rounded-md border border-slate-200 bg-white p-3 text-slate-600">
              {sourceCode
                ? "Hệ thống chưa tạo dữ liệu chấm cho mục này. Giảng viên có thể chấm tay bên dưới."
                : "Mục này không có mã nguồn được nộp nên không có dữ liệu chấm code."}
            </p>
          )}

          {canReviewResult && onDraftChange && onSaveManualGrade && (
            <div className="rounded-md border border-navy-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">Chấm tay bài code</p>
                  <p className="text-xs text-slate-500">Có thể ghi đè điểm auto judge cho bài này.</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">Tối đa {item.points} điểm</span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="flex flex-col text-sm text-slate-700">
                  Điểm chấm tay
                  <input
                    type="number"
                    min={0}
                    max={item.points}
                    step="0.01"
                    value={problemDraft.score}
                    onChange={(event) =>
                      onDraftChange(item.examItemId, {
                        ...problemDraft,
                        score: event.target.value,
                      })
                    }
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700 md:mt-6">
                  <input
                    type="checkbox"
                    checked={problemDraft.isCorrect}
                    onChange={(event) =>
                      onDraftChange(item.examItemId, {
                        ...problemDraft,
                        isCorrect: event.target.checked,
                      })
                    }
                  />
                  Đánh dấu đúng
                </label>

                <div className="flex flex-col justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onSaveManualGrade(item.examItemId, item.points)}
                    disabled={isSavingGrade || isRegrading}
                    className="w-full rounded-md bg-navy-600 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
                  >
                    {isSavingGrade ? "Đang lưu..." : "Lưu chấm điểm"}
                  </button>
                  {onRegradeProblem && (
                    <button
                      type="button"
                      onClick={() => onRegradeProblem(item.examItemId)}
                      disabled={isSavingGrade || isRegrading || !sourceCode}
                      className="w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      {isRegrading ? "Đang chấm lại..." : "Chấm lại bằng auto judge"}
                    </button>
                  )}
                </div>
              </div>

              <label className="mt-3 block text-sm text-slate-700">
                Nhận xét cho sinh viên
                <textarea
                  value={problemDraft.feedback}
                  onChange={(event) =>
                    onDraftChange(item.examItemId, {
                      ...problemDraft,
                      feedback: event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Nhập nhận xét chấm điểm bài code..."
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}