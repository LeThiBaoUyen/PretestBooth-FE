"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { bookingsApi } from "@/lib/api/bookings";
import { useAuth } from "@/lib/hooks";
import type { Booking, BookingStatus, BookingType } from "@/lib/api/types";
import { Calendar, Wrench, ArrowLeft, Search, RefreshCw, RotateCcw } from "lucide-react";

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
      setError(e?.message || "Khong the tai lich trinh booth.");
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
        <div className="text-center text-gray-500">Dang kiem tra quyen truy cap...</div>
      </div>
    );
  }

  if (!canViewPage) {
    return (
      <div className="py-12">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
          Ban khong co quyen truy cap lich trinh booth.
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
          Quan ly Booth
        </Link>
        <Link
          href="/admin/booths/schedule"
          className="inline-flex items-center rounded-full bg-navy-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          Lich trinh Booth
        </Link>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-700">Lich trinh Booth</h1>
          <p className="text-gray-600 mt-2">Theo doi lich dat va trang thai check-in tu dong theo booth.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/booths"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quan ly Booth
          </Link>
          <button
            onClick={fetchBookings}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Lam moi
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
            <option value="ALL">Tat ca muc dich</option>
            <option value="PRACTICE">Luyen tap</option>
            <option value="EXAM">Kiem tra</option>
          </select>

          <select
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "ALL")}
          >
            <option value="ALL">Tat ca trang thai</option>
            <option value="PENDING">Cho xac nhan</option>
            <option value="CONFIRMED">Da xac nhan</option>
            <option value="CHECKED_IN">Dang su dung</option>
            <option value="COMPLETED">Da xong</option>
            <option value="CANCELLED">Da huy</option>
            <option value="NO_SHOW">Vang mat</option>
          </select>

          <select
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            value={boothFilter}
            onChange={(e) => setBoothFilter(e.target.value)}
          >
            <option value="ALL">Tat ca booth</option>
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
              placeholder="Loc theo sinh vien"
              className="ml-2 w-full border-0 bg-transparent p-0 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-navy-50 px-3 py-1 text-navy-700">Tong: {summary.total}</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Da xac nhan: {summary.confirmed}</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">Dang su dung: {summary.inUse}</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Hoan tat: {summary.completed}</span>
          </div>

          <button
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Dat lai bo loc
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-navy-700 mb-6">
          {date ? `Lich trinh ngay ${format(new Date(date), "dd/MM/yyyy")}` : "Tat ca lich trinh"}
        </h2>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Dang tai du lieu...</div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-20 text-gray-500 flex flex-col items-center">
            <Wrench className="w-12 h-12 text-gray-300 mb-4" />
            Khong co lich dat nao {date ? "trong ngay nay" : "duoc tim thay"}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm">Thoi gian</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm">Booth</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm">Sinh vien</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm">Muc dich</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm">Trang thai</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm text-right">Ghi chu</th>
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
                          {booking.type === "EXAM" ? "KIEM TRA" : "LUYEN TAP"}
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
                            ? "Da xac nhan"
                            : booking.status === "CHECKED_IN"
                              ? "Dang su dung"
                              : booking.status === "COMPLETED"
                                ? "Da xong"
                                : booking.status === "CANCELLED"
                                  ? "Da huy"
                                  : booking.status === "NO_SHOW"
                                    ? "Vang mat"
                                    : "Cho xac nhan"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-xs text-gray-500 font-medium">
                          Check-in tu dong tai kiosk sau khi booth duoc active
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
