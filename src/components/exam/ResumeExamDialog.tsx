"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { examsApiClient } from "@/lib/api/exams";
import { useAuth } from "@/lib/hooks";
import type { ExamSessionListItem } from "@/lib/api/types";

const MINIMIZED_PREFIX = "resume_exam_dialog_minimized_";

function isHiddenRoute(pathname: string) {
  const hiddenRoutes = [
    "/login",
    "/register",
    "/forgot",
    "/reset",
    "/verify-email",
    "/booth-auth",
    "/booth/check-in",
  ];

  return hiddenRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function ResumeExamDialog() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userLoading, accessToken } = useAuth();

  const [session, setSession] = useState<ExamSessionListItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showMinimized, setShowMinimized] = useState(false);

  const shouldCheck = useMemo(() => {
    if (userLoading || !accessToken) return false;
    if (user?.role !== "STUDENT") return false;
    if (pathname.startsWith("/quiz")) return false;
    if (isHiddenRoute(pathname)) return false;
    return true;
  }, [pathname, user?.role, userLoading, accessToken]);

  useEffect(() => {
    if (!shouldCheck || !accessToken) {
      setShowDialog(false);
      setShowMinimized(false);
      setSession(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const sessions = await examsApiClient.listSessions(
          {
            status: "IN_PROGRESS",
            page: 1,
            limit: 5,
            sortBy: "startedAt",
            sortOrder: "desc",
          },
          accessToken,
        );

        const candidates = sessions.data || [];
        let selected: ExamSessionListItem | null = null;

        for (const candidate of candidates) {
          try {
            const detail = await examsApiClient.getSession(candidate.id, accessToken);
            const startedAt = new Date(detail.startedAt).getTime();
            const expiresAt = startedAt + detail.duration * 60 * 1000;
            const isStillActive = detail.status === "IN_PROGRESS" && Date.now() < expiresAt;

            if (isStillActive) {
              selected = candidate;
              break;
            }
          } catch {
            // Ignore stale/expired sessions and continue checking others.
          }
        }

        if (cancelled) return;

        if (!selected) {
          setSession(null);
          setShowDialog(false);
          setShowMinimized(false);
          return;
        }

        const minimizedKey = `${MINIMIZED_PREFIX}${selected.id}`;
        const isMinimized = window.sessionStorage.getItem(minimizedKey) === "1";

        setSession(selected);
        setShowDialog(!isMinimized);
        setShowMinimized(isMinimized);
      } catch {
        if (cancelled) return;
        setSession(null);
        setShowDialog(false);
        setShowMinimized(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [shouldCheck, accessToken]);

  if (!session) {
    return null;
  }

  const handleMinimize = () => {
    window.sessionStorage.setItem(`${MINIMIZED_PREFIX}${session.id}`, "1");
    setShowDialog(false);
    setShowMinimized(true);
  };

  const handleOpenDialog = () => {
    setShowDialog(true);
    setShowMinimized(false);
  };

  const handleResume = () => {
    window.sessionStorage.removeItem(`${MINIMIZED_PREFIX}${session.id}`);
    setShowDialog(false);
    setShowMinimized(false);
    router.push(`/quiz?sessionId=${session.id}`);
  };

  return (
    <>
      {showDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-900">Bạn đang có bài thi chưa nộp</h3>
            <p className="mt-2 text-slate-600">
              Bài thi <span className="font-semibold text-slate-900">{session.examTitle}</span> vẫn còn thời gian.
              Bạn có muốn quay lại để tiếp tục làm bài không?
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleMinimize}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleResume}
                className="flex-1 rounded-lg bg-navy-600 px-4 py-2.5 font-semibold text-white hover:bg-navy-700"
              >
                Quay lại bài thi
              </button>
            </div>
          </div>
        </div>
      )}

      {showMinimized && (
        <button
          type="button"
          onClick={handleOpenDialog}
          className="fixed bottom-5 right-5 z-[60] max-w-xs rounded-xl border border-navy-200 bg-white px-4 py-3 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-navy-600">Bài thi chưa nộp</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 line-clamp-1">{session.examTitle}</p>
          <p className="mt-1 text-xs text-slate-600">Nhấn để quay lại bài thi</p>
        </button>
      )}
    </>
  );
}
