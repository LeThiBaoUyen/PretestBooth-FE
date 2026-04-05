"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks";
import StudentStatsDashboard from "./StudentStats";
import AdminStatsDashboard from "./AdminStats";

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
    </div>
  );
}
