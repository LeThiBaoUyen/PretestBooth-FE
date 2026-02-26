"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { Difficulty } from "@/lib/api/types";
import { problemsApiClient } from "@/lib/api/problems";
import { questionsApiClient } from "@/lib/api/questions";
import { useAuth } from "@/lib/hooks/useAuth";

export default function ProblemsLibrary() {
  const { user, accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const limit = 20;

  // Check if user is authorized to create problems
  const isAuthorized = user && ["LECTURER", "ADMIN"].includes(user.role);

  const { data, isLoading, error } = useQuery({
    queryKey: ["problems", page, difficulty, search, subjectId, topicId],
    queryFn: () =>
      problemsApiClient.getProblems({
        page,
        limit,
        difficulty: difficulty === "ALL" ? undefined : difficulty,
        search: search || undefined,
        subjectId: subjectId || undefined,
        topicId: topicId || undefined,
        isPublished: true,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
  });

  // Fetch subjects for filter dropdown
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => questionsApiClient.getSubjects(accessToken || undefined),
  });

  // Fetch topics for selected subject
  const { data: topics } = useQuery({
    queryKey: ["topics", subjectId],
    queryFn: () =>
      questionsApiClient.getTopicsBySubject(
        subjectId,
        accessToken || undefined,
      ),
    enabled: !!subjectId,
  });

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case "EASY":
        return "text-green-600 bg-green-50 border-green-200";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "HARD":
        return "text-red-600 bg-red-50 border-red-200";
    }
  };

  const getDifficultyText = (diff: Difficulty) => {
    switch (diff) {
      case "EASY":
        return "Dễ";
      case "MEDIUM":
        return "Trung bình";
      case "HARD":
        return "Khó";
    }
  };

  const getAcceptanceColor = (rate: number) => {
    if (rate >= 70) return "text-green-600";
    if (rate >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-navy-600 mb-2">
            Thư viện Bài tập
          </h1>
          <p className="text-gray-600">
            Rèn luyện kỹ năng lập trình với các bài tập từ dễ đến khó
          </p>
        </div>
        {isAuthorized && (
          <Link
            href="/question-bank/problems/create"
            className="px-5 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition font-medium text-sm flex items-center gap-2"
          >
            + Tạo bài tập
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Nhập tên bài tập..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Độ khó
            </label>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value as Difficulty | "ALL");
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              <option value="EASY">Dễ</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HARD">Khó</option>
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Môn học
            </label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId("");
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="">Tất cả</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chủ đề
            </label>
            <select
              value={topicId}
              onChange={(e) => {
                setTopicId(e.target.value);
                setPage(1);
              }}
              disabled={!subjectId}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Tất cả</option>
              {topics?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Problems List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">
            Không thể tải danh sách bài tập. Vui lòng thử lại sau.
          </p>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-600 text-lg">Không tìm thấy bài tập nào</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-navy-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">#</th>
                    <th className="px-6 py-4 text-left font-semibold">
                      Tiêu đề
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Môn học
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Chủ đề
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Độ khó
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Tỷ lệ AC
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Lượt nộp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.data.map((problem, index) => (
                    <tr
                      key={problem.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 text-gray-600">
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/question-bank/problems/${problem.slug}`}
                          className="text-navy-600 hover:text-navy-700 font-medium hover:underline"
                        >
                          {problem.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {problem.subject ? (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {problem.subject.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {problem.topic ? (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            {problem.topic.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(
                            problem.difficulty,
                          )}`}
                        >
                          {getDifficultyText(problem.difficulty)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`font-semibold ${getAcceptanceColor(
                            problem.acceptanceRate,
                          )}`}
                        >
                          {problem.acceptanceRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {problem.totalSubmissions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Trước
              </button>

              <div className="flex gap-2">
                {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === data.totalPages ||
                      Math.abs(p - page) <= 2,
                  )
                  .map((p, i, arr) => (
                    <>
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span key={`ellipsis-${p}`} className="px-2 py-2">
                          ...
                        </span>
                      )}
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-4 py-2 rounded-lg transition ${
                          page === p
                            ? "bg-navy-600 text-white"
                            : "bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    </>
                  ))}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
