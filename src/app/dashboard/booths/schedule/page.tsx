"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { bookingsApi } from "@/lib/api/bookings";
import { useAuth } from "@/lib/hooks";
import type { Booking } from "@/lib/api/types";
import { Calendar, CheckCircle2, LogOut, Wrench, ArrowLeft } from "lucide-react";

export default function BoothSchedulePage() {
  const { user, userLoading } = useAuth();
  const [date, setDate] = useState("");
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
  }, [canViewPage, date]);

  const handleCheckIn = async (id: string) => {
    try {
      await bookingsApi.checkIn(id);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || "Không thể check-in");
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      await bookingsApi.checkOut(id);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || "Không thể check-out");
    }
  };

  if (userLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Đang kiểm tra quyền truy cập...</div>
      </div>
    );
  }

  if (!canViewPage) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
          Bạn không có quyền truy cập lịch trình booth.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <p className="text-gray-600 mt-2">Theo dõi và thao tác check-in/check-out theo ca đặt.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/booths"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quản lý Booth
          </Link>
          <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <Calendar className="w-5 h-5 text-gray-400 ml-2" />
            <input
              type="date"
              className="border-0 focus:ring-0 text-gray-700 font-medium bg-transparent"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {date && (
              <button
                onClick={() => setDate("")}
                className="text-xs text-gray-400 hover:text-navy-600 pr-3 font-medium border-l border-gray-200 pl-3"
              >
                Hiện tất cả
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-navy-700 mb-6 flex items-center justify-between">
          <span>{date ? `Lịch trình ngày ${format(new Date(date), "dd/MM/yyyy")}` : "Tất cả lịch trình"}</span>
          <span className="bg-navy-50 text-navy-600 px-3 py-1 rounded-full text-sm font-semibold">
            {bookings.length} ca
          </span>
        </h2>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : bookings.length === 0 ? (
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
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-sm text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((booking) => {
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
                        <div className="flex items-center justify-end space-x-2">
                          {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
                            <button
                              onClick={() => handleCheckIn(booking.id)}
                              className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Check-in
                            </button>
                          )}

                          {booking.status === "CHECKED_IN" && (
                            <button
                              onClick={() => handleCheckOut(booking.id)}
                              className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                            >
                              <LogOut className="w-4 h-4 mr-1" />
                              Check-out
                            </button>
                          )}

                          {(booking.status === "COMPLETED" || booking.status === "CANCELLED" || booking.status === "NO_SHOW") && (
                            <span className="text-xs text-gray-400 font-medium">--</span>
                          )}
                        </div>
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
