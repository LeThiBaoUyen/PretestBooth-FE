"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { submissionsApi } from "@/lib/api/execution";
import type {
  SubmissionStatus,
  SubmissionListItem,
  Difficulty,
} from "@/lib/api/types";

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  ACCEPTED: "bg-green-100 text-green-800",
  WRONG_ANSWER: "bg-red-100 text-red-800",
  COMPILE_ERROR: "bg-orange-100 text-orange-800",
  RUNTIME_ERROR: "bg-purple-100 text-purple-800",
  TIME_LIMIT_EXCEEDED: "bg-yellow-100 text-yellow-800",
  MEMORY_LIMIT_EXCEEDED: "bg-yellow-100 text-yellow-800",
  PENDING: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  ACCEPTED: "Đạt",
  WRONG_ANSWER: "Sai",
  COMPILE_ERROR: "Lỗi biên dịch",
  RUNTIME_ERROR: "Lỗi runtime",
  TIME_LIMIT_EXCEEDED: "Quá thời gian",
  MEMORY_LIMIT_EXCEEDED: "Quá bộ nhớ",
  PENDING: "Đang chạy",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  EASY: "text-green-600",
  MEDIUM: "text-yellow-600",
  HARD: "text-red-600",
};

export default function SubmissionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SubmissionStatus | "">("");
  const [language, setLanguage] = useState("");
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["submissions", page, status, language],
    queryFn: () =>
      submissionsApi.getSubmissions({
        page,
        limit,
        status: status || undefined,
        language: language || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
  });

  const submissions = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lịch sử nộp bài</h1>
          <p className="mt-2 text-gray-600">Xem lại các lần nộp bài của bạn</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as SubmissionStatus | "");
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tất cả</option>
                <option value="ACCEPTED">Đạt</option>
                <option value="WRONG_ANSWER">Sai</option>
                <option value="COMPILE_ERROR">Lỗi biên dịch</option>
                <option value="RUNTIME_ERROR">Lỗi runtime</option>
                <option value="TIME_LIMIT_EXCEEDED">Quá thời gian</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngôn ngữ
              </label>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tất cả</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c++">C++</option>
                <option value="c">C</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Đang tải...</div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Chưa có lần nộp bài nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bài tập
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Độ khó
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngôn ngữ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test cases
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày nộp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission: SubmissionListItem) => (
                    <tr
                      key={submission.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        (window.location.href = `/submissions/${submission.id}`)
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/problems/${submission.problemSlug}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {submission.problemTitle}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            DIFFICULTY_COLORS[submission.problemDifficulty]
                          }`}
                        >
                          {submission.problemDifficulty === "EASY"
                            ? "Dễ"
                            : submission.problemDifficulty === "MEDIUM"
                              ? "Trung bình"
                              : "Khó"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            STATUS_COLORS[submission.status]
                          }`}
                        >
                          {STATUS_LABELS[submission.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.language}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span
                          className={
                            submission.passedTestCases ===
                            submission.totalTestCases
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {submission.passedTestCases}/
                          {submission.totalTestCases}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.executionTime}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(submission.createdAt).toLocaleString("vi-VN")}
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
                        <>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          )}
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              p === page
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {p}
                          </button>
                        </>
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
