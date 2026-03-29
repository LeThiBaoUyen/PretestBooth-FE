"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { useAuth } from "@/lib/hooks";
import StudentStatsDashboard from "./StudentStats";
import AdminStatsDashboard from "./AdminStats";
import { ArrowRight, FileText, Monitor, Users, ClipboardList, BookOpen, CalendarDays, Sparkles } from "lucide-react";

const PROCTORING_NOTICE_KEY = "proctoring_violation_notice";

type ProctoringNotice = {
  title: string;
  description: string;
  createdAt: string;
};

type DashboardLink = {
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
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

  const commonLinks: DashboardLink[] = [
    {
      label: "Thư viện đề thi",
      description: "Xem chi tiết đề, làm bài thi và quản lý đề theo quyền.",
      href: "/exams",
      icon: FileText,
    },
    {
      label: "Ngân hàng câu hỏi",
      description: "Truy cập kho câu hỏi và bộ lọc theo môn học/chủ đề.",
      href: "/question-bank",
      icon: BookOpen,
    },
    {
      label: "Lịch sử nộp bài",
      description: "Theo dõi tiến độ làm bài và kết quả đã nộp.",
      href: "/submissions",
      icon: ClipboardList,
    },
  ];

  const roleLinks: DashboardLink[] =
    user?.role === "ADMIN"
      ? [
          {
            label: "Quản lý Booth",
            description: "Giám sát trạng thái booth và điều phối check-in/check-out.",
            href: "/admin/booths",
            icon: Monitor,
          },
          {
            label: "Lịch trình Booth",
            description: "Theo dõi danh sách đặt chỗ theo ngày và xử lý check-in/check-out.",
            href: "/admin/booths/schedule",
            icon: CalendarDays,
          },
          {
            label: "Quản lý Sinh viên",
            description: "Tìm kiếm, khóa tài khoản và import dữ liệu sinh viên.",
            href: "/admin/users",
            icon: Users,
          },
        ]
      : user?.role === "LECTURER"
        ? [
            {
              label: "Quản lý Booth",
              description: "Theo dõi lịch sử dụng booth và thao tác check-in/check-out.",
              href: "/admin/booths",
              icon: Monitor,
            },
            {
              label: "Lịch trình Booth",
              description: "Xem lịch đặt theo ngày và xử lý trạng thái sử dụng booth.",
              href: "/admin/booths/schedule",
              icon: CalendarDays,
            },
          ]
        : [
            {
              label: "Đặt lịch Booth",
              description: "Đăng ký khung giờ luyện tập hoặc thi tại booth.",
              href: "/booths/booking",
              icon: CalendarDays,
            },
          ];

  const quickLinks = [...roleLinks, ...commonLinks];

  return (
    <div className="space-y-8">
      {notice && user?.role === "STUDENT" && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="text-sm font-bold">{notice.title}</p>
          <p className="mt-1 text-sm">{notice.description}</p>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-navy-700 to-slate-800 px-6 py-6 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">PRETEST BOOTH</h1>
              <p className="mt-1 text-sm text-slate-200">
                Truy cập nhanh các bài luyện thi, theo dõi tiến độ và cải thiện kết quả của bạn.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              {user?.role || "Guest"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-lg bg-navy-50 p-2 text-navy-700 ring-1 ring-navy-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-navy-600" />
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {user?.role === "STUDENT" && <StudentStatsDashboard />}
      {user?.role === "ADMIN" && <AdminStatsDashboard />}
    </div>
  );
}
