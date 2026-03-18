"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { problemsApiClient } from "@/lib/api/problems";
import { questionsApiClient } from "@/lib/api/questions";
import { useAuth } from "@/lib/hooks";

export default function QuestionBankHome() {
  const { accessToken } = useAuth();

  const { data: problemsData } = useQuery({
    queryKey: ["problems-count"],
    queryFn: () => problemsApiClient.getProblems({ page: 1, limit: 1 }),
  });

  const { data: questionsData } = useQuery({
    queryKey: ["questions-count"],
    queryFn: () =>
      questionsApiClient.getQuestions(
        { page: 1, limit: 1 },
        accessToken || undefined,
      ),
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => questionsApiClient.getSubjects(accessToken || undefined),
  });

  const totalProblems = problemsData?.total ?? 0;
  const totalQuestions = questionsData?.total ?? 0;
  const totalAll = totalProblems + totalQuestions;

  return (
    <div className="max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="ui-page-header">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="ui-page-title">Ngân hàng câu hỏi</h1>
            <p className="ui-page-subtitle">
              Quản lý bài tập lập trình và câu hỏi trắc nghiệm tập trung
            </p>
          </div>
          <Link
            href="/question-bank/categories"
            className="inline-flex w-fit items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Quản lý Subject và Topic
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="ui-kpi-card">
          <p className="ui-kpi-value text-navy-600">{totalAll}</p>
          <p className="ui-kpi-label">Tổng câu hỏi</p>
        </div>
        <div className="ui-kpi-card">
          <p className="ui-kpi-value text-indigo-600">{totalProblems}</p>
          <p className="ui-kpi-label">Bài tập lập trình</p>
        </div>
        <div className="ui-kpi-card">
          <p className="ui-kpi-value text-emerald-600">
            {totalQuestions}
          </p>
          <p className="ui-kpi-label">Câu hỏi trắc nghiệm</p>
        </div>
      </div>

      {/* Two Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Problems Card */}
        <Link
          href="/question-bank/problems"
          className="group bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition border-2 border-transparent hover:border-indigo-200"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center text-3xl">
              💻
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy-600 group-hover:text-indigo-600 transition">
                Bài tập lập trình
              </h2>
              <p className="text-sm text-gray-500">{totalProblems} bài tập</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            Các bài tập lập trình có test case, cho phép sinh viên viết code và
            nộp bài tự động chấm điểm.
          </p>
          <div className="mt-4 text-indigo-600 font-medium text-sm flex items-center gap-1">
            Xem danh sách →
          </div>
        </Link>

        {/* Questions Card */}
        <Link
          href="/question-bank/questions"
          className="group bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition border-2 border-transparent hover:border-emerald-200"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center text-3xl">
              📝
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy-600 group-hover:text-emerald-600 transition">
                Câu hỏi trắc nghiệm
              </h2>
              <p className="text-sm text-gray-500">{totalQuestions} câu hỏi</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            Câu hỏi trắc nghiệm ABCD, nhiều đáp án, và tự luận ngắn — phân loại
            theo môn học và chủ đề.
          </p>
          <div className="mt-4 text-emerald-600 font-medium text-sm flex items-center gap-1">
            Xem danh sách →
          </div>
        </Link>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-700">
          Bạn có thể quản lý Subject và Topic tại
          <Link href="/question-bank/categories" className="ml-1 font-semibold text-navy-700 hover:underline">
            trang phân loại
          </Link>
          để dùng tham chiếu thân thiện khi import dữ liệu.
        </p>
      </div>

      {/* Subjects Overview */}
      {subjects && subjects.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-navy-600 mb-4">Môn học</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-xl">📚</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {subject.name}
                  </p>
                  {subject.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {subject.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {subject.questionCount ?? 0} câu
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
