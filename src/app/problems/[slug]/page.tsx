"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { problemsApiClient } from "@/lib/api/problems";
import { getTokenManager } from "@/lib/auth/tokenManager";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Difficulty } from "@/lib/api/types";

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState<"description" | "submissions">(
    "description",
  );

  const tokenManager = getTokenManager();
  const accessToken = tokenManager.getAccessToken();

  const {
    data: problem,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["problem", slug],
    queryFn: () =>
      problemsApiClient.getProblemBySlug(slug, accessToken || undefined),
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

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 pt-16 pb-20">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !problem) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 pt-16 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                Không tìm thấy bài tập
              </h2>
              <p className="text-gray-600 mb-6">
                Bài tập này không tồn tại hoặc đã bị xóa.
              </p>
              <button
                onClick={() => router.push("/problems")}
                className="bg-navy-600 text-white px-6 py-3 rounded-lg hover:bg-navy-700 transition"
              >
                Quay lại danh sách
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => router.push("/problems")}
            className="mb-4 text-navy-600 hover:text-navy-700 font-medium flex items-center gap-2 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Quay lại danh sách
          </button>

          {/* Problem Header */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-navy-600 mb-2">
                  {problem.title}
                </h1>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(
                      problem.difficulty,
                    )}`}
                  >
                    {getDifficultyText(problem.difficulty)}
                  </span>
                  <span className="text-gray-600">
                    Tỷ lệ AC: {problem.acceptanceRate}%
                  </span>
                  <span className="text-gray-600">
                    {problem.totalSubmissions} lượt nộp
                  </span>
                </div>
              </div>
              {/* Edit Button */}
              {user &&
                (user.id === problem.creatorId || user.role === "ADMIN") &&
                ["LECTURER", "ADMIN"].includes(user.role) && (
                  <Link
                    href={`/problems/${problem.slug}/edit`}
                    className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    ✏️ Chỉnh sửa
                  </Link>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("description")}
                  className={`pb-3 px-2 font-medium transition ${
                    activeTab === "description"
                      ? "border-b-2 border-navy-600 text-navy-600"
                      : "text-gray-600 hover:text-navy-600"
                  }`}
                >
                  Mô tả
                </button>
                <button
                  onClick={() => setActiveTab("submissions")}
                  className={`pb-3 px-2 font-medium transition ${
                    activeTab === "submissions"
                      ? "border-b-2 border-navy-600 text-navy-600"
                      : "text-gray-600 hover:text-navy-600"
                  }`}
                >
                  Lịch sử nộp bài
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "description" && (
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-navy-600 mb-3">
                    Mô tả bài toán
                  </h3>
                  <div className="prose max-w-none text-gray-700">
                    <p className="whitespace-pre-wrap">{problem.description}</p>
                  </div>
                </div>

                {/* Sample Test Cases */}
                {problem.sampleTestCases &&
                  problem.sampleTestCases.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-navy-600 mb-3">
                        Ví dụ
                      </h3>
                      <div className="space-y-4">
                        {problem.sampleTestCases.map((testCase, index) => (
                          <div
                            key={testCase.id}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                          >
                            <p className="font-medium text-gray-700 mb-2">
                              Ví dụ {index + 1}:
                            </p>
                            <div className="space-y-2">
                              <div>
                                <span className="font-medium text-gray-600">
                                  Đầu vào:
                                </span>
                                <pre className="bg-white p-2 rounded border border-gray-300 mt-1 text-sm overflow-x-auto">
                                  {testCase.input}
                                </pre>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">
                                  Đầu ra:
                                </span>
                                <pre className="bg-white p-2 rounded border border-gray-300 mt-1 text-sm overflow-x-auto">
                                  {testCase.expectedOutput}
                                </pre>
                              </div>
                              {testCase.explanation && (
                                <div>
                                  <span className="font-medium text-gray-600">
                                    Giải thích:
                                  </span>
                                  <p className="text-gray-700 mt-1">
                                    {testCase.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Constraints */}
                {problem.constraints && (
                  <div>
                    <h3 className="text-lg font-semibold text-navy-600 mb-3">
                      Ràng buộc
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="whitespace-pre-wrap text-gray-700">
                        {problem.constraints}
                      </p>
                    </div>
                  </div>
                )}

                {/* Hints */}
                {problem.hints && problem.hints.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-navy-600 mb-3">
                      Gợi ý
                    </h3>
                    <div className="space-y-2">
                      {problem.hints.map((hint, index) => (
                        <details
                          key={index}
                          className="bg-yellow-50 rounded-lg p-4 border border-yellow-200"
                        >
                          <summary className="font-medium text-yellow-800 cursor-pointer">
                            Gợi ý {index + 1}
                          </summary>
                          <p className="mt-2 text-gray-700">{hint}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <span className="font-medium text-gray-600">
                      Giới hạn thời gian:
                    </span>
                    <span className="ml-2 text-gray-700">
                      {problem.timeLimit} ms
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Giới hạn bộ nhớ:
                    </span>
                    <span className="ml-2 text-gray-700">
                      {problem.memoryLimit} MB
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "submissions" && (
              <div className="text-center py-12 text-gray-600">
                Tính năng đang được phát triển
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={() => router.push(`/exam?problem=${slug}`)}
              className="bg-navy-600 text-white px-8 py-3 rounded-lg hover:bg-navy-700 transition font-semibold text-lg"
            >
              Bắt đầu làm bài
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
