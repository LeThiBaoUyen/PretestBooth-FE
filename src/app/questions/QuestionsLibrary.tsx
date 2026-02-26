"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { Difficulty, QuestionType } from "@/lib/api/types";
import { questionsApiClient } from "@/lib/api/questions";
import { useAuth } from "@/lib/hooks/useAuth";

export default function QuestionsLibrary() {
  const { user, accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty | "ALL">("ALL");
  const [questionType, setQuestionType] = useState<QuestionType | "ALL">("ALL");
  const [subjectId, setSubjectId] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const limit = 20;

  const isAuthorized = user && ["LECTURER", "ADMIN"].includes(user.role);

  // Fetch subjects for filter
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => questionsApiClient.getSubjects(accessToken || undefined),
  });

  // Fetch questions
  const { data, isLoading, error } = useQuery({
    queryKey: ["questions", page, difficulty, questionType, subjectId, search],
    queryFn: () =>
      questionsApiClient.getQuestions(
        {
          page,
          limit,
          difficulty: difficulty === "ALL" ? undefined : difficulty,
          questionType: questionType === "ALL" ? undefined : questionType,
          subjectId: subjectId === "ALL" ? undefined : subjectId,
          search: search || undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        accessToken || undefined,
      ),
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

  const getTypeColor = (type: QuestionType) => {
    switch (type) {
      case "SINGLE_CHOICE":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "MULTIPLE_CHOICE":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "SHORT_ANSWER":
        return "text-orange-600 bg-orange-50 border-orange-200";
    }
  };

  const getTypeText = (type: QuestionType) => {
    switch (type) {
      case "SINGLE_CHOICE":
        return "Một đáp án";
      case "MULTIPLE_CHOICE":
        return "Nhiều đáp án";
      case "SHORT_ANSWER":
        return "Tự luận ngắn";
    }
  };

  const getTypeIcon = (type: QuestionType) => {
    switch (type) {
      case "SINGLE_CHOICE":
        return "🔘";
      case "MULTIPLE_CHOICE":
        return "☑️";
      case "SHORT_ANSWER":
        return "✏️";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-navy-600 mb-2">
            Ngân hàng Câu hỏi
          </h1>
          <p className="text-gray-600">
            Quản lý câu hỏi trắc nghiệm, nhiều đáp án và tự luận ngắn
          </p>
        </div>
        {isAuthorized && (
          <Link
            href="/questions/create"
            className="px-5 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition font-medium text-sm flex items-center gap-2"
          >
            + Tạo câu hỏi
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
              placeholder="Nhập nội dung câu hỏi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
          </div>

          {/* Question Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại câu hỏi
            </label>
            <select
              value={questionType}
              onChange={(e) => {
                setQuestionType(e.target.value as QuestionType | "ALL");
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              <option value="SINGLE_CHOICE">Một đáp án</option>
              <option value="MULTIPLE_CHOICE">Nhiều đáp án</option>
              <option value="SHORT_ANSWER">Tự luận ngắn</option>
            </select>
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
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">
            Không thể tải danh sách câu hỏi. Vui lòng thử lại sau.
          </p>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-600 text-lg">Không tìm thấy câu hỏi nào</p>
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
                      Nội dung
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Loại
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Độ khó
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Môn học
                    </th>
                    {isAuthorized && (
                      <th className="px-6 py-4 text-center font-semibold">
                        Trạng thái
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.data.map((question, index) => (
                    <tr
                      key={question.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 text-gray-600">
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/questions/${question.id}`}
                          className="text-navy-600 hover:text-navy-700 font-medium hover:underline line-clamp-2"
                        >
                          {question.content}
                        </Link>
                        {question.topic && (
                          <p className="text-xs text-gray-400 mt-1">
                            {question.topic.name}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(question.questionType)}`}
                        >
                          {getTypeIcon(question.questionType)}{" "}
                          {getTypeText(question.questionType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(question.difficulty)}`}
                        >
                          {getDifficultyText(question.difficulty)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 text-sm">
                        {question.subject?.name || "—"}
                      </td>
                      {isAuthorized && (
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              question.isPublished
                                ? "bg-green-50 text-green-600 border border-green-200"
                                : "bg-gray-50 text-gray-500 border border-gray-200"
                            }`}
                          >
                            {question.isPublished ? "Đã xuất bản" : "Bản nháp"}
                          </span>
                        </td>
                      )}
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
                    <span key={p} className="flex items-center gap-2">
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span className="px-2 py-2">...</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-4 py-2 rounded-lg transition ${
                          page === p
                            ? "bg-navy-600 text-white"
                            : "bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
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
