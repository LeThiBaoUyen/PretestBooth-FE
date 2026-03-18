"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2, LogOut, Monitor, UserRoundCheck } from "lucide-react";
import { apiClient } from "@/lib/api/auth";
import { boothSessionManager, type BoothSessionMeta } from "@/lib/auth/boothSession";
import { useAuth } from "@/lib/hooks/useAuth";

export default function BoothWorkspacePage() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const canAdminLogoutBooth = user?.role === "ADMIN";
  const [meta, setMeta] = useState<BoothSessionMeta | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    setMeta(boothSessionManager.getMeta());
    setToken(boothSessionManager.getToken());
  }, [router]);

  const boothLabel = useMemo(() => {
    if (!meta) return "";
    return `${meta.boothName} (${meta.boothCode})`;
  }, [meta]);

  const handleBoothLogout = async () => {
    if (!token || !accessToken || !canAdminLogoutBooth) return;

    try {
      setLoggingOut(true);
      setMessage("");
      await apiClient.boothLogout({ boothSessionToken: token }, accessToken);
      boothSessionManager.clear();
      router.replace("/booth-auth");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đăng xuất booth.");
    } finally {
      setLoggingOut(false);
    }
  };

  if (!meta || !token) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Đang kiểm tra phiên booth...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-2xl border border-white/15 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/20 p-3 text-emerald-300">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wider text-slate-300">Booth đang hoạt động</p>
              <h1 className="text-2xl font-bold">{boothLabel}</h1>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-900 transition hover:bg-emerald-400"
            >
              <UserRoundCheck className="mr-2 h-4 w-4" />
              Đăng nhập sinh viên tại booth
            </Link>

            {canAdminLogoutBooth ? (
              <button
                type="button"
                onClick={handleBoothLogout}
                disabled={loggingOut}
                className="inline-flex items-center justify-center rounded-xl border border-red-300/50 bg-red-500/15 px-4 py-3 font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Đăng xuất booth
              </button>
            ) : (
              <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-100">
                Chỉ tài khoản ADMIN mới được phép đăng xuất booth.
              </div>
            )}
          </div>

          {message && (
            <p className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {message}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}