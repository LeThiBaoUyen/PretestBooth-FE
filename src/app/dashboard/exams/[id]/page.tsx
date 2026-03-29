"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { examsApiClient } from "@/lib/api/exams";
import { useAuth } from "@/lib/hooks";
import type { Exam, ExamSessionListItem } from "@/lib/api/types";

export default function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [existingSession, setExistingSession] = useState<ExamSessionListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingSession, setCheckingSession] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canManage =
    user?.role === "ADMIN" ||
    (user?.role === "LECTURER" && exam?.creatorId === user.id);

  useEffect(() => {
    async function fetchExam() {
      if (!accessToken) {
        return;
      }
      setLoading(true);
      try {
        const data = await examsApiClient.getExam(id, accessToken);
        setExam(data);
      } catch (err: any) {
        setError(err.message || "Không thể tải đề thi");
      } finally {
        setLoading(false);
      }
    }
    void fetchExam();
  }, [id, accessToken]);

  // Check for existing IN_PROGRESS session
  useEffect(() => {
    async function checkExistingSession() {
      if (!id || !accessToken || !user?.id) return;
      setCheckingSession(true);
      try {
        const sessions = await examsApiClient.listSessions(
          { status: "IN_PROGRESS", page: 1, limit: 100 },
          accessToken,
        );
        // Find session for this exam
        const currentExamSession = sessions.data?.find((s) => s.examId === id && s.status === "IN_PROGRESS");
        if (currentExamSession) {
          setExistingSession(currentExamSession);
        } else {
          setExistingSession(null);
        }
      } catch {
        // Silently fail if we can't fetch sessions
        setExistingSession(null);
      } finally {
        setCheckingSession(false);
      }
    }
    checkExistingSession();
  }, [id, accessToken, user?.id]);

  const handleStartExam = async () => {
    if (!accessToken || !exam) {
      router.push("/login");
      return;
    }
    try {
      const session = await examsApiClient.startSession(exam.id, accessToken);
      router.push(`/quiz?sessionId=${session.id}`);
    } catch (err: any) {
      alert(err.message || "Không thể bắt đầu đề thi");
    }
  };

  const handleResumeExam = async () => {
    if (!accessToken || !existingSession) {
      router.push("/login");
      return;
    }
    try {
      router.push(`/quiz?sessionId=${existingSession.id}`);
    } catch (err: any) {
      alert(err.message || "Không thể tiếp tục đề thi");
    }
  };

  const handleDelete = async () => {
    if (!exam || !accessToken) return;
    setDeleting(true);
    try {
      await examsApiClient.deleteExam(exam.id, accessToken);
      router.push("/exams");
    } catch (err: any) {
      alert(err.message || "Không thể xóa đề thi");
      setDeleting(false);
    }
  };

  const difficultyLabel =
    exam?.difficulty === "EASY"
      ? "Dễ"
      : exam?.difficulty === "MEDIUM"
        ? "Trung bình"
        : exam?.difficulty === "HARD"
          ? "Khó"
          : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Đang tải...</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
              <Link
                href="/exams"
                className="mt-4 inline-block px-4 py-2 bg-navy-600 text-white rounded-lg font-bold hover:bg-navy-700"
              >
                Quay lại trang chủ
              </Link>
            </div>
          ) : exam ? (
            <div className="bg-white rounded-2xl shadow-lg px-8 pb-8 pt-5 sm:pt-6">
              {/* Header section */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h1 className="text-4xl font-bold text-navy-700 leading-tight mb-3">
                  {exam.title}
                </h1>
                {exam.description && (
                  <p className="text-gray-600 text-lg mb-4">
                    {exam.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {exam.subject && (
                    <span className="bg-navy-50 text-navy-600 px-4 py-2 rounded-full text-sm font-semibold">
                      📚 {exam.subject.name}
                    </span>
                  )}
                  {exam.topic && (
                    <span className="bg-navy-50 text-navy-600 px-4 py-2 rounded-full text-sm font-semibold">
                      🏷️ {exam.topic.name}
                    </span>
                  )}
                  {difficultyLabel && (
                    <span className="bg-navy-50 text-navy-600 px-4 py-2 rounded-full text-sm font-semibold">
                      📊 Mức độ: {difficultyLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-navy-600">
                    {exam.duration}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">⏰ Phút</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-navy-600">
                    {exam.questionCount}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">❓ Câu TN</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-navy-600">
                    {exam.problemCount}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">💻 Bài Code</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-navy-600">
                    {exam.sessionCount || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">👁️ Lượt thi</div>
                </div>
              </div>

              {/* Shuffle settings */}
              <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-100">
                <h3 className="font-semibold text-navy-700 mb-3">
                  ⚙️ Cài đặt xáo trộn
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div>
                    🔀 Thứ tự câu hỏi:{" "}
                    <span className="font-semibold">
                      {exam.shuffleQuestions ? "✓ Xáo trộn" : "✗ Theo thứ tự"}
                    </span>
                  </div>
                  <div>
                    🔀 Thứ tự đáp án:{" "}
                    <span className="font-semibold">
                      {exam.shuffleChoices ? "✓ Xáo trộn" : "✗ Theo thứ tự"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exam items */}
              {exam.items && exam.items.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-navy-700 mb-4">
                    📋 Danh sách câu hỏi ({exam.items.length})
                  </h3>
                  <div className="space-y-3">
                    {exam.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="font-bold text-navy-600 text-lg min-w-fit">
                              {idx + 1}.
                            </span>
                            {item.question ? (
                              <div className="flex-1">
                                <div className="text-gray-800 font-medium line-clamp-2">
                                  {item.question.content}
                                </div>
                                <div className="flex gap-2 mt-2 text-xs">
                                  <span className="bg-navy-100 text-navy-700 px-2 py-1 rounded">
                                    {item.question.questionType ===
                                    "SINGLE_CHOICE"
                                      ? "1 đáp án"
                                      : item.question.questionType ===
                                          "MULTIPLE_CHOICE"
                                        ? "Nhiều đáp án"
                                        : "Tự luận"}
                                  </span>
                                  {item.question.difficulty && (
                                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                      {item.question.difficulty === "EASY"
                                        ? "Dễ"
                                        : item.question.difficulty === "MEDIUM"
                                          ? "TB"
                                          : "Khó"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : item.problem ? (
                              <div className="flex-1">
                                <div className="text-gray-800 font-medium">
                                  {item.problem.title}
                                </div>
                                <div className="flex gap-2 mt-2 text-xs">
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                    Bài code
                                  </span>
                                  {item.problem.difficulty && (
                                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                      {item.problem.difficulty === "EASY"
                                        ? "Dễ"
                                        : item.problem.difficulty === "MEDIUM"
                                          ? "TB"
                                          : "Khó"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.points} điểm
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {existingSession ? (
                  <>
                    <button
                      className="flex-1 px-6 py-3 rounded-lg font-bold text-white bg-amber-600 hover:bg-amber-700 transition text-lg"
                      onClick={handleResumeExam}
                      disabled={checkingSession}
                    >
                      ⏸️ Tiếp tục bài thi
                    </button>
                    <button
                      className="flex-1 px-6 py-3 rounded-lg font-bold text-gray-600 border border-gray-300 hover:bg-gray-50 transition text-lg"
                      onClick={() => setExistingSession(null)}
                      disabled={checkingSession}
                    >
                      ➕ Làm bài mới
                    </button>
                  </>
                ) : (
                  <button
                    className="flex-1 px-6 py-3 rounded-lg font-bold text-white bg-navy-600 hover:bg-navy-700 transition text-lg"
                    onClick={handleStartExam}
                  >
                    ▶️ Bắt đầu thi ngay
                  </button>
                )}
                {canManage && (
                  <>
                    <Link
                      href={`/exams/${exam.id}/edit`}
                      className="flex-1 px-6 py-3 rounded-lg font-bold text-navy-600 border border-navy-200 hover:bg-navy-50 transition text-center"
                    >
                      ✏️ Chỉnh sửa
                    </Link>
                    <button
                      className="flex-1 px-6 py-3 rounded-lg font-bold text-red-600 border border-red-200 hover:bg-red-50 transition"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      🗑️ Xóa đề thi
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Delete confirmation modal */}
          {showDeleteConfirm && exam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
                <h3 className="text-xl font-bold text-navy-700 mb-3 text-center">
                  Xác nhận xóa
                </h3>
                <p className="text-gray-600 text-sm text-center mb-2">
                  Bạn có chắc muốn xóa đề thi:
                </p>
                <p className="text-navy-700 font-semibold text-center mb-4">
                  &ldquo;{exam.title}&rdquo;
                </p>
                <p className="text-red-500 text-xs text-center mb-6">
                  Thao tác này không thể hoàn tác. Tất cả phiên thi và kết quả
                  liên quan sẽ bị xóa.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 px-4 py-2.5 rounded-lg font-bold border border-navy-200 text-navy-600 hover:bg-navy-50 transition"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Huỷ
                  </button>
                  <button
                    className="flex-1 px-4 py-2.5 rounded-lg font-bold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Đang xóa..." : "Xóa đề thi"}
                  </button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}
