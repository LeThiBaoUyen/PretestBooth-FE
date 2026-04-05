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
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1">
            <Link
              href="/exams"
              className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Đề thi
            </Link>
            <Link
              href="/question-bank"
              className="rounded-full bg-navy-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              Ngân hàng câu hỏi
            </Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href="/question-bank/categories"
            className="inline-flex w-fit items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Quản lý Subject và Topic
          </Link>
          <Link
            href="/question-bank/review"
            className="inline-flex w-fit items-center rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
          >
            Review câu hỏi theo quý
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
    </div>
  );
}
