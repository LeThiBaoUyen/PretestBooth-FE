"use client";
import { useState } from "react";
import { examsApiClient } from "@/lib/api/exams";
import type { ExamListItem, UpdateExamRequest } from "@/lib/api/types";

const DURATIONS = [30, 45, 60, 90, 120];

interface EditExamModalProps {
  exam: ExamListItem;
  accessToken: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditExamModal({
  exam,
  accessToken,
  onClose,
  onUpdated,
}: EditExamModalProps) {
  const [title, setTitle] = useState(exam.title);
  const [description, setDescription] = useState(exam.description || "");
  const [duration, setDuration] = useState(exam.duration);
  const [isPublished, setIsPublished] = useState(exam.isPublished);
  const [shuffleQuestions, setShuffleQuestions] = useState(
    exam.shuffleQuestions,
  );
  const [shuffleChoices, setShuffleChoices] = useState(exam.shuffleChoices);
  const [allowStudentReviewResults, setAllowStudentReviewResults] = useState(
    exam.allowStudentReviewResults,
  );
  const [passingScoreAbsolute, setPassingScoreAbsolute] = useState(
    exam.passingScoreAbsolute !== null && exam.passingScoreAbsolute !== undefined
      ? String(exam.passingScoreAbsolute)
      : "",
  );
  const [examType, setExamType] = useState<"PRACTICE" | "EXAM">(
    exam.type || "EXAM",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Tên đề thi không được để trống.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let normalizedPassingScoreAbsolute: number | null = null;
      if (examType === "EXAM") {
        const trimmedPassingScore = passingScoreAbsolute.trim();
        if (!trimmedPassingScore) {
          setError("Vui lòng nhập ngưỡng điểm đạt cho đề thi chính thức.");
          setLoading(false);
          return;
        }

        const parsedPassingScore = Number(trimmedPassingScore);
        if (!Number.isFinite(parsedPassingScore) || parsedPassingScore <= 0) {
          setError("Ngưỡng điểm đạt phải là số lớn hơn 0.");
          setLoading(false);
          return;
        }

        if (parsedPassingScore > exam.totalItems) {
          setError(`Ngưỡng điểm đạt không được vượt quá tổng điểm tối đa (${exam.totalItems}).`);
          setLoading(false);
          return;
        }

        normalizedPassingScoreAbsolute = parsedPassingScore;
      }

      const data: UpdateExamRequest = {
        title: title.trim(),
        description: description.trim() || null,
        duration,
        isPublished,
        shuffleQuestions,
        shuffleChoices,
        allowStudentReviewResults,
        passingScoreAbsolute:
          examType === "EXAM" ? normalizedPassingScoreAbsolute : null,
        type: examType,
      };
      await examsApiClient.updateExam(exam.id, data, accessToken);
      onUpdated();
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật đề thi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-navy-600 text-2xl font-bold"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-navy-700 mb-6 text-center">
          Chỉnh sửa đề thi
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Title */}
        <div className="mb-4">
          <label className="block text-navy-700 font-semibold mb-1 text-sm">
            Tên đề thi
          </label>
          <input
            type="text"
            className="w-full px-4 py-2.5 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {examType === "EXAM" && (
          <div className="mb-4">
            <label className="block text-navy-700 font-semibold mb-1 text-sm">
              Ngưỡng điểm đạt (điểm tuyệt đối)
            </label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              className="w-full px-4 py-2.5 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
              value={passingScoreAbsolute}
              onChange={(e) => setPassingScoreAbsolute(e.target.value)}
            />
            <p className="mt-1 text-xs text-navy-500">
              Tổng điểm tối đa hiện tại: {exam.totalItems}.
            </p>
          </div>
        )}

        {/* Description */}
        <div className="mb-4">
          <label className="block text-navy-700 font-semibold mb-1 text-sm">
            Mô tả
          </label>
          <textarea
            className="w-full px-4 py-2.5 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700 resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả đề thi (tuỳ chọn)"
          />
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label className="block text-navy-700 font-semibold mb-1 text-sm">
            Thời gian (phút)
          </label>
          <select
            className="w-full px-4 py-2.5 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} phút
              </option>
            ))}
          </select>
        </div>

        {/* Published toggle */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-navy-700 font-semibold text-sm">
            Xuất bản (công khai)
          </span>
          <button
            type="button"
            className={`relative w-11 h-6 rounded-full transition-colors ${isPublished ? "bg-navy-600" : "bg-gray-300"}`}
            onClick={() => setIsPublished(!isPublished)}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublished ? "translate-x-5" : ""}`}
            />
          </button>
        </div>

        {/* Shuffle questions toggle */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-navy-700 font-semibold text-sm">
            Xáo trộn thứ tự câu hỏi
          </span>
          <button
            type="button"
            className={`relative w-11 h-6 rounded-full transition-colors ${shuffleQuestions ? "bg-navy-600" : "bg-gray-300"}`}
            onClick={() => setShuffleQuestions(!shuffleQuestions)}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${shuffleQuestions ? "translate-x-5" : ""}`}
            />
          </button>
        </div>

        {/* Shuffle choices toggle */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-navy-700 font-semibold text-sm">
            Xáo trộn thứ tự đáp án
          </span>
          <button
            type="button"
            className={`relative w-11 h-6 rounded-full transition-colors ${shuffleChoices ? "bg-navy-600" : "bg-gray-300"}`}
            onClick={() => setShuffleChoices(!shuffleChoices)}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${shuffleChoices ? "translate-x-5" : ""}`}
            />
          </button>
        </div>

        {/* Allow student review results toggle */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-navy-700 font-semibold text-sm">
            Cho sinh viên xem lại kết quả
          </span>
          <button
            type="button"
            className={`relative w-11 h-6 rounded-full transition-colors ${allowStudentReviewResults ? "bg-navy-600" : "bg-gray-300"}`}
            onClick={() =>
              setAllowStudentReviewResults(!allowStudentReviewResults)
            }
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowStudentReviewResults ? "translate-x-5" : ""}`}
            />
          </button>
        </div>

        {/* Exam Type */}
        <div className="mb-6">
          <label className="block text-navy-700 font-semibold mb-2 text-sm">
            Loại đề thi
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label
              className={`cursor-pointer rounded-lg border px-3 py-2 text-xs transition text-center ${
                examType === "PRACTICE"
                  ? "border-navy-500 bg-navy-50 text-navy-700"
                  : "border-navy-200 bg-white text-navy-600"
              }`}
            >
              <input
                type="radio"
                name="examType"
                className="mr-1"
                checked={examType === "PRACTICE"}
                onChange={() => setExamType("PRACTICE")}
              />
              Luyện Tập
            </label>
            <label
              className={`cursor-pointer rounded-lg border px-3 py-2 text-xs transition text-center ${
                examType === "EXAM"
                  ? "border-navy-500 bg-navy-50 text-navy-700"
                  : "border-navy-200 bg-white text-navy-600"
              }`}
            >
              <input
                type="radio"
                name="examType"
                className="mr-1"
                checked={examType === "EXAM"}
                onChange={() => setExamType("EXAM")}
              />
              Thi Chính Thức
            </label>
          </div>
        </div>

        {/* Info box */}
        <div className="mb-6 p-3 bg-navy-50 rounded-lg text-xs text-navy-600">
          <p>
            📝 Trắc nghiệm: <strong>{exam.questionCount}</strong> câu | Code:{" "}
            <strong>{exam.problemCount}</strong> câu
          </p>
          <p className="mt-1 text-navy-400">
            Nội dung câu hỏi không thể thay đổi sau khi tạo.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            className="flex-1 px-4 py-2.5 rounded-lg font-bold border border-navy-200 text-navy-600 hover:bg-navy-50 transition"
            onClick={onClose}
            disabled={loading}
          >
            Huỷ
          </button>
          <button
            className="flex-1 px-4 py-2.5 rounded-lg font-bold bg-navy-600 text-white hover:bg-navy-700 transition disabled:opacity-50"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
