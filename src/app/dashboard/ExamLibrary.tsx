"use client";
import { useState, useEffect, useCallback } from "react";
import { examsApiClient } from "@/lib/api/exams";
import { questionsApiClient } from "@/lib/api/questions";
import { useAuth } from "@/lib/hooks";
import type { ExamListItem, Subject } from "@/lib/api/types";

import ExamSelection from "./ExamSelection";
import Link from "next/link";

export default function ExamLibrary() {
  const { accessToken, user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Data
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Role check: can this user manage the given exam?
  const canManage = (exam: ExamListItem) =>
    user?.role === "ADMIN" ||
    (user?.role === "LECTURER" && exam.creatorId === user.id);

  // Fetch subjects
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const data = await questionsApiClient.getSubjects(
          accessToken || undefined,
        );
        setSubjects(data);
      } catch {
        // ignore
      }
    }
    fetchSubjects();
  }, [accessToken]);

  // Fetch exams
  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const subjectMatch =
        selectedSubject !== "Tất cả"
          ? subjects.find((s) => s.name === selectedSubject)
          : null;

      const result = await examsApiClient.listExams(
        {
          page,
          limit: 12,
          subjectId: subjectMatch?.id,
          search: search || undefined,
        },
        accessToken || undefined,
      );
      setExams(result.data);
      setTotal(result.total);
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [page, selectedSubject, search, subjects, accessToken]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const subjectNames = ["Tất cả", ...subjects.map((s) => s.name)];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-navy-600 mb-6">Thư viện đề thi</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {subjectNames.map((subject) => (
          <button
            key={subject}
            className={`px-4 py-2 rounded-full font-medium border transition text-sm ${
              selectedSubject === subject
                ? "bg-navy-600 text-white border-navy-600"
                : "bg-white text-navy-600 border-navy-200 hover:bg-navy-50"
            }`}
            onClick={() => {
              setSelectedSubject(subject);
              setPage(1);
            }}
          >
            {subject}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-8">
        <input
          type="text"
          placeholder="Nhập từ khóa bạn muốn tìm kiếm: tên đề, dạng câu hỏi ..."
          className="flex-1 px-4 py-2 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="px-6 py-2 bg-navy-600 text-white rounded-lg font-bold hover:bg-navy-700 transition"
          onClick={() => {
            setPage(1);
            fetchExams();
          }}
        >
          Tìm kiếm
        </button>
      </div>
      {/* Tabs */}
      <div className="flex gap-6 border-b border-navy-100 mb-8">
        <button
          className={`pb-2 font-semibold text-lg border-b-2 transition ${activeTab === "all" ? "border-navy-600 text-navy-600" : "border-transparent text-gray-500"}`}
          onClick={() => setActiveTab("all")}
        >
          Tất cả
        </button>
        <button
          className={`pb-2 font-semibold text-lg border-b-2 transition ${activeTab === "compact" ? "border-navy-600 text-navy-600" : "border-transparent text-gray-500"}`}
          onClick={() => setActiveTab("compact")}
        >
          Đề rút gọn
        </button>
        <button
          className={`pb-2 font-semibold text-lg border-b-2 transition ${activeTab === "custom" ? "border-navy-600 text-navy-600" : "border-transparent text-gray-500"}`}
          onClick={() => setActiveTab("custom")}
        >
          Sinh viên tự tạo bộ đề
        </button>
      </div>
      {/* Tab content */}
      {activeTab === "custom" ? (
        <ExamSelection
          onExamCreated={() => {
            setActiveTab("all");
            fetchExams();
          }}
        />
      ) : loading ? (
        <div className="text-center py-20 text-gray-500">Đang tải...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-xl shadow-md p-5 flex flex-col justify-between border border-navy-100 relative"
              >
                <div>
                  <h2 className="text-lg font-bold text-navy-700 mb-2 line-clamp-2">
                    {exam.title}
                  </h2>
                  <div className="flex items-center text-gray-500 text-sm mb-2 gap-3">
                    <span>⏰ {exam.duration} phút</span>
                    <span>👁️ {exam.sessionCount} lượt thi</span>
                    <span>📝 {exam.totalItems} câu</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {exam.subject && (
                      <span className="bg-navy-50 text-navy-600 px-2 py-1 rounded text-xs font-semibold">
                        #{exam.subject.name}
                      </span>
                    )}
                    {exam.difficulty && (
                      <span className="bg-navy-50 text-navy-600 px-2 py-1 rounded text-xs font-semibold">
                        {exam.difficulty === "EASY"
                          ? "Dễ"
                          : exam.difficulty === "MEDIUM"
                            ? "Trung bình"
                            : "Khó"}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    Trắc nghiệm: {exam.questionCount} | Code:{" "}
                    {exam.problemCount}
                  </div>
                </div>
                <Link
                  href={`/exams/${exam.id}`}
                  className="mt-2 w-full bg-navy-600 text-white py-2 rounded-lg font-bold hover:bg-navy-700 transition block text-center"
                >
                  Chi tiết
                </Link>
                {canManage(exam) && (
                  <div className="flex gap-2 mt-2">
                    <Link
                      href={`/exams/${exam.id}/edit`}
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold border border-navy-200 text-navy-600 hover:bg-navy-50 transition text-center"
                    >
                      ✏️ Sửa
                    </Link>
                  </div>
                )}
              </div>
            ))}
            {exams.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-10">
                Không tìm thấy bộ đề phù hợp.
              </div>
            )}
          </div>
          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from(
                { length: Math.ceil(total / 12) },
                (_, i) => i + 1,
              ).map((p) => (
                <button
                  key={p}
                  className={`px-3 py-1 rounded font-bold text-sm ${
                    p === page
                      ? "bg-navy-600 text-white"
                      : "bg-white text-navy-600 border border-navy-200"
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
