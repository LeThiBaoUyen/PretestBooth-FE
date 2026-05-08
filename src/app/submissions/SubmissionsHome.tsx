"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submissionsApi } from "@/lib/api/execution";
import { useAuth } from "@/lib/hooks";
import { buildQueryString } from "@/lib/navigation/listQueryPersistence";
import { useListQuerySync } from "@/lib/hooks/useListQuerySync";
import type {
  Difficulty,
  ExamContentType,
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

function getExamContentLabel(examType: ExamContentType | null | undefined) {
  return examType === "PRACTICE" ? "Luyện tập" : "Bài thi";
}

function getUnifiedTypeBadge(item: UnifiedSubmissionItem) {
  if (item.type === "PROBLEM") {
    return {
      className: TYPE_COLORS.PROBLEM,
      label: TYPE_LABELS.PROBLEM,
    };
  }

  return {
    className:
      item.examType === "PRACTICE"
        ? "bg-emerald-100 text-emerald-800"
        : TYPE_COLORS.EXAM,
    label: getExamContentLabel(item.examType),
  };
}

export default function SubmissionsHome() {
  const router = useRouter();
  const { accessToken, user, userLoading } = useAuth();
  const isManagerView = user?.role === "ADMIN" || user?.role === "LECTURER";
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page") || 1)));
  const [type, setType] = useState<"ALL" | "PROBLEM" | "EXAM">(
    () => (searchParams.get("type") as "ALL" | "PROBLEM" | "EXAM") || "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") || "ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<"ALL" | Difficulty>(() =>
    (searchParams.get("difficulty") as "ALL" | Difficulty) || "ALL",
  );
  const [keyword, setKeyword] = useState(() => searchParams.get("keyword") || "");
  const [fromDate, setFromDate] = useState(() => searchParams.get("fromDate") || "");
  const [toDate, setToDate] = useState(() => searchParams.get("toDate") || "");
  const limit = 20;

  const queryString = useMemo(
    () =>
      buildQueryString({
        page: page > 1 ? page : undefined,
        type: type === "ALL" ? undefined : type,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        difficulty: difficultyFilter === "ALL" ? undefined : difficultyFilter,
        keyword: keyword.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    [page, type, statusFilter, difficultyFilter, keyword, fromDate, toDate],
  );

  useListQuerySync("/submissions", queryString);

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
    enabled: !!accessToken && !isManagerView,
  });

  const {
    data: groupedTestsData,
    isLoading: groupedTestsLoading,
    isError: groupedTestsError,
  } = useQuery({
    queryKey: ["submission-test-groups", page, type, keyword, !!accessToken],
    queryFn: () =>
      submissionsApi.getSubmissionTestGroups(
        {
          page,
          limit,
          type,
          keyword,
          sortOrder: "desc",
        },
        accessToken || undefined,
      ),
    enabled: !!accessToken && isManagerView,
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

  if (userLoading) {
    return (
      <div className="py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-gray-500">
          Đang kiểm tra phiên đăng nhập...
        </div>
      </div>
    );
  }

  if (!user || !accessToken) {
    return (
      <div className="py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Bạn cần đăng nhập để xem lịch sử nộp bài</h2>
          <p className="mt-2 text-slate-600">Vui lòng đăng nhập để xem lại các lần nộp bài của bạn.</p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-navy-600 px-5 py-2.5 font-semibold text-white hover:bg-navy-700"
          >
            Đi tới đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (isManagerView) {
    const groupedTests = groupedTestsData?.data || [];
    const groupedTotalPages = groupedTestsData?.totalPages || 1;

    return (
      <div className="pb-8">
        <div className="ui-page-header">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="ui-page-title">Lịch sử nộp bài theo bài test</h1>
              <p className="ui-page-subtitle">
                Danh sách bài test lấy từ database. Bấm vào từng bài để xem ai đã nộp và kết quả chi tiết.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(["ALL", "PROBLEM", "EXAM"] as const).map((typeOption) => (
            <button
              key={typeOption}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                type === typeOption
                  ? "border-navy-600 bg-navy-600 text-white"
                  : "border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
              }`}
              onClick={() => {
                setType(typeOption);
                setPage(1);
              }}
            >
              {typeOption === "ALL"
                ? "Tất cả"
                : typeOption === "PROBLEM"
                  ? "Bài tập Code"
                  : "Bài Thi"}
            </button>
          ))}
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-gray-700">Từ khóa bài test</label>
          <input
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập tên bài test"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          {groupedTestsLoading ? (
            <div className="p-12 text-center text-gray-500">Đang tải danh sách bài test...</div>
          ) : groupedTestsError ? (
            <div className="p-12 text-center text-red-500">Không thể tải danh sách bài test.</div>
          ) : groupedTests.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Chưa có bài test nào có dữ liệu nộp bài.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Loại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Bài test</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Số người nộp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Số lượt nộp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Đạt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lần nộp gần nhất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {groupedTests.map((item) => (
                    <tr
                      key={`${item.type}-${item.entityId}`}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        router.push(`/submissions/tests/${item.type}/${item.entityId}`);
                      }}
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            item.type === "PROBLEM"
                              ? TYPE_COLORS.PROBLEM
                              : item.examType === "PRACTICE"
                                ? "bg-emerald-100 text-emerald-800"
                                : TYPE_COLORS.EXAM
                          }`}
                        >
                          {item.type === "PROBLEM"
                            ? TYPE_LABELS.PROBLEM
                            : getExamContentLabel(item.examType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.title}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{item.totalSubmitters}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{item.totalSubmissions}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{item.passedCount}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(item.latestSubmittedAt).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {groupedTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-sm text-gray-700">
                Trang {page}/{groupedTotalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(groupedTotalPages, p + 1))}
                disabled={page === groupedTotalPages}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          )}
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
    <div className="pb-8">
      {/* Header */}
      <div className="ui-page-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="ui-page-title">Lịch sử nộp bài</h1>
            <p className="ui-page-subtitle">
              Xem lại các lần nộp bài tập code và kết quả bài thi của bạn.
            </p>
          </div>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["ALL", "PROBLEM", "EXAM"].map((typeOption) => (
          <button
            key={typeOption}
            className={`px-4 py-2 rounded-full font-medium border transition text-sm ${
              type === typeOption
                ? "bg-navy-600 text-white border-navy-600"
                : "bg-white text-navy-600 border-navy-200 hover:bg-navy-50"
            }`}
            onClick={() => {
              setType(typeOption as "ALL" | "PROBLEM" | "EXAM");
              setPage(1);
            }}
          >
            {typeOption === "ALL"
              ? "Tất cả"
              : typeOption === "PROBLEM"
                ? "Bài tập Code"
                : "Bài Thi"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                      {(() => {
                        const badge = getUnifiedTypeBadge(item);
                        return (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
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
                          {getExamContentLabel(item.examType)} • {item.questionCount || 0} câu hỏi,{" "}
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
  );
}
