"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/hooks";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
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

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">{children}</section>
    </main>
  );
}
