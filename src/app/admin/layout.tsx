"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userLoading } = useAuth();

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!["ADMIN", "LECTURER"].includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [router, user, userLoading, pathname]);

  if (userLoading || !user || !["ADMIN", "LECTURER"].includes(user.role)) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-gray-500">
          Đang kiểm tra quyền quản trị...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
