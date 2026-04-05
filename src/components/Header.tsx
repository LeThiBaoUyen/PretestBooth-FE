"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/auth";
import { boothSessionManager, type BoothSessionMeta } from "@/lib/auth/boothSession";
import { useAuth } from "@/lib/hooks/useAuth";
import type { LecturerPermission } from "@/lib/api/types";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { Menu, X, ChevronDown, LayoutDashboard, LogOut, SlidersHorizontal, User } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  roles?: Array<"STUDENT" | "LECTURER" | "ADMIN">;
  permissions?: LecturerPermission[];
};

const navItems: NavItem[] = [
  { label: "Đề thi", href: "/exams" },
  { label: "Danh sách bài lập trình", href: "/problems", roles: ["STUDENT"] },
  { label: "Ngân hàng câu hỏi", href: "/question-bank", permissions: ["MANAGE_QUESTION_BANK"] },
  { label: "Lịch sử nộp bài", href: "/submissions" },
  { label: "Đặt lịch Booth", href: "/booths/booking", roles: ["STUDENT"] },
  { label: "Quản lý Booth", href: "/admin/booths", permissions: ["MANAGE_BOOTHS"] },
  { label: "Lịch trình Booth", href: "/admin/booths/schedule", permissions: ["MANAGE_BOOTHS"] },
  { label: "Giám sát phiên thi/booth", href: "/admin/monitoring", permissions: ["MONITOR_SESSIONS"] },
  { label: "Quản lý Sinh viên", href: "/admin/users", permissions: ["MANAGE_STUDENTS"] },
  { label: "Quản lý Giảng viên", href: "/admin/lecturers", permissions: ["LECTURER_ADMIN"] },
  { label: "Phân quyền hệ thống", href: "/admin/access-control", permissions: ["LECTURER_ADMIN"] },
  { label: "Cài đặt hệ thống", href: "/admin/settings", roles: ["ADMIN"] },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, accessToken } = useAuth();
  const canAdminLogoutBooth = user?.role === "ADMIN";
  const userName = user?.name || null;
  const [boothMeta, setBoothMeta] = useState<BoothSessionMeta | null>(null);
  const [boothToken, setBoothToken] = useState<string | null>(null);
  const [boothLogoutLoading, setBoothLogoutLoading] = useState(false);

  useEffect(() => {
    setBoothMeta(boothSessionManager.getMeta());
    setBoothToken(boothSessionManager.getToken());
  }, [pathname]);

  const hideHeaderRoutes = [
    "/login",
    "/register",
    "/forgot",
    "/reset",
    "/verify-email",
    "/booth-auth",
    "/booth/check-in",
    "/exam",
  ];

  if (hideHeaderRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null;
  }

  const homeItem: NavItem = user
    ? { label: "Tổng quan", href: "/dashboard" }
    : { label: "Trang chủ", href: "/" };

  const visibleNavItems = [homeItem, ...navItems].filter((item) => {
    if (item.permissions && item.permissions.length > 0) {
      return hasAnyPermission(user, item.permissions);
    }

    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const handleLogout = async () => {
    if (pathname.startsWith("/quiz")) {
      const shouldLogout = window.confirm(
        "Bạn chưa nộp bài thi. Bạn có chắc muốn đăng xuất không?",
      );
      if (!shouldLogout) {
        return;
      }
    }

    const nextPath = `${window.location.pathname}${window.location.search}`;

    try {
      await logout();
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleBoothLogout = async () => {
    if (!boothToken || !accessToken || !canAdminLogoutBooth) return;

    try {
      setBoothLogoutLoading(true);
      await apiClient.boothLogout({ boothSessionToken: boothToken }, accessToken);
    } catch (error) {
      console.error("Booth logout failed:", error);
    } finally {
      boothSessionManager.clear();
      setBoothMeta(null);
      setBoothToken(null);
      setBoothLogoutLoading(false);
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-3">
            <div className="relative h-10 w-auto">
              <Image
                src="/assets/iuhcm-logo.png"
                alt="IUHCM Logo"
                width={220}
                height={64}
                className="h-10 w-auto"
                priority
              />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-navy-600 font-bold text-sm">
                Industrial University
              </p>
              <p className="text-navy-600 font-bold text-xs">PRETEST BOOTH</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {visibleNavItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-navy-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Auth/User Info */}
          <div className="hidden md:flex items-center space-x-3">
            {userName ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 transition"
                >
                  <div className="w-8 h-8 bg-navy-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-28 truncate text-slate-700 font-medium">{userName}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs text-slate-500">Đăng nhập với</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                      {user?.role && (
                        <span className="mt-2 inline-block rounded-full bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy-700">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    {user?.role === "ADMIN" && (
                      <Link
                        href="/admin/settings"
                        className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        Cài đặt hệ thống
                      </Link>
                    )}
                    {boothMeta && boothToken && canAdminLogoutBooth && (
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          handleBoothLogout();
                        }}
                        disabled={boothLogoutLoading}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-emerald-700 hover:bg-emerald-50 transition font-medium disabled:cursor-not-allowed disabled:opacity-60"
                        title={`Booth active: ${boothMeta.boothName} (${boothMeta.boothCode})`}
                      >
                        <LogOut className="h-4 w-4" />
                        {boothLogoutLoading
                          ? "Đang đăng xuất booth..."
                          : `Đăng xuất booth ${boothMeta.boothCode}`}
                      </button>
                    )}
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Hồ sơ cá nhân
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-navy-600 hover:text-navy-700 font-medium transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="bg-navy-600 text-white px-6 py-2 rounded-lg hover:bg-navy-700 transition font-medium"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Open menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <div className="rounded-xl border border-slate-200 bg-white p-2">
              {visibleNavItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-navy-600 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 space-y-2 border-t border-gray-200">
              {userName ? (
                <>
                  <div className="px-4 py-2 bg-navy-100 rounded-lg">
                    <p className="text-xs text-gray-600">Đã đăng nhập</p>
                    <p className="text-sm font-semibold text-navy-600">
                      {userName}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 text-slate-700 hover:text-navy-700 py-2 transition font-medium"
                  >
                    <User className="h-4 w-4" />
                    Hồ sơ cá nhân
                  </Link>
                  {user?.role === "ADMIN" && (
                    <Link
                      href="/admin/settings"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 text-slate-700 hover:text-navy-700 py-2 transition font-medium"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Cài đặt hệ thống
                    </Link>
                  )}
                  {boothMeta && boothToken && canAdminLogoutBooth && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleBoothLogout();
                      }}
                      disabled={boothLogoutLoading}
                      className="w-full text-left text-emerald-700 hover:text-emerald-800 py-2 transition font-medium disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {boothLogoutLoading
                        ? "Đang đăng xuất booth..."
                        : `Đăng xuất booth ${boothMeta.boothCode}`}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left text-red-600 hover:text-red-700 py-2 transition font-medium"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block text-navy-600 hover:text-navy-700 py-2 transition"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    className="block bg-navy-600 text-white px-4 py-2 rounded-lg hover:bg-navy-700 transition text-center font-medium"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
