"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { examsApiClient } from "@/lib/api/exams";
import { useAuth } from "@/lib/hooks";
import type { SessionResultItem, ExamSessionStatus } from "@/lib/api/types";

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

export default function ExamSessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { accessToken } = useAuth();

  const { data: result, isLoading } = useQuery({
    queryKey: ["exam-session-result", sessionId],
    queryFn: () => examsApiClient.getResults(sessionId, accessToken!),
    enabled: !!accessToken && !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Đang tải...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Không tìm thấy kết quả bài thi
          </h2>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const pct =
    result.maxScore && result.maxScore > 0
      ? Math.round(((result.score || 0) / result.maxScore) * 100)
      : 0;

  const questionItems = result.items.filter((i) => i.section === "QUESTION");
  const problemItems = result.items.filter((i) => i.section === "PROBLEM");

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/submissions")}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Quay lại danh sách
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Kết quả bài thi</h1>
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

        {/* Question Items */}
        {questionItems.length > 0 && (
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
        {problemItems.length > 0 && (
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

      {/* Show answers */}
      <div className="mt-3 text-sm text-gray-600">
        {item.selectedChoiceIds && item.selectedChoiceIds.length > 0 && (
          <p>Đáp án đã chọn: {item.selectedChoiceIds.length} lựa chọn</p>
        )}
        {item.textAnswer && <p>Câu trả lời: {item.textAnswer}</p>}
      </div>
    </div>
  );
}
