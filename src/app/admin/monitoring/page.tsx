"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Clock3,
  LogOut,
  RefreshCw,
  ShieldAlert,
  TimerReset,
  UserX,
} from "lucide-react";
import { bookingsApi } from "@/lib/api/bookings";
import { boothsApi } from "@/lib/api/booths";
import { examsApiClient } from "@/lib/api/exams";
import { practiceApi } from "@/lib/api/practice";
import { useAuth } from "@/lib/hooks";
import { hasPermission } from "@/lib/auth/permissions";
import type {
  ActiveMonitoringSessionItem,
  BookingRealtimeEvent,
  Booth,
  BoothStatusUpdatedEvent,
  MonitoringActivityType,
  MonitoringUpdatedEvent,
  SessionTerminatedEvent,
  SessionTimerAdjustedEvent,
} from "@/lib/api/types";
import { realtimeClient } from "@/lib/realtime/socketClient";

const PAGE_SIZE = 20;

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRemaining(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function askReason(title: string) {
  const reason = window.prompt(`${title}\n\nNhập lý do:`)?.trim();
  return reason || null;
}

function askExtendPayload() {
  const minuteInput = window.prompt("Nhập số phút gia hạn (gợi ý 5, 10, 15 hoặc số tùy ý):", "5")?.trim();
  if (!minuteInput) return null;

  const minutes = Number(minuteInput);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    window.alert("Số phút gia hạn không hợp lệ.");
    return null;
  }

  const reason = askReason("Gia hạn thời gian");
  if (!reason) return null;

  return { minutes, reason };
}

function getCurrentRemainingSeconds(row: ActiveMonitoringSessionItem, nowMs: number) {
  if (row.activeExam?.expiresAt) {
    return Math.max(0, Math.floor((new Date(row.activeExam.expiresAt).getTime() - nowMs) / 1000));
  }

  if (row.activePractice?.expiresAt) {
    return Math.max(0, Math.floor((new Date(row.activePractice.expiresAt).getTime() - nowMs) / 1000));
  }

  return Math.max(0, Math.floor((new Date(row.bookingEndTime).getTime() - nowMs) / 1000));
}

