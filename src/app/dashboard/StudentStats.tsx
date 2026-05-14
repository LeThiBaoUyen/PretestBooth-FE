"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { 
  Trophy, 
  Target, 
  CheckCircle, 
  CalendarDays, 
  Code 
} from "lucide-react";

import { useAuth } from "@/lib/hooks";
import { bookingsApi } from "@/lib/api/bookings";
import { boothPoliciesApi } from "@/lib/api/boothPolicies";
import { dashboardApi } from "@/lib/api/dashboard";
import type { Booking, StudentStats } from "@/lib/api/types";
import Link from "next/link";

export default function StudentStatsDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);
  const [bookingCancellationCutoffHours, setBookingCancellationCutoffHours] = useState(12);
  const [bookingActionError, setBookingActionError] = useState<string | null>(null);

  const loadStudentStats = async () => {
    const data = await dashboardApi.getStudentStats();
    setStats(data);
  };

  const getCancellationState = (booking: Booking) => {
    if (booking.status !== "CONFIRM") {
      return {
        canCancel: false,
        reason: "Chỉ có thể hủy lịch ở trạng thái đã xác nhận.",
      };
    }

    const startTime = new Date(booking.startTime);
    if (Number.isNaN(startTime.getTime())) {
      return {
        canCancel: false,
        reason: "Không xác định được thời gian bắt đầu để kiểm tra hạn hủy.",
      };
    }

    const deadline = new Date(
      startTime.getTime() - bookingCancellationCutoffHours * 60 * 60 * 1000,
    );
    const now = new Date();

    if (now > deadline) {
      return {
        canCancel: false,
        reason: `Đã quá hạn hủy. Bạn cần hủy trước ${bookingCancellationCutoffHours} giờ so với giờ bắt đầu.`,
      };
    }

    return {
      canCancel: true,
      reason: "",
    };
  };

  const handleCancelBooking = async (booking: Booking) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy lịch ${booking.booth?.name || "Booth"} lúc ${format(new Date(booking.startTime), "HH:mm dd/MM/yyyy", { locale: vi })}?`,
    );

    if (!confirmed) return;

    try {
      setCancelingBookingId(booking.id);
      setBookingActionError(null);
      await bookingsApi.cancelBooking(booking.id);
      await loadStudentStats();
    } catch (err: unknown) {
      setBookingActionError(err instanceof Error ? err.message : "Không thể hủy lịch booth");
    } finally {
      setCancelingBookingId(null);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "STUDENT") return;

    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [studentStats, boothPolicy] = await Promise.all([
          dashboardApi.getStudentStats(),
          boothPoliciesApi.getBoothPolicyConfig().catch(() => null),
        ]);

        if (!isMounted) return;

        setStats(studentStats);
        setBookingCancellationCutoffHours(
          boothPolicy?.config?.bookingCancellationCutoffHours ?? 12,
        );
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setStats(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user || user.role !== "STUDENT") return null;
  if (loading) return <div className="text-center py-8 text-gray-500">Đang tải thống kê...</div>;
  if (!stats) return null;

  return (
    <div className="pt-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-navy-600">Xin chào, {user.name || "Sinh viên"}! 👋</h1>
            <p className="text-gray-600 mt-2">Theo dõi tiến trình luyện tập và điểm tích lũy của bạn tại đây.</p>
          </div>
          {stats?.hasPassedPretest && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl shadow-sm">
              <CheckCircle className="w-5 h-5" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">Đã đạt Pretest</span>
                <span className="text-xs opacity-90 text-emerald-600">Bạn đã đủ điều kiện thi chính thức</span>
              </div>
            </div>
          )}
        </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Points Card */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl p-6 shadow-sm border border-yellow-200 flex flex-col items-center justify-center text-center">
          <div className="bg-yellow-100 p-3 rounded-full mb-3">
            <Trophy className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-sm font-semibold text-yellow-800 uppercase tracking-wider mb-1">Điểm tích lũy</p>
          <p className="text-4xl font-extrabold text-yellow-600">{stats.points}</p>
        </div>

        {/* Exams Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-emerald-100 p-4 rounded-full">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Bài kiểm tra đã thi</p>
            <p className="text-2xl font-bold text-gray-900">{stats.completedExams}</p>
          </div>
        </div>

        {/* Practices Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-blue-100 p-4 rounded-full">
            <Target className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Phiên luyện tập</p>
            <p className="text-2xl font-bold text-gray-900">{stats.completedPractices}</p>
          </div>
        </div>

        {/* Accuracy Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-purple-100 p-4 rounded-full">
            <Code className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Độ chính xác lập trình</p>
            <p className="text-2xl font-bold text-gray-900">{stats.submissionAccuracy}%</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalSubmissions} lượt nộp</p>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-navy-700 flex items-center">
            <CalendarDays className="w-5 h-5 mr-2 text-navy-600" />
            Lịch sử dụng Booth sắp tới
          </h2>
          <Link
            href="/booths/booking"
            className="rounded-lg bg-navy-50 px-4 py-2 text-sm font-medium text-navy-700 transition hover:bg-navy-100 hover:text-navy-800"
          >
            Đặt lịch
          </Link>
        </div>

        {stats.upcomingBookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            Bạn chưa có lịch đặt booth nào sắp tới.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {bookingActionError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {bookingActionError}
              </div>
            )}
            {stats.upcomingBookings.map((booking) => {
              const dateObj = new Date(booking.date);
              const startTimeObj = new Date(booking.startTime);
              const endTimeObj = new Date(booking.endTime);
              const cancellationState = getCancellationState(booking);
              const statusLabel =
                booking.status === "CONFIRM"
                  ? "Đã xác nhận"
                  : booking.status === "CHECKED_IN"
                    ? "Đã check-in"
                    : booking.status === "COMPLETED"
                      ? "Hoàn tất"
                      : booking.status === "CANCEL"
                        ? "Đã hủy"
                        : booking.status === "ABSENT"
                          ? "Vắng mặt"
                    : booking.status;
              
              return (
                <div key={booking.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-navy-50 rounded-xl p-3 text-center min-w-[70px]">
                      <p className="text-xs font-semibold text-navy-600 uppercase">{format(dateObj, "MMM", { locale: vi })}</p>
                      <p className="text-xl font-bold text-navy-700">{format(dateObj, "dd")}</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{booking.booth?.name || "Booth"}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(startTimeObj, "HH:mm")} - {format(endTimeObj, "HH:mm")}
                        <span className="mx-2">•</span>
                        {booking.type === "EXAM" ? (
                          <span className="text-red-600 font-medium">Thi / Kiểm tra</span>
                        ) : (
                          <span className="text-blue-600 font-medium">Luyện tập</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      booking.status === "CONFIRM"
                        ? "bg-emerald-100 text-emerald-700"
                        : booking.status === "CHECKED_IN"
                          ? "bg-blue-100 text-blue-700"
                          : booking.status === "COMPLETED"
                            ? "bg-slate-100 text-slate-700"
                            : booking.status === "CANCEL"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                    }`}>
                      {statusLabel}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCancelBooking(booking)}
                      disabled={cancelingBookingId === booking.id || !cancellationState.canCancel}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelingBookingId === booking.id ? "Đang hủy..." : "Hủy lịch"}
                    </button>

                    {!cancellationState.canCancel && (
                      <p className="max-w-xs text-left text-xs text-amber-700 sm:text-right">
                        {cancellationState.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
