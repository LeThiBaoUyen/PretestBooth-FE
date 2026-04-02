"use client";
import { useState, useEffect, useCallback } from "react";
import { examsApiClient } from "@/lib/api/exams";
import { questionsApiClient } from "@/lib/api/questions";
import { useAuth } from "@/lib/hooks";
import type { ExamListItem, Subject } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import { BookOpen, Filter, RefreshCw, Sparkles } from "lucide-react";

import ExamSelection from "./ExamSelection";
import Link from "next/link";

export default function ExamLibrary() {
  const { accessToken, user, userLoading } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "published" | "custom">("all");
  const [error, setError] = useState<string | null>(null);

  // Data
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Role check: can this user manage the given exam?
  const canManage = (_exam: ExamListItem) => hasPermission(user, "CREATE_EXAM");
  const canCreateExam = hasPermission(user, "CREATE_EXAM");

  // Fetch subjects
  useEffect(() => {
    async function fetchSubjects() {
      try {
        if (!accessToken) return;
        const data = await questionsApiClient.getSubjects(
          accessToken,
        );
        setSubjects(Array.isArray(data) ? data : []);
      } catch {
        setSubjects([]);
      }
    }
    fetchSubjects();
  }, [accessToken]);

  // Fetch exams
  const fetchExams = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setExams([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);
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
          isPublished: activeTab === "published" ? true : undefined,
        },
        accessToken,
      );
      if (Array.isArray(result)) {
        setExams(result as ExamListItem[]);
        setTotal((result as ExamListItem[]).length);
      } else {
        setExams(Array.isArray((result as any)?.data) ? (result as any).data : []);
        setTotal(Number((result as any)?.total ?? 0));
      }
    } catch (err: any) {
      setExams([]);
      setTotal(0);
      setError(err?.message || "Không thể tải danh sách đề thi.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedSubject, search, subjects, accessToken, activeTab]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeExams = Array.isArray(exams) ? exams : [];
  const visibleExams =
    user?.role === "STUDENT"
      ? safeExams.filter((exam) => exam.type === "EXAM")
      : safeExams;
  const subjectNames = ["Tất cả", ...safeSubjects.map((s) => s.name)];

  if (userLoading) {
    return (
      <div className="py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-gray-500">
          Đang kiểm tra phiên đăng nhập...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Bạn cần đăng nhập để xem đề thi</h2>
          <p className="mt-2 text-slate-600">API exam yêu cầu xác thực, vui lòng đăng nhập rồi thử lại.</p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-navy-600 px-5 py-2.5 font-semibold text-white hover:bg-navy-700"
          >
            Đi tới đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="ui-page-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="ui-page-title">Thư viện đề thi</h1>
            <p className="ui-page-subtitle">Hãy tìm theo môn học và bắt đầu phiên luyện tập/thi ngay.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-3 py-1 text-xs font-bold text-navy-700">
            <Sparkles className="h-3.5 w-3.5" />
            {user.role}
          </div>
        </div>
      </div>

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
        <button
          className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
          onClick={() => fetchExams()}
          title="Tải lại"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-navy-100 mb-8">
        <button
          className={`pb-2 font-semibold text-lg border-b-2 transition ${activeTab === "all" ? "border-navy-600 text-navy-600" : "border-transparent text-gray-500"}`}
          onClick={() => setActiveTab("all")}
        >
          Tất cả đề
        </button>
        <button
          className={`pb-2 font-semibold text-lg border-b-2 transition ${activeTab === "published" ? "border-navy-600 text-navy-600" : "border-transparent text-gray-500"}`}
          onClick={() => setActiveTab("published")}
        >
          Chỉ đề công bố
        </button>
        {canCreateExam && (
          <button
            className={`pb-2 font-semibold text-lg border-b-2 transition ${activeTab === "custom" ? "border-navy-600 text-navy-600" : "border-transparent text-gray-500"}`}
            onClick={() => setActiveTab("custom")}
          >
            Tạo đề mới
          </button>
        )}
      </div>

      {error && activeTab !== "custom" && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Không tải được dữ liệu đề thi</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "custom" && canCreateExam ? (
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
            {visibleExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-xl shadow-sm p-5 flex flex-col justify-between border border-slate-200 relative hover:shadow-md transition"
              >
                <div className="flex-1">
                  <div className="min-h-[3.5rem] mb-2">
                    <h2 className="text-lg font-bold text-navy-700 line-clamp-2">
                      {exam.title}
                    </h2>
                  </div>
                  <div className="flex items-center text-gray-500 text-sm mb-2 gap-3 min-h-[1.5rem]">
                    <span>⏰ {exam.duration} phút</span>
                    <span>👁️ {exam.sessionCount} lượt thi</span>
                    <span>📝 {exam.totalItems} câu</span>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 mb-3 min-h-[2rem]">
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
                    {!exam.subject && !exam.difficulty && (
                      <span className="invisible bg-navy-50 px-2 py-1 rounded text-xs font-semibold">
                        placeholder
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mb-2 min-h-[1.25rem]">
                    Trắc nghiệm: {exam.questionCount} | Code:{" "}
                    {exam.problemCount}
                  </div>
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-2 min-h-[1.25rem]">
                    <Filter className="h-3 w-3" />
                    {exam.isPublished ? "Công bố" : "Nháp"}
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
            {safeExams.length === 0 && (
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
