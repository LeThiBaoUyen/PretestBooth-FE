"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { useAuth } from "@/lib/hooks";
import type { LecturerPermission, User as ApiUser } from "@/lib/api/types";
import { hasAnyPermission } from "@/lib/auth/permissions";
import {
  LayoutDashboard,
  FileText,
  Monitor,
  SlidersHorizontal,
  User,
  Users,
  BookOpen,
  ClipboardList,
  CalendarDays,
} from "lucide-react";

type Role = "STUDENT" | "LECTURER" | "ADMIN";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles?: Role[];
  permissions?: LecturerPermission[];
};

const dashboardNavItems: NavItem[] = [
  {
    label: "Tổng quan",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["STUDENT", "LECTURER", "ADMIN"],
  },
  {
    label: "Đề thi",
    href: "/exams",
    icon: FileText,
    roles: ["STUDENT", "LECTURER", "ADMIN"],
  },
  {
    label: "Quản lý Booth",
    href: "/admin/booths",
    icon: Monitor,
    permissions: ["MANAGE_BOOTHS"],
  },
  {
    label: "Lịch trình Booth",
    href: "/admin/booths/schedule",
    icon: CalendarDays,
    permissions: ["MANAGE_BOOTHS"],
  },
  {
    label: "Cài đặt hệ thống",
    href: "/admin/settings",
    icon: SlidersHorizontal,
    roles: ["ADMIN"],
  },
  {
    label: "Quản lý Sinh viên",
    href: "/admin/users",
    icon: Users,
    permissions: ["MANAGE_STUDENTS"],
  },
  {
    label: "Quản lý Giảng viên",
    href: "/admin/lecturers",
    icon: Users,
    permissions: ["LECTURER_ADMIN"],
  },
  {
    label: "Phân quyền hệ thống",
    href: "/admin/access-control",
    icon: SlidersHorizontal,
    permissions: ["LECTURER_ADMIN"],
  },
  {
    label: "Hồ sơ cá nhân",
    href: "/dashboard/profile",
    icon: User,
    roles: ["STUDENT", "LECTURER", "ADMIN"],
  },
];

const externalNavItems: NavItem[] = [
  {
    label: "Danh sách bài lập trình",
    href: "/problems",
    icon: BookOpen,
    roles: ["STUDENT"],
  },
  {
    label: "Ngân hàng câu hỏi",
    href: "/question-bank",
    icon: BookOpen,
    permissions: ["MANAGE_QUESTION_BANK"],
  },
  {
    label: "Lịch sử nộp bài",
    href: "/submissions",
    icon: ClipboardList,
    roles: ["STUDENT", "LECTURER", "ADMIN"],
  },
  {
    label: "Đặt lịch Booth",
    href: "/booths/booking",
    icon: CalendarDays,
    roles: ["STUDENT"],
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getSectionTitle(pathname: string) {
  if (pathname.startsWith("/exams")) return "Quản lý và làm đề thi";
  if (pathname.startsWith("/admin/booths/schedule")) return "Lịch trình Booth";
  if (pathname.startsWith("/admin/booths")) return "Quản lý Booth";
  if (pathname.startsWith("/admin/settings")) return "Cài đặt hệ thống";
  if (pathname.startsWith("/admin/users")) return "Quản trị người dùng";
  if (pathname.startsWith("/admin/lecturers")) return "Quản lý giảng viên";
  if (pathname.startsWith("/admin/access-control")) return "Phân quyền hệ thống";
  if (pathname.startsWith("/problems")) return "Danh sách bài lập trình";
  if (pathname.startsWith("/question-bank")) return "Ngân hàng câu hỏi";
  if (pathname.startsWith("/submissions")) return "Lịch sử nộp bài";
  if (pathname.startsWith("/booths/booking")) return "Đặt lịch booth";
  return "Tổng quan hệ thống";
}

function canAccessNavItem(item: NavItem, role: Role, user: ApiUser) {
  if (item.permissions && item.permissions.length > 0) {
    return hasAnyPermission(user, item.permissions);
  }

  if (item.roles && item.roles.length > 0) {
    return item.roles.includes(role);
  }

  return true;
}

function NavList({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const active = isItemActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-navy-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-navy-50 hover:text-navy-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user, userLoading } = useAuth();

  if (userLoading) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-gray-500">
          Đang tải dashboard...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-gray-700">Bạn cần đăng nhập để sử dụng dashboard.</p>
          <Link
            href="/login?force=1"
            className="mt-4 inline-block rounded-lg bg-navy-600 px-5 py-2.5 font-semibold text-white hover:bg-navy-700"
          >
            Đi tới đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  const role = user.role as Role;
  const primaryItems = dashboardNavItems.filter((item) => canAccessNavItem(item, role, user));
  const secondaryItems = externalNavItems.filter((item) => canAccessNavItem(item, role, user));
  const sectionTitle = getSectionTitle(pathname);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Workspace</p>
              <h1 className="text-lg font-bold text-slate-900">{sectionTitle}</h1>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-navy-50 px-3 py-1 text-xs font-bold text-navy-700">
              Vai trò: {role}
            </span>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-2 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {primaryItems.map((item) => {
              const active = isItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-navy-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          {secondaryItems.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto border-t border-slate-100 pt-2">
              {secondaryItems.map((item) => {
                const active = isItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-slate-700 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block xl:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Dashboard
              </p>
              <NavList items={primaryItems} pathname={pathname} />

              <div className="my-4 border-t border-slate-100" />

              <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Liên kết nhanh
              </p>
              <NavList items={secondaryItems} pathname={pathname} />
            </div>
          </aside>

          <section className="lg:col-span-9 xl:col-span-10">{children}</section>
        </div>
      </div>
    </main>
  );
}
