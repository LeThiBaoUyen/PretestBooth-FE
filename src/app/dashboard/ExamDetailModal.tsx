"use client";
import React from "react";

interface ExamDetailModalProps {
  exam: {
    id: number;
    title: string;
    duration: string;
    questions: number;
    parts: number;
    tags: string[];
    views: number;
    multipleChoice: number;
    essay: number;
    leetcode: number;
  };
  onClose: () => void;
  onStart: () => void;
}

export default function ExamDetailModal({
  exam,
  onClose,
  onStart,
}: ExamDetailModalProps) {
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
        <div className="flex flex-col gap-2 mb-6 text-gray-700 text-base">
          <div>
            ⏰ <span className="font-semibold">{exam.duration}</span>
          </div>
          <div>
            👁️ <span className="font-semibold">{exam.views}</span> lượt xem
          </div>
          <div>
            📝 <span className="font-semibold">{exam.parts}</span> phần thi |{" "}
            <span className="font-semibold">{exam.questions}</span> câu hỏi
          </div>
        </div>
        <div className="mb-6">
          <div className="font-semibold mb-2">Phân loại câu hỏi:</div>
          <ul className="space-y-2">
            <li>
              • Trắc nghiệm:{" "}
              <span className="font-bold text-navy-600">
                {exam.multipleChoice}
              </span>{" "}
              câu
            </li>
            <li>
              • Tự luận:{" "}
              <span className="font-bold text-navy-600">{exam.essay}</span> câu
            </li>
            <li>
              • LeetCode:{" "}
              <span className="font-bold text-navy-600">{exam.leetcode}</span>{" "}
              câu
            </li>
          </ul>
        </div>
        <button
          className="w-full bg-navy-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-navy-700 transition"
          onClick={onStart}
        >
          Bắt đầu ngay
        </button>
      </div>
    </div>
  );
}
