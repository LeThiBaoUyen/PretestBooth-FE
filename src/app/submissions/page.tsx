"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { submissionsApi } from "@/lib/api/execution";
import { useAuth } from "@/lib/hooks";
import type {
  Difficulty,
  UnifiedSubmissionItem,
  UnifiedSubmissionType,
} from "@/lib/api/types";

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: "bg-green-100 text-green-800",
  WRONG_ANSWER: "bg-red-100 text-red-800",
  COMPILE_ERROR: "bg-orange-100 text-orange-800",
  RUNTIME_ERROR: "bg-purple-100 text-purple-800",
  TIME_LIMIT_EXCEEDED: "bg-yellow-100 text-yellow-800",
  MEMORY_LIMIT_EXCEEDED: "bg-yellow-100 text-yellow-800",
  PENDING: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-indigo-100 text-indigo-800",
  GRADED: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: "Đạt",
  WRONG_ANSWER: "Sai",
  COMPILE_ERROR: "Lỗi biên dịch",
  RUNTIME_ERROR: "Lỗi runtime",
  TIME_LIMIT_EXCEEDED: "Quá thời gian",
  MEMORY_LIMIT_EXCEEDED: "Quá bộ nhớ",
  PENDING: "Đang chạy",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  GRADED: "Đã chấm",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  EASY: "text-green-600",
  MEDIUM: "text-yellow-600",
  HARD: "text-red-600",
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

const TYPE_COLORS: Record<UnifiedSubmissionType, string> = {
  PROBLEM: "bg-cyan-100 text-cyan-800",
  EXAM: "bg-violet-100 text-violet-800",
};

const TYPE_LABELS: Record<UnifiedSubmissionType, string> = {
  PROBLEM: "Bài tập",
  EXAM: "Bài thi",
};

export default function SubmissionsPage() {
  const { accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [type, setType] = useState<"ALL" | "PROBLEM" | "EXAM">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<"ALL" | Difficulty>("ALL");
  const [keyword, setKeyword] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["unified-submissions", page, type, !!accessToken],
    queryFn: () =>
      submissionsApi.getUnifiedSubmissions(
        {
          page,
          limit,
          type: type as "ALL" | "PROBLEM" | "EXAM",
          sortOrder: "desc",
        },
        accessToken || undefined,
      ),
    enabled: !!accessToken,
  });

  const submissions = data?.data || [];
  const filteredSubmissions = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

    return submissions.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;

      if (difficultyFilter !== "ALL") {
        if (item.type !== "PROBLEM") return false;
        if (item.difficulty !== difficultyFilter) return false;
      }

      if (q && !item.title.toLowerCase().includes(q)) return false;

      const itemTime = new Date(item.date).getTime();
      if (from !== null && itemTime < from) return false;
      if (to !== null && itemTime > to) return false;

      return true;
    });
  }, [submissions, statusFilter, difficultyFilter, keyword, fromDate, toDate]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((item) => set.add(item.status));
    return Array.from(set);
  }, [submissions]);

  const totalPages = data?.totalPages || 1;

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">
            Vui lòng đăng nhập để xem lịch sử nộp bài
          </p>
          <a
            href="/login"
            className="mt-4 inline-block text-blue-600 hover:underline font-medium"
          >
            Đăng nhập
          </a>
        </div>
      </div>
    );
  }

  const getLink = (item: UnifiedSubmissionItem) => {
    if (item.type === "PROBLEM") {
      return `/submissions/${item.id}`;
    }
    return `/submissions/exam/${item.id}`;
  };

  const renderScoreOrTestCases = (item: UnifiedSubmissionItem) => {
    if (item.type === "PROBLEM") {
      return (
        <span
          className={
            item.passedTestCases === item.totalTestCases
              ? "text-green-600 font-medium"
              : "text-red-600 font-medium"
          }
        >
          {item.passedTestCases}/{item.totalTestCases}
        </span>
      );
    }
    // Exam type
    if (item.score !== null && item.maxScore !== null) {
      const pct =
        item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0;
      return (
        <span
          className={
            pct >= 80
              ? "text-green-600 font-medium"
              : pct >= 50
                ? "text-yellow-600 font-medium"
                : "text-red-600 font-medium"
          }
        >
          {item.score}/{item.maxScore} ({pct}%)
        </span>
      );
    }
    if (item.status === "IN_PROGRESS") {
      return <span className="text-gray-500">Đang làm...</span>;
    }
    return <span className="text-gray-400">Chờ chấm</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lịch sử nộp bài</h1>
          <p className="mt-2 text-gray-600">
            Xem lại các lần nộp bài tập code và kết quả bài thi của bạn
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại
              </label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as "ALL" | "PROBLEM" | "EXAM");
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Tất cả</option>
                <option value="PROBLEM">Bài tập code</option>
                <option value="EXAM">Bài thi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Tất cả</option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status] || status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Độ khó
              </label>
              <select
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value as "ALL" | Difficulty);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Tất cả</option>
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ khóa tiêu đề
              </label>
              <input
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                placeholder="Nhập tên bài"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ ngày
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đến ngày
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Đang tải...</div>
          ) : isError ? (
            <div className="p-12 text-center text-red-500">
              Không thể tải dữ liệu. Vui lòng thử lại.
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Chưa có lần nộp bài nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Độ khó / Chi tiết
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Điểm / Test cases
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày nộp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.map((item: UnifiedSubmissionItem) => (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => (window.location.href = getLink(item))}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[item.type]}`}
                        >
                          {TYPE_LABELS[item.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.type === "PROBLEM" && item.slug ? (
                          <Link
                            href={`/question-bank/problems/${item.slug}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-900">
                            {item.title}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.type === "PROBLEM" && item.difficulty ? (
                          <span
                            className={`font-medium ${DIFFICULTY_COLORS[item.difficulty]}`}
                          >
                            {DIFFICULTY_LABELS[item.difficulty]}
                          </span>
                        ) : item.type === "EXAM" ? (
                          <span className="text-gray-600">
                            {item.questionCount || 0} câu hỏi,{" "}
                            {item.problemCount || 0} bài code
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            STATUS_COLORS[item.status] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderScoreOrTestCases(item)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.date).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Trang <span className="font-medium">{page}</span> /{" "}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - page) <= 2,
                      )
                      .map((p, idx, arr) => (
                        <span key={`page-${p}`}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => setPage(p)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              p === page
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {p}
                          </button>
                        </span>
                      ))}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
