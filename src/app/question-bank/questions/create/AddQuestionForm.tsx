"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { questionsApiClient } from "@/lib/api/questions";
import { useAuth } from "@/lib/hooks/useAuth";
import type {
  Difficulty,
  QuestionType,
  CreateQuestionRequest,
  CreateChoiceRequest,
} from "@/lib/api/types";

const DIFFICULTY_OPTIONS: {
  value: Difficulty;
  label: string;
  color: string;
}[] = [
  {
    value: "EASY",
    label: "Dễ",
    color: "bg-green-100 text-green-700 border-green-300",
  },
  {
    value: "MEDIUM",
    label: "Trung bình",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
  {
    value: "HARD",
    label: "Khó",
    color: "bg-red-100 text-red-700 border-red-300",
  },
];

const TYPE_OPTIONS: { value: QuestionType; label: string; icon: string }[] = [
  { value: "SINGLE_CHOICE", label: "Một đáp án (ABCD)", icon: "🔘" },
  { value: "MULTIPLE_CHOICE", label: "Nhiều đáp án", icon: "☑️" },
  { value: "SHORT_ANSWER", label: "Tự luận ngắn", icon: "✏️" },
];

export default function AddQuestionForm() {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const isAuthorized = user && ["LECTURER", "ADMIN"].includes(user.role);

  // Form state
  const [content, setContent] = useState("");
  const [questionType, setQuestionType] =
    useState<QuestionType>("SINGLE_CHOICE");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [choices, setChoices] = useState<CreateChoiceRequest[]>([
    { content: "", isCorrect: true, order: 0 },
    { content: "", isCorrect: false, order: 1 },
    { content: "", isCorrect: false, order: 2 },
    { content: "", isCorrect: false, order: 3 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch subjects
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

  // Reset topicId when subject changes
  useEffect(() => {
    setTopicId("");
  }, [subjectId]);

  // Update choices
  const updateChoice = (
    index: number,
    field: keyof CreateChoiceRequest,
    value: string | boolean | number,
  ) => {
    const updated = [...choices];
    updated[index] = { ...updated[index], [field]: value };

    // For SINGLE_CHOICE, ensure only one is correct
    if (
      field === "isCorrect" &&
      value === true &&
      questionType === "SINGLE_CHOICE"
    ) {
      updated.forEach((c, i) => {
        if (i !== index) c.isCorrect = false;
      });
    }

    setChoices(updated);
  };

  const addChoice = () => {
    setChoices([
      ...choices,
      { content: "", isCorrect: false, order: choices.length },
    ]);
  };

  const removeChoice = (index: number) => {
    if (choices.length <= 2) return;
    setChoices(choices.filter((_, i) => i !== index));
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateQuestionRequest) => {
      if (!accessToken) throw new Error("Bạn cần đăng nhập");
      return questionsApiClient.createQuestion(data, accessToken);
    },
    onSuccess: (question) => {
      router.push(`/question-bank/questions/${question.id}`);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi tạo câu hỏi",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!accessToken) {
      setFormError("Bạn cần đăng nhập để tạo câu hỏi");
      return;
    }

    if (!subjectId) {
      setFormError("Vui lòng chọn môn học");
      return;
    }

    const data: CreateQuestionRequest = {
      content: content.trim(),
      questionType,
      difficulty,
      subjectId,
      topicId: topicId || undefined,
      explanation: explanation.trim() || undefined,
      isPublished,
    };

    if (questionType === "SHORT_ANSWER") {
      if (!correctAnswer.trim()) {
        setFormError("Câu hỏi tự luận ngắn phải có đáp án đúng");
        return;
      }
      data.correctAnswer = correctAnswer.trim();
    } else {
      const validChoices = choices.filter((c) => c.content.trim());
      if (validChoices.length < 2) {
        setFormError("Câu hỏi trắc nghiệm phải có ít nhất 2 đáp án");
        return;
      }
      const correctCount = validChoices.filter((c) => c.isCorrect).length;
      if (questionType === "SINGLE_CHOICE" && correctCount !== 1) {
        setFormError("Câu hỏi một đáp án phải có đúng 1 đáp án đúng");
        return;
      }
      if (questionType === "MULTIPLE_CHOICE" && correctCount < 2) {
        setFormError("Câu hỏi nhiều đáp án phải có ít nhất 2 đáp án đúng");
        return;
      }
      data.choices = validChoices.map((c, i) => ({
        content: c.content.trim(),
        isCorrect: c.isCorrect,
        order: i,
      }));
    }

    createMutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-600">Tạo câu hỏi mới</h1>
          <p className="text-gray-500 mt-1">
            Tạo câu hỏi trắc nghiệm cho ngân hàng câu hỏi
          </p>
        </div>
      </div>

      {!accessToken && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">
            Bạn cần đăng nhập để tạo câu hỏi.
          </p>
          <Link
            href="/login"
            className="inline-block mt-2 text-sm text-navy-600 hover:text-navy-700 font-medium"
          >
            Đăng nhập ngay
          </Link>
        </div>
      )}

      {accessToken && !isAuthorized && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">
            Chỉ giảng viên và quản trị viên mới có thể tạo câu hỏi.
          </p>
        </div>
      )}

      {(formError || createMutation.isError) && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">
            {formError ||
              createMutation.error?.message ||
              "Đã xảy ra lỗi khi tạo câu hỏi"}
          </p>
        </div>
      )}

      {accessToken && isAuthorized && (
        <form onSubmit={handleSubmit}>
          {/* Question Type Selection */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-navy-600 mb-4">
              Loại câu hỏi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setQuestionType(opt.value)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                    questionType === opt.value
                      ? "border-navy-600 bg-navy-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span
                    className={`font-medium ${
                      questionType === opt.value
                        ? "text-navy-600"
                        : "text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Question Content */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-navy-600 mb-4">
              Nội dung câu hỏi
            </h2>

            <div className="space-y-4">
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Câu hỏi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900 resize-none"
                  required
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Độ khó
                </label>
                <div className="flex gap-3">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDifficulty(opt.value)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                        difficulty === opt.value
                          ? opt.color
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject & Topic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Môn học <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900"
                    required
                  >
                    <option value="">Chọn môn học</option>
                    {subjects?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chủ đề
                  </label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900"
                    disabled={!subjectId}
                  >
                    <option value="">Chọn chủ đề (tùy chọn)</option>
                    {topics?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Choices Section (for SINGLE_CHOICE / MULTIPLE_CHOICE) */}
          {questionType !== "SHORT_ANSWER" && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-navy-600">Đáp án</h2>
                <button
                  type="button"
                  onClick={addChoice}
                  className="px-3 py-1.5 text-sm bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition"
                >
                  + Thêm đáp án
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                {questionType === "SINGLE_CHOICE"
                  ? "Chọn đúng 1 đáp án đúng"
                  : "Chọn ít nhất 2 đáp án đúng"}
              </p>

              <div className="space-y-3">
                {choices.map((choice, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                      choice.isCorrect
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    {/* Correct marker */}
                    <button
                      type="button"
                      onClick={() =>
                        updateChoice(index, "isCorrect", !choice.isCorrect)
                      }
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        choice.isCorrect
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {choice.isCorrect && (
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
                      )}
                    </button>

                    {/* Label */}
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-navy-100 text-navy-600 flex items-center justify-center text-sm font-bold">
                      {String.fromCharCode(65 + index)}
                    </span>

                    {/* Input */}
                    <input
                      type="text"
                      value={choice.content}
                      onChange={(e) =>
                        updateChoice(index, "content", e.target.value)
                      }
                      placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900"
                    />

                    {/* Remove */}
                    {choices.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeChoice(index)}
                        className="flex-shrink-0 text-red-400 hover:text-red-600 text-xl font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correct Answer (for SHORT_ANSWER) */}
          {questionType === "SHORT_ANSWER" && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold text-navy-600 mb-4">
                Đáp án đúng
              </h2>
              <input
                type="text"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="Nhập đáp án đúng..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900"
                required
              />
            </div>
          )}

          {/* Explanation & Settings */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-navy-600 mb-4">
              Giải thích & Cài đặt
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giải thích đáp án
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={3}
                  placeholder="Giải thích tại sao đáp án đúng (tùy chọn)..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900 resize-none"
                />
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Xuất bản ngay
                  </label>
                  <p className="text-xs text-gray-500">
                    Câu hỏi sẽ hiển thị cho sinh viên
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    isPublished ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      isPublished ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href="/question-bank/questions"
              className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={
                createMutation.isPending || !content.trim() || !subjectId
              }
              className="px-8 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang tạo...
                </>
              ) : (
                "Tạo câu hỏi"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
