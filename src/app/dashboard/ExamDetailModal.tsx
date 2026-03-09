"use client";

import type { ExamListItem } from "@/lib/api/types";

interface ExamDetailModalProps {
  exam: ExamListItem;
  onClose: () => void;
  onStart: () => void;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ExamDetailModal({
  exam,
  onClose,
  onStart,
  canManage,
  onEdit,
  onDelete,
}: ExamDetailModalProps) {
  const difficultyLabel =
    exam.difficulty === "EASY"
      ? "Dễ"
      : exam.difficulty === "MEDIUM"
        ? "Trung bình"
        : exam.difficulty === "HARD"
          ? "Khó"
          : "Không xác định";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-navy-600 text-2xl font-bold"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-navy-700 mb-4 text-center">
          {exam.title}
        </h2>
        {exam.description && (
          <p className="text-gray-500 text-sm text-center mb-4">
            {exam.description}
          </p>
        )}
        <div className="flex flex-col gap-2 mb-6 text-gray-700 text-base">
          <div>
            ⏰ <span className="font-semibold">{exam.duration} phút</span>
          </div>
          <div>
            👁️ <span className="font-semibold">{exam.sessionCount}</span> lượt
            thi
          </div>
          <div>
            📝 <span className="font-semibold">{exam.totalItems}</span> câu hỏi
          </div>
          {exam.difficulty && (
            <div>
              📊 Mức độ:{" "}
              <span className="font-semibold">{difficultyLabel}</span>
            </div>
          )}
        </div>
        <div className="mb-6">
          <div className="font-semibold mb-2">Phân loại câu hỏi:</div>
          <ul className="space-y-2">
            <li>
              • Trắc nghiệm:{" "}
              <span className="font-bold text-navy-600">
                {exam.questionCount}
              </span>{" "}
              câu
            </li>
            <li>
              • Bài code:{" "}
              <span className="font-bold text-navy-600">
                {exam.problemCount}
              </span>{" "}
              câu
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {exam.subject && (
            <span className="bg-navy-50 text-navy-600 px-3 py-1 rounded-full text-xs font-semibold">
              #{exam.subject.name}
            </span>
          )}
          {exam.topic && (
            <span className="bg-navy-50 text-navy-600 px-3 py-1 rounded-full text-xs font-semibold">
              #{exam.topic.name}
            </span>
          )}
        </div>
        {/* Shuffle settings */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 space-y-1">
          <div>
            🔀 Xáo trộn câu hỏi:{" "}
            <span className="font-semibold">
              {exam.shuffleQuestions ? "Có" : "Không"}
            </span>
          </div>
          <div>
            🔀 Xáo trộn đáp án:{" "}
            <span className="font-semibold">
              {exam.shuffleChoices ? "Có" : "Không"}
            </span>
          </div>
        </div>
        <button
          className="w-full bg-navy-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-navy-700 transition"
          onClick={onStart}
        >
          Bắt đầu ngay
        </button>
        {canManage && (
          <div className="flex gap-3 mt-3">
            <button
              className="flex-1 px-4 py-2.5 rounded-lg font-bold border border-navy-200 text-navy-600 hover:bg-navy-50 transition text-sm"
              onClick={onEdit}
            >
              ✏️ Chỉnh sửa
            </button>
            <button
              className="flex-1 px-4 py-2.5 rounded-lg font-bold border border-red-200 text-red-600 hover:bg-red-50 transition text-sm"
              onClick={onDelete}
            >
              🗑️ Xóa đề thi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
