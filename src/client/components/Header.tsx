
"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData(["user"]);
  const userName = user?.name || null;

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
              <span className="text-navy-600 font-bold text-base">Xin chào, {userName}</span>
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
                <span className="block text-navy-600 font-bold py-2 text-center">Xin chào, {userName}</span>
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
