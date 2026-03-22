"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { bookingsApi } from "@/lib/api/bookings";
import { useAuth } from "@/lib/hooks";
import type { Booking, BookingStatus, BookingType } from "@/lib/api/types";
import type { BookingRealtimeEvent, BoothStatusUpdatedEvent } from "@/lib/api/types";
import { Calendar, Wrench, ArrowLeft, Search, RefreshCw, RotateCcw } from "lucide-react";
import { realtimeClient } from "@/lib/realtime/socketClient";

export default function BoothSchedulePage() {
  const { user, userLoading } = useAuth();
  const [date, setDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<BookingType | "ALL">("ALL");
  const [boothFilter, setBoothFilter] = useState<string>("ALL");
  const [keyword, setKeyword] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canViewPage = user?.role === "ADMIN" || user?.role === "LECTURER";

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingsApi.getBookings({
        page: 1,
        limit: 50,
        date: date || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        sortOrder: "desc",
      });
      setBookings(Array.isArray(res?.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.message || "Không thể tải lịch trình booth.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewPage) {
      fetchBookings();
    }
  }, [canViewPage, date, statusFilter, typeFilter]);

  useEffect(() => {
    if (!canViewPage) {
      return;
    }

    const refresh = () => {
      void fetchBookings();
    };

    const offCheckin = realtimeClient.subscribe<BookingRealtimeEvent>("booking.checkin", refresh);
    const offCheckout = realtimeClient.subscribe<BookingRealtimeEvent>("booking.checkout", refresh);
    const offBoothStatus = realtimeClient.subscribe<BoothStatusUpdatedEvent>("booth.status.updated", refresh);

    return () => {
      offCheckin();
      offCheckout();
      offBoothStatus();
    };
  }, [canViewPage, date, statusFilter, typeFilter, boothFilter, keyword]);

  const filteredBookings = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (boothFilter !== "ALL" && booking.booth?.id !== boothFilter) {
        return false;
      }

      if (!q) return true;

      const studentName = booking.user?.name?.toLowerCase() || "";
      const studentEmail = booking.user?.email?.toLowerCase() || "";
      return studentName.includes(q) || studentEmail.includes(q);
    });
  }, [bookings, boothFilter, keyword]);

  const summary = useMemo(() => {
    const confirmed = filteredBookings.filter((b) => b.status === "CONFIRMED").length;
    const inUse = filteredBookings.filter((b) => b.status === "CHECKED_IN").length;
    const completed = filteredBookings.filter((b) => b.status === "COMPLETED").length;

    return {
      total: filteredBookings.length,
      confirmed,
      inUse,
      completed,
    };
  }, [filteredBookings]);

  const hasActiveFilters =
    Boolean(date) ||
    statusFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    boothFilter !== "ALL" ||
    Boolean(keyword.trim());

  const resetFilters = () => {
    setDate("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setBoothFilter("ALL");
    setKeyword("");
  };

  const boothOptions = useMemo(() => {
    const map = new Map<string, string>();
    bookings.forEach((b) => {
      if (b.booth?.id && b.booth?.name) {
        map.set(b.booth.id, b.booth.name);
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [bookings]);

  if (userLoading) {
    return (
      <div className="py-12">
        <div className="text-center text-gray-500">Đang kiểm tra quyền truy cập...</div>
      </div>
    );
  }

  if (!canViewPage) {
    return (
      <div className="py-12">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
          Bạn không có quyền truy cập lịch trình booth.
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-2" aria-label="Booth navigation">
        <Link
          href="/admin/booths"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Quản lý Booth
        </Link>
        <Link
          href="/admin/booths/schedule"
          className="inline-flex items-center rounded-full bg-navy-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          Lịch trình Booth
        </Link>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-700">Lịch trình Booth</h1>
          <p className="text-gray-600 mt-2">Theo dõi lịch đặt và trạng thái check-in tự động theo booth.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/booths"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quản lý Booth
          </Link>
          <button
            onClick={fetchBookings}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="flex items-center rounded-xl border border-gray-200 px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              className="ml-2 w-full border-0 bg-transparent text-sm text-gray-700 outline-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <select
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as BookingType | "ALL")}
          >
            <option value="ALL">Tất cả mục đích</option>
            <option value="PRACTICE">Luyện tập</option>
            <option value="EXAM">Kiểm tra</option>
          </select>

          <select
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "ALL")}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="CHECKED_IN">Đang sử dụng</option>
            <option value="COMPLETED">Đã xong</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="NO_SHOW">Vắng mặt</option>
          </select>

          <select
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            value={boothFilter}
            onChange={(e) => setBoothFilter(e.target.value)}
          >
            <option value="ALL">Tất cả booth</option>
            {boothOptions.map((booth) => (
              <option key={booth.id} value={booth.id}>
                {booth.name}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Lọc theo sinh viên"
              className="ml-2 w-full border-0 bg-transparent p-0 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-navy-50 px-3 py-1 text-navy-700">Tổng: {summary.total}</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Đã xác nhận: {summary.confirmed}</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">Đang sử dụng: {summary.inUse}</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Hoàn tất: {summary.completed}</span>
          </div>

          <button
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Đặt lại bộ lọc
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-navy-700 mb-6">
          {date ? `Lịch trình ngày ${format(new Date(date), "dd/MM/yyyy")}` : "Tất cả lịch trình"}
        </h2>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-20 text-gray-500 flex flex-col items-center">
            <Wrench className="w-12 h-12 text-gray-300 mb-4" />
            Không có lịch đặt nào {date ? "trong ngày này" : "được tìm thấy"}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm">Thời gian</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm">Booth</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm">Sinh viên</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm">Mục đích</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm">Trạng thái</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm text-right">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBookings.map((booking) => {
                  const start = new Date(booking.startTime);
                  const end = new Date(booking.endTime);

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50 transition">
                      <td className="py-4 px-4">
                        <div className="text-xs text-gray-500 mb-1">{format(start, "dd/MM/yyyy")}</div>
                        <div className="font-bold text-gray-900">{format(start, "HH:mm")} - {format(end, "HH:mm")}</div>
                      </td>
                      <td className="py-4 px-4 font-medium text-navy-700">{booking.booth?.name}</td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-gray-900">{booking.user?.name || "N/A"}</div>
                        <div className="text-xs text-gray-500">{booking.user?.email}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            booking.type === "EXAM" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {booking.type === "EXAM" ? "KIỂM TRA" : "LUYỆN TẬP"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            booking.status === "PENDING"
                              ? "bg-gray-100 text-gray-600"
                              : booking.status === "CONFIRMED"
                                ? "bg-amber-100 text-amber-700"
                                : booking.status === "CHECKED_IN"
                                  ? "bg-blue-100 text-blue-700"
                                  : booking.status === "COMPLETED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                          }`}
                        >
                          {booking.status === "CONFIRMED"
                            ? "Đã xác nhận"
                            : booking.status === "CHECKED_IN"
                              ? "Đang sử dụng"
                              : booking.status === "COMPLETED"
                                ? "Đã xong"
                                : booking.status === "CANCELLED"
                                  ? "Đã hủy"
                                  : booking.status === "NO_SHOW"
                                    ? "Vắng mặt"
                                    : "Chờ xác nhận"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-xs text-gray-500 font-medium">
                          Check-in tự động tại kiosk sau khi booth được active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
