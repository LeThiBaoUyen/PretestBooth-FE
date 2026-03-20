"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { examsApiClient } from "@/lib/api/exams";
import { useAuth } from "@/lib/hooks";
import type { Exam, UpdateExamRequest } from "@/lib/api/types";

const DURATIONS = [30, 45, 60, 90, 120];

export default function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [isPublished, setIsPublished] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleChoices, setShuffleChoices] = useState(true);

  useEffect(() => {
    async function fetchExam() {
      setLoading(true);
      try {
        const data = await examsApiClient.getExam(id, accessToken || undefined);
        setExam(data);
        setTitle(data.title);
        setDescription(data.description || "");
        setDuration(data.duration);
        setIsPublished(data.isPublished);
        setShuffleQuestions(data.shuffleQuestions);
        setShuffleChoices(data.shuffleChoices);
      } catch (err: any) {
        setError(err.message || "Không thể tải đề thi");
      } finally {
        setLoading(false);
      }
    }
    fetchExam();
  }, [id, accessToken]);

  // Check permissions
  const canManage =
    user?.role === "ADMIN" ||
    (user?.role === "LECTURER" && exam?.creatorId === user.id);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Tên đề thi không được để trống.");
      return;
    }
    if (!exam) return;

    setSaving(true);
    setError("");
    try {
      const data: UpdateExamRequest = {
        title: title.trim(),
        description: description.trim() || null,
        duration,
        isPublished,
        shuffleQuestions,
        shuffleChoices,
      };
      await examsApiClient.updateExam(exam.id, data, accessToken!);
      router.push(`/exams/${exam.id}`);
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật đề thi.");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage && exam) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 font-semibold">
                Bạn không có quyền sửa đề thi này.
              </p>
              <Link
                href="/exams"
                className="mt-4 inline-block px-4 py-2 bg-navy-600 text-white rounded-lg font-bold hover:bg-navy-700"
              >
                Quay lại trang chủ
              </Link>
            </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Đang tải...</div>
          ) : error && !exam ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
              <Link
                href="/exams"
                className="mt-4 inline-block px-4 py-2 bg-navy-600 text-white rounded-lg font-bold hover:bg-navy-700"
              >
                Quay lại trang chủ
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h1 className="text-3xl font-bold text-navy-700 mb-2">
                Chỉnh sửa đề thi
              </h1>
              {exam && (
                <p className="text-gray-600 mb-8">
                  <span className="font-semibold">{exam.title}</span>
                </p>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                  {error}
                </div>
              )}

              {/* Form */}
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-navy-700 font-semibold mb-2">
                    Tên đề thi
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-navy-700 font-semibold mb-2">
                    Mô tả
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700 resize-none"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả chi tiết về đề thi (tuỳ chọn)"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-navy-700 font-semibold mb-2">
                    Thời gian làm bài (phút)
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
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
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <div className="font-semibold text-navy-700">
                      Xuất bản (công khai)
                    </div>
                    <div className="text-sm text-gray-600">
                      Cho phép sinh viên và giáo viên khác xem đề này
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`relative w-12 h-7 rounded-full transition-colors ${isPublished ? "bg-navy-600" : "bg-gray-300"}`}
                    onClick={() => setIsPublished(!isPublished)}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${isPublished ? "translate-x-5" : ""}`}
                    />
                  </button>
                </div>

                {/* Shuffle questions toggle */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <div className="font-semibold text-navy-700">
                      Xáo trộn thứ tự câu hỏi
                    </div>
                    <div className="text-sm text-gray-600">
                      Mỗi sinh viên nhận một thứ tự câu hỏi khác nhau
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`relative w-12 h-7 rounded-full transition-colors ${shuffleQuestions ? "bg-navy-600" : "bg-gray-300"}`}
                    onClick={() => setShuffleQuestions(!shuffleQuestions)}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${shuffleQuestions ? "translate-x-5" : ""}`}
                    />
                  </button>
                </div>

                {/* Shuffle choices toggle */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <div className="font-semibold text-navy-700">
                      Xáo trộn thứ tự đáp án
                    </div>
                    <div className="text-sm text-gray-600">
                      Mỗi sinh viên nhận một thứ tự đáp án khác nhau
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`relative w-12 h-7 rounded-full transition-colors ${shuffleChoices ? "bg-navy-600" : "bg-gray-300"}`}
                    onClick={() => setShuffleChoices(!shuffleChoices)}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${shuffleChoices ? "translate-x-5" : ""}`}
                    />
                  </button>
                </div>

                {/* Info */}
                {exam && (
                  <div className="p-4 bg-navy-50 rounded-lg border border-navy-100 text-sm text-navy-700">
                    <p className="mb-1">
                      📝 <strong>Nội dung không thể thay đổi:</strong>
                    </p>
                    <p>
                      Số câu trắc nghiệm: <strong>{exam.questionCount}</strong>{" "}
                      | Số bài code: <strong>{exam.problemCount}</strong>
                    </p>
                    <p className="mt-2 text-navy-600 text-xs">
                      Để thay đổi câu hỏi hoặc bài code, bạn cần tạo một đề thi
                      mới.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <Link
                    href={exam ? `/exams/${exam.id}` : "/exams"}
                    className="flex-1 px-6 py-3 rounded-lg font-bold text-navy-600 border border-navy-200 hover:bg-navy-50 transition text-center"
                  >
                    Huỷ
                  </Link>
                  <button
                    className="flex-1 px-6 py-3 rounded-lg font-bold text-white bg-navy-600 hover:bg-navy-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSave}
                    disabled={saving || !title.trim()}
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}
