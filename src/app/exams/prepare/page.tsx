"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, Loader2, MonitorCheck, ShieldCheck } from "lucide-react";
import { examsApiClient } from "@/lib/api/exams";
import { useAuth } from "@/lib/hooks";
import { boothSessionManager } from "@/lib/auth/boothSession";

export default function ExamPreparePage() {
  const router = useRouter();
  const { accessToken, user, userLoading } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const handleStartExam = async () => {
    const boothToken = boothSessionManager.getToken();
    const boothMeta = boothSessionManager.getMeta();

    if (boothToken && boothMeta?.boothAccessMode === "WALK_IN") {
      setError("Ban dang o che do tan dung booth (walk-in), chi duoc phep luyen tap.");
      return;
    }

    if (!accessToken) {
      router.push("/login");
      return;
    }

    try {
      setStarting(true);
      setError("");
      const session = await examsApiClient.startPretestSession(accessToken);
      router.replace(`/quiz?sessionId=${session.id}`);
    } catch (err: any) {
      setError(err?.message || "Không thể khởi tạo phiên thi.");
    } finally {
      setStarting(false);
    }
  };

  if (userLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-navy-600" />
          <p className="mt-3">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-700">
          <p>Bạn cần đăng nhập để bắt đầu bài thi.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-lg bg-navy-600 px-4 py-2 font-semibold text-white hover:bg-navy-700"
          >
            Đến trang đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Khởi động trước bài thi</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Kiểm tra nhanh thiết bị và môi trường trước khi bắt đầu. Khi bấm "Vào bài thi", hệ thống sẽ
            tạo hoặc khôi phục phiên thi EXAM của bạn.
          </p>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3 sm:p-7">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <MonitorCheck className="h-5 w-5 text-navy-600" />
            <p className="mt-2 font-semibold">Thiết bị ổn định</p>
            <p className="mt-1 text-xs text-slate-500">Đảm bảo mạng và máy tính đủ pin/nguồn.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <Clock3 className="h-5 w-5 text-navy-600" />
            <p className="mt-2 font-semibold">Sẵn sàng thời gian</p>
            <p className="mt-1 text-xs text-slate-500">Bài thi sẽ tính giờ ngay sau khi vào phiên.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <ShieldCheck className="h-5 w-5 text-navy-600" />
            <p className="mt-2 font-semibold">Tuân thủ quy định</p>
            <p className="mt-1 text-xs text-slate-500">Không rời tab hoặc thoát bất thường trong lúc thi.</p>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Quay lại Dashboard
          </Link>
          <button
            type="button"
            onClick={handleStartExam}
            disabled={starting}
            className="inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
          >
            {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vào bài thi
          </button>
        </section>
      </div>
    </main>
  );
}
