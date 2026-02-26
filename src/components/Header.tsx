"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const userName = user?.name || null;

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
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
          <nav className="hidden md:flex space-x-8 items-center">
            <Link
              href="/"
              className="text-gray-700 hover:text-navy-600 transition"
            >
              Trang chủ
            </Link>
            <Link
              href="/problems"
              className="text-gray-700 hover:text-navy-600 transition"
            >
              Bài tập
            </Link>
            <Link
              href="/submissions"
              className="text-gray-700 hover:text-navy-600 transition"
            >
              Lịch sử nộp bài
            </Link>
            <Link
              href="/questions"
              className="text-gray-700 hover:text-navy-600 transition"
            >
              Ngân hàng câu hỏi
            </Link>
            <Link
              href="#about"
              className="text-gray-700 hover:text-navy-600 transition"
            >
              Giới thiệu
            </Link>
            <Link
              href="#features"
              className="text-gray-700 hover:text-navy-600 transition"
            >
              Tính năng
            </Link>
            <Link
              href="#contact"
              className="text-gray-700 hover:text-navy-600 transition"
            >
              Liên hệ
            </Link>
          </nav>

          {/* Auth/User Info */}
          <div className="hidden md:flex items-center space-x-4">
            {userName ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-navy-100 hover:bg-navy-200 transition"
                >
                  <div className="w-8 h-8 bg-navy-600 rounded-full flex items-center justify-center text-white font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-navy-600 font-medium">{userName}</span>
                  <svg
                    className={`w-4 h-4 text-navy-600 transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm text-gray-600">Đã đăng nhập</p>
                      <p className="text-base font-semibold text-navy-600">
                        {userName}
                      </p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      📊 Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition font-medium"
                    >
                      🚪 Đăng xuất
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
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            <svg
              className="w-6 h-6 text-navy-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/"
              className="block text-gray-700 hover:text-navy-600 py-2 transition"
            >
              Trang chủ
            </Link>
            <Link
              href="/problems"
              className="block text-gray-700 hover:text-navy-600 py-2 transition"
            >
              Bài tập
            </Link>
            <Link
              href="/submissions"
              className="block text-gray-700 hover:text-navy-600 py-2 transition"
            >
              Lịch sử nộp bài
            </Link>
            <Link
              href="/questions"
              className="block text-gray-700 hover:text-navy-600 py-2 transition"
            >
              Ngân hàng câu hỏi
            </Link>
            <Link
              href="#about"
              className="block text-gray-700 hover:text-navy-600 py-2 transition"
            >
              Giới thiệu
            </Link>
            <Link
              href="#features"
              className="block text-gray-700 hover:text-navy-600 py-2 transition"
            >
              Tính năng
            </Link>
            <Link
              href="#contact"
              className="block text-gray-700 hover:text-navy-600 py-2 transition"
            >
              Liên hệ
            </Link>
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
                    href="/dashboard"
                    className="block text-navy-600 hover:text-navy-700 py-2 transition"
                  >
                    📊 Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left text-red-600 hover:text-red-700 py-2 transition font-medium"
                  >
                    🚪 Đăng xuất
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
