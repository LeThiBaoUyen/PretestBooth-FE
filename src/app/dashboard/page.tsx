"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks";
import StudentStatsDashboard from "./StudentStats";
import AdminStatsDashboard from "./AdminStats";
import Link from "next/link";

const PROCTORING_NOTICE_KEY = "proctoring_violation_notice";

type ProctoringNotice = {
  title: string;
  description: string;
  createdAt: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [notice, setNotice] = useState<ProctoringNotice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(PROCTORING_NOTICE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as ProctoringNotice;
      setNotice(parsed);
    } catch {
      // ignore malformed data
    } finally {
      window.sessionStorage.removeItem(PROCTORING_NOTICE_KEY);
    }
  }, []);

  return (
    <div className="space-y-8">
      {notice && user?.role === "STUDENT" && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="text-sm font-bold">{notice.title}</p>
          <p className="mt-1 text-sm">{notice.description}</p>
        </section>
      )}

      {user?.role === "STUDENT" && <StudentStatsDashboard />}
      {user?.role === "ADMIN" && <AdminStatsDashboard />}
      {user?.role === "LECTURER" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-navy-700">Tổng quan giảng viên</h1>
          <p className="mt-2 text-sm text-slate-600">
            Chào mừng bạn quay lại. Hãy chọn chức năng bên dưới để tiếp tục công việc.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/exams"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Đề thi
            </Link>
            <Link
              href="/question-bank/questions"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Ngân hàng câu hỏi
            </Link>
            <Link
              href="/question-bank/problems"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Ngân hàng bài code
            </Link>
            <Link
              href="/submissions"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Lịch sử nộp bài
            </Link>
            <Link
              href="/booths"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Quản lý Booth
            </Link>
            <Link
              href="/dashboard/users"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Quản lý người dùng
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
