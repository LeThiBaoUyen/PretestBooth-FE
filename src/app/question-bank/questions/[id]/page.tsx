"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { questionsApiClient } from "@/lib/api/questions";
import { useAuth } from "@/lib/hooks";
import type { Difficulty, QuestionType } from "@/lib/api/types";

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

const getTypeLabel = (type: QuestionType) => {
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

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuth();
  const questionId = params.id as string;

  const isAuthorized = user && ["LECTURER", "ADMIN"].includes(user.role);

  const {
    data: question,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["question", questionId],
    queryFn: () =>
      questionsApiClient.getQuestionById(questionId, accessToken || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!accessToken) throw new Error("Bạn cần đăng nhập");
      return questionsApiClient.deleteQuestion(questionId, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      router.push("/question-bank/questions");
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: () => {
      if (!accessToken) throw new Error("Bạn cần đăng nhập");
      return questionsApiClient.togglePublish(questionId, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question", questionId] });
    },
  });

  const canEdit =
    user &&
    question &&
    isAuthorized &&
    (user.id === question.creatorId || user.role === "ADMIN");

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

  if (error || !question) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 pt-16 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                Không tìm thấy câu hỏi
              </h2>
              <p className="text-gray-600 mb-6">
                Câu hỏi này không tồn tại hoặc đã bị xóa.
              </p>
              <button
                onClick={() => router.push("/question-bank/questions")}
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back */}
          <button
            onClick={() => router.push("/question-bank/questions")}
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

          {/* Header Card */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">
                    {getTypeIcon(question.questionType)}
                  </span>
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {getTypeLabel(question.questionType)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(
                      question.difficulty,
                    )}`}
                  >
                    {getDifficultyText(question.difficulty)}
                  </span>
                  {question.isPublished ? (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      Đã xuất bản
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-50 text-gray-500 border border-gray-200">
                      Bản nháp
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-navy-600 leading-relaxed whitespace-pre-wrap">
                  {question.content}
                </h1>
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => togglePublishMutation.mutate()}
                    disabled={togglePublishMutation.isPending}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      question.isPublished
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {question.isPublished ? "Ẩn" : "Xuất bản"}
                  </button>
                  <Link
                    href={`/question-bank/questions/${question.id}/edit`}
                    className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition font-medium text-sm"
                  >
                    ✏️ Sửa
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) {
                        deleteMutation.mutate();
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium text-sm"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              )}
            </div>

            {/* Subject & Topic */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {question.subject && (
                <span className="flex items-center gap-1">
                  📚{" "}
                  <span className="font-medium">{question.subject.name}</span>
                </span>
              )}
              {question.topic && (
                <span className="flex items-center gap-1">
                  📂 <span className="font-medium">{question.topic.name}</span>
                </span>
              )}
              <span className="text-gray-400">
                {new Date(question.createdAt).toLocaleDateString("vi-VN")}
              </span>
            </div>
          </div>

          {/* Choices / Answer */}
          {question.questionType !== "SHORT_ANSWER" &&
            question.choices &&
            question.choices.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold text-navy-600 mb-4">
                  Đáp án
                </h2>
                <div className="space-y-3">
                  {question.choices
                    .sort((a, b) => a.order - b.order)
                    .map((choice, index) => (
                      <div
                        key={choice.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                          choice.isCorrect
                            ? "border-green-300 bg-green-50"
                            : "border-gray-200"
                        }`}
                      >
                        {/* Correct indicator */}
                        <span
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                            choice.isCorrect
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {choice.isCorrect ? (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : null}
                        </span>

                        {/* Label */}
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-navy-100 text-navy-600 flex items-center justify-center text-sm font-bold">
                          {String.fromCharCode(65 + index)}
                        </span>

                        {/* Content */}
                        <span
                          className={`flex-1 ${
                            choice.isCorrect
                              ? "text-green-800 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          {choice.content}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

          {question.questionType === "SHORT_ANSWER" &&
            question.correctAnswer && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold text-navy-600 mb-4">
                  Đáp án đúng
                </h2>
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <p className="text-green-800 font-medium">
                    {question.correctAnswer}
                  </p>
                </div>
              </div>
            )}

          {/* Explanation */}
          {question.explanation && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold text-navy-600 mb-4">
                Giải thích
              </h2>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {question.explanation}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