export default function AdminMonitoringPage() {
  const { user, userLoading } = useAuth();
  const canViewPage = hasPermission(user, "MONITOR_SESSIONS");

  const [rows, setRows] = useState<ActiveMonitoringSessionItem[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<MonitoringActivityType | "ALL">("ALL");
  const [boothFilter, setBoothFilter] = useState<string>("ALL");
  const [nowMs, setNowMs] = useState(Date.now());

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadBooths = useCallback(async () => {
    try {
      const data = await boothsApi.getBooths();
      setBooths(data);
    } catch {
      setBooths([]);
    }
  }, []);

  const loadMonitoring = useCallback(async () => {
    if (!canViewPage) return;

    try {
      setLoading(true);
      setError(null);

      const response = await bookingsApi.getActiveMonitoringSessions({
        page,
        limit: PAGE_SIZE,
        boothId: boothFilter === "ALL" ? undefined : boothFilter,
        activityType: activityFilter === "ALL" ? undefined : activityFilter,
        search: search.trim() || undefined,
        sortOrder: "asc",
      });

      setRows(response.data || []);
      setTotal(response.total || 0);
      setLastSyncedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || "Không thể tải dữ liệu giám sát realtime.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activityFilter, boothFilter, canViewPage, page, search]);

  useEffect(() => {
    if (!canViewPage) return;
    void loadBooths();
  }, [canViewPage, loadBooths]);

  useEffect(() => {
    if (!canViewPage) return;
    void loadMonitoring();
  }, [canViewPage, loadMonitoring]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!canViewPage) return;

    const refresh = () => {
      void loadMonitoring();
    };

    const offCheckin = realtimeClient.subscribe<BookingRealtimeEvent>("booking.checkin", refresh);
    const offCheckout = realtimeClient.subscribe<BookingRealtimeEvent>("booking.checkout", refresh);
    const offBooth = realtimeClient.subscribe<BoothStatusUpdatedEvent>("booth.status.updated", refresh);
    const offMonitoring = realtimeClient.subscribe<MonitoringUpdatedEvent>("monitoring.updated", refresh);
    const offTimer = realtimeClient.subscribe<SessionTimerAdjustedEvent>("session.timer.adjusted", refresh);
    const offTerminated = realtimeClient.subscribe<SessionTerminatedEvent>("session.terminated", refresh);

    return () => {
      offCheckin();
      offCheckout();
      offBooth();
      offMonitoring();
      offTimer();
      offTerminated();
    };
  }, [canViewPage, loadMonitoring]);

  const summary = useMemo(() => {
    const inExam = rows.filter((row) => row.currentActivityType === "EXAM").length;
    const inPractice = rows.filter((row) => row.currentActivityType === "PRACTICE").length;
    const idle = rows.filter((row) => row.currentActivityType === "IDLE").length;
    const warning = rows.filter((row) => getCurrentRemainingSeconds(row, nowMs) <= 10 * 60).length;

    return {
      total: rows.length,
      inExam,
      inPractice,
      idle,
      warning,
    };
  }, [nowMs, rows]);

  const withAction = useCallback(
    async (key: string, action: () => Promise<void>) => {
      try {
        setActionLoadingKey(key);
        setError(null);
        await action();
        await loadMonitoring();
      } catch (err: any) {
        setError(err?.message || "Thao tác thất bại.");
      } finally {
        setActionLoadingKey(null);
      }
    },
    [loadMonitoring],
  );

  const handleForceCheckout = useCallback(
    async (row: ActiveMonitoringSessionItem) => {
      const reason = askReason(`Buộc checkout sinh viên ${row.studentName || row.studentEmail}`);
      if (!reason) return;

      await withAction(`force-checkout-${row.bookingId}`, async () => {
        await bookingsApi.forceCheckoutByMonitor(row.bookingId, { reason });
      });
    },
    [withAction],
  );

  const handleForceLogoutBooth = useCallback(
    async (row: ActiveMonitoringSessionItem) => {
      const reason = askReason(`Buộc đăng xuất kiosk tại booth ${row.boothName}`);
      if (!reason) return;

      await withAction(`force-logout-${row.boothId}`, async () => {
        await boothsApi.forceLogoutBooth(row.boothId, { reason });
      });
    },
    [withAction],
  );

  const handleNotify = useCallback(
    async (row: ActiveMonitoringSessionItem) => {
      const message = window.prompt("Nhập nội dung cảnh báo realtime:")?.trim();
      if (!message) return;

      await withAction(`notify-${row.bookingId}`, async () => {
        await bookingsApi.notifyByMonitor(row.bookingId, {
          message,
          level: "warning",
        });
      });
    },
    [withAction],
  );

  const handleForceSubmitExam = useCallback(
    async (row: ActiveMonitoringSessionItem) => {
      if (!row.activeExam) return;
      const reason = askReason(`Buộc nộp phiên thi ${row.activeExam.examTitle}`);
      if (!reason) return;

      await withAction(`force-submit-${row.activeExam.sessionId}`, async () => {
        await examsApiClient.forceSubmitSessionByMonitor(row.activeExam!.sessionId, { reason });
      });
    },
    [withAction],
  );

  const handleAbortExam = useCallback(
    async (row: ActiveMonitoringSessionItem) => {
      if (!row.activeExam) return;
      const reason = askReason(`Hủy phiên thi ${row.activeExam.examTitle}`);
      if (!reason) return;

      await withAction(`abort-exam-${row.activeExam.sessionId}`, async () => {
        await examsApiClient.abortSessionByMonitor(row.activeExam!.sessionId, { reason });
      });
    },
    [withAction],
  );

  const handleExtendExam = useCallback(
    async (row: ActiveMonitoringSessionItem) => {
      if (!row.activeExam) return;
      const payload = askExtendPayload();
      if (!payload) return;

      await withAction(`extend-exam-${row.activeExam.sessionId}`, async () => {
        await examsApiClient.extendSessionByMonitor(row.activeExam!.sessionId, payload);
      });
    },
    [withAction],
  );

  const handleAbortPractice = useCallback(
    async (row: ActiveMonitoringSessionItem) => {
      if (!row.activePractice) return;
      const reason = askReason("Hủy phiên luyện tập");
      if (!reason) return;

      await withAction(`abort-practice-${row.activePractice.sessionId}`, async () => {
        await practiceApi.abortSessionByMonitor(row.activePractice!.sessionId, { reason });
      });
    },
    [withAction],
  );

  const handleExtendPractice = useCallback(
    async (row: ActiveMonitoringSessionItem) => {
      if (!row.activePractice) return;
      const payload = askExtendPayload();
      if (!payload) return;

      await withAction(`extend-practice-${row.activePractice.sessionId}`, async () => {
        await practiceApi.extendSessionByMonitor(row.activePractice!.sessionId, payload);
      });
    },
    [withAction],
  );

  useEffect(() => {
    setPage(1);
  }, [activityFilter, boothFilter, search]);

  if (userLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          Đang kiểm tra quyền truy cập...
        </div>
      </main>
    );
  }

  if (!canViewPage) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-6 text-center text-slate-600">
          Bạn chưa được cấp quyền giám sát phiên thi/booth.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy-700">Giám sát realtime phiên thi/booth</h1>
              <p className="mt-1 text-sm text-slate-600">
                Theo dõi sinh viên đang CHECKED_IN, phiên đang chạy và can thiệp khi cần.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1">
                <Link
                  href="/admin/booths"
                  className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Quản lý Booth
                </Link>
                <Link
                  href="/admin/booths/schedule"
                  className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Lịch trình Booth
                </Link>
                <Link
                  href="/admin/monitoring"
                  className="rounded-full bg-navy-600 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Giám sát realtime
                </Link>
              </div>

              <button
                type="button"
                onClick={() => void loadMonitoring()}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Làm mới
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đang online</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đang thi</p>
            <p className="mt-1 text-2xl font-bold text-navy-700">{summary.inExam}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đang luyện tập</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{summary.inPractice}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chưa bắt đầu bài</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{summary.idle}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Cảnh báo &lt;= 10 phút</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{summary.warning}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, email, MSSV, booth"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <select
              value={activityFilter}
              onChange={(event) =>
                setActivityFilter(event.target.value as MonitoringActivityType | "ALL")
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ALL">Tất cả hoạt động</option>
              <option value="EXAM">Đang thi</option>
              <option value="PRACTICE">Đang luyện tập</option>
              <option value="IDLE">Chưa làm bài</option>
            </select>

            <select
              value={boothFilter}
              onChange={(event) => setBoothFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ALL">Tất cả booth</option>
              {booths.map((booth) => (
                <option key={booth.id} value={booth.id}>
                  {booth.name}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Đồng bộ lần cuối: {formatDateTime(lastSyncedAt)}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 font-semibold text-slate-700">Sinh viên</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">Booth</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">Hoạt động</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">Thời gian còn lại</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">Check-in</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">Điều phối</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                      Đang tải dữ liệu realtime...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                      Không có phiên nào đang hoạt động.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const remainingSeconds = getCurrentRemainingSeconds(row, nowMs);
                    const rowActionBusy = (prefix: string) =>
                      actionLoadingKey === `${prefix}-${row.bookingId}` ||
                      actionLoadingKey === `${prefix}-${row.boothId}` ||
                      actionLoadingKey === `${prefix}-${row.activeExam?.sessionId || ""}` ||
                      actionLoadingKey === `${prefix}-${row.activePractice?.sessionId || ""}`;

                    return (
                      <tr key={row.bookingId} className="align-top">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{row.studentName || row.studentEmail}</p>
                          <p className="text-xs text-slate-500">{row.studentEmail}</p>
                          <p className="text-xs text-slate-500">MSSV: {row.studentCode || "-"}</p>
                        </td>

                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{row.boothName}</p>
                          <p className="text-xs text-slate-500">{row.boothCode || "-"}</p>
                        </td>

                        <td className="px-3 py-3">
                          {row.currentActivityType === "EXAM" && row.activeExam ? (
                            <>
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                                EXAM
                              </span>
                              <p className="mt-1 text-sm font-semibold text-slate-800">{row.activeExam.examTitle}</p>
                            </>
                          ) : row.currentActivityType === "PRACTICE" && row.activePractice ? (
                            <>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                PRACTICE
                              </span>
                              <p className="mt-1 text-sm font-semibold text-slate-800">Luyện tập tự do</p>
                            </>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                              IDLE
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <div
                            className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm font-bold ${
                              remainingSeconds <= 10 * 60
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <Clock3 className="mr-1.5 h-4 w-4" />
                            {formatRemaining(remainingSeconds)}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Kết thúc booking: {formatDateTime(row.bookingEndTime)}
                          </p>
                        </td>

                        <td className="px-3 py-3 text-xs text-slate-600">
                          {formatDateTime(row.checkedInAt)}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleNotify(row)}
                              disabled={actionLoadingKey === `notify-${row.bookingId}`}
                              className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              <Bell className="mr-1 h-3.5 w-3.5" /> Cảnh báo
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleForceCheckout(row)}
                              disabled={actionLoadingKey === `force-checkout-${row.bookingId}`}
                              className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                            >
                              <UserX className="mr-1 h-3.5 w-3.5" /> Force checkout
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleForceLogoutBooth(row)}
                              disabled={actionLoadingKey === `force-logout-${row.boothId}`}
                              className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              <LogOut className="mr-1 h-3.5 w-3.5" /> Logout kiosk
                            </button>

                            {row.currentActivityType === "EXAM" && row.activeExam && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleExtendExam(row)}
                                  disabled={rowActionBusy("extend-exam")}
                                  className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                >
                                  <TimerReset className="mr-1 h-3.5 w-3.5" /> Gia hạn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleForceSubmitExam(row)}
                                  disabled={rowActionBusy("force-submit")}
                                  className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                >
                                  <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Force submit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleAbortExam(row)}
                                  disabled={rowActionBusy("abort-exam")}
                                  className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                >
                                  <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Abort
                                </button>
                              </>
                            )}

                            {row.currentActivityType === "PRACTICE" && row.activePractice && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleExtendPractice(row)}
                                  disabled={rowActionBusy("extend-practice")}
                                  className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                >
                                  <TimerReset className="mr-1 h-3.5 w-3.5" /> Gia hạn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleAbortPractice(row)}
                                  disabled={rowActionBusy("abort-practice")}
                                  className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                >
                                  <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Abort
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <p className="text-slate-600">
              Tổng: <span className="font-semibold text-slate-900">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-slate-700">
                Trang {page}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
