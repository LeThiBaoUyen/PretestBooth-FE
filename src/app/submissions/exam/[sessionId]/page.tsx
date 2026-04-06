"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { examsApiClient } from "@/lib/api/exams";
import { useAuth } from "@/lib/hooks";
import type {
  SessionResultItem,
  ExamSessionStatus,
  QuestionType,
  SessionResultTestCase,
  SessionResultProctoringWarning,
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

function formatWarningMetadata(metadata: SessionResultProctoringWarning["metadata"]) {
  if (!metadata) return "Không có metadata";

  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "Không thể hiển thị metadata";
  }
}

export default function ExamSessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { accessToken, user } = useAuth();

  const { data: result, isLoading, isError, error } = useQuery({
    queryKey: ["exam-session-result", sessionId],
    queryFn: () => examsApiClient.getResults(sessionId, accessToken!),
    enabled: !!accessToken && !!sessionId,
  });

  if (isLoading) {
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
            {isError ? "Không thể xem kết quả bài thi" : "Không tìm thấy kết quả bài thi"}
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
  const proctoringWarnings = canViewProctoringWarnings ? (result.proctoringWarnings || []) : [];
  const questionItems = result.items.filter((i) => i.section === "QUESTION");
  const problemItems = result.items.filter((i) => i.section === "PROBLEM");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Kết quả bài thi</h1>
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
                Phiên thi: {result.id.slice(0, 8)}...
              </p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                STATUS_COLORS[result.status as ExamSessionStatus] ||
                "bg-gray-100 text-gray-800"
              }`}
            >
              {STATUS_LABELS[result.status as ExamSessionStatus] ||
                result.status}
            </span>
          </div>

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

                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700">
                        Xem metadata
                      </summary>
                      <pre className="mt-2 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                        {formatWarningMetadata(warning.metadata)}
                      </pre>
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
                <ItemCard key={item.examItemId} item={item} index={idx + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemCard({ item, index }: { item: SessionResultItem; index: number }) {
  const isCorrect = item.isCorrect === true;
  const isPending = item.isCorrect === null;
  const isWrong = item.isCorrect === false;
  const submission = item.submission;
  const questionType = questionTypeLabel(item.questionType);

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
              Chưa có dữ liệu chấm code cho mục này.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
