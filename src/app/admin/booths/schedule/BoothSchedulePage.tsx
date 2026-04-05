"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { bookingsApi } from "@/lib/api/bookings";
import { boothsApi } from "@/lib/api/booths";
import { useAuth } from "@/lib/hooks";
import { hasPermission } from "@/lib/auth/permissions";
import type { Booking, BookingStatus, BookingType, Booth } from "@/lib/api/types";
import type { BookingRealtimeEvent, BoothStatusUpdatedEvent } from "@/lib/api/types";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock3,
  LayoutGrid,
  List,
  RefreshCw,
  RotateCcw,
  Search,
  UserRound,
  Wrench,
} from "lucide-react";
import { realtimeClient } from "@/lib/realtime/socketClient";

const BOOKING_PAGE_LIMIT = 50;
const DEFAULT_TIMELINE_START_HOUR = 6;
const DEFAULT_TIMELINE_END_HOUR = 22;
const CALENDAR_WEEK_STARTS_ON_MONDAY = 1;
const MONTH_WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type ViewMode = "TIMELINE" | "LIST";
type MonthlyDaySummary = {
  bookedBooths: number;
  bookedSlots: number;
  totalBooths: number;
  hasError?: boolean;
};

function getBookingTypeLabel(type: BookingType) {
  return type === "EXAM" ? "KIỂM TRA" : "LUYỆN TẬP";
}

function getBookingStatusLabel(status: BookingStatus) {
  if (status === "CONFIRMED") return "Đã xác nhận";
  if (status === "CHECKED_IN") return "Đang sử dụng";
  if (status === "COMPLETED") return "Đã xong";
  if (status === "CANCELLED") return "Đã hủy";
  if (status === "NO_SHOW") return "Vắng mặt";
  return "Chờ xác nhận";
}

function getBookingStatusChipClass(status: BookingStatus) {
  if (status === "PENDING") return "bg-slate-100 text-slate-700";
  if (status === "CONFIRMED") return "bg-amber-100 text-amber-700";
  if (status === "CHECKED_IN") return "bg-blue-100 text-blue-700";
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  return "bg-rose-100 text-rose-700";
}

function getTimelineBookingClass(booking: Booking) {
  if (booking.status === "CHECKED_IN") {
    return "border-blue-300 bg-blue-500 text-white";
  }

  if (booking.status === "CONFIRMED") {
    return booking.type === "EXAM"
      ? "border-rose-300 bg-rose-500 text-white"
      : "border-cyan-300 bg-cyan-500 text-white";
  }

  if (booking.status === "COMPLETED") {
    return "border-emerald-300 bg-emerald-500 text-white";
  }

  if (booking.status === "PENDING") {
    return "border-slate-300 bg-slate-500 text-white";
  }

  return "border-slate-300 bg-slate-300 text-slate-700";
}

function toLocalMinutes(isoDateTime: string) {
  const dt = new Date(isoDateTime);
  if (Number.isNaN(dt.getTime())) return 0;
  return dt.getHours() * 60 + dt.getMinutes();
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";

  return format(dt, "dd/MM/yyyy HH:mm");
}

function getBookingDurationMinutes(booking: Pick<Booking, "startTime" | "endTime">) {
  const start = new Date(booking.startTime).getTime();
  const end = new Date(booking.endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(1, Math.round((end - start) / 60000));
}

export default function BoothSchedulePage() {
  const { user, userLoading } = useAuth();
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<BookingType | "ALL">("ALL");
  const [boothFilter, setBoothFilter] = useState<string>("ALL");
  const [keyword, setKeyword] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("TIMELINE");
  const [booths, setBooths] = useState<Booth[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [monthlySummaries, setMonthlySummaries] = useState<Record<string, MonthlyDaySummary>>({});
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [selectedTimelineBooking, setSelectedTimelineBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scheduleSectionRef = useRef<HTMLDivElement | null>(null);
  const monthlyRequestRef = useRef(0);

  const canViewPage = hasPermission(user, "MANAGE_BOOTHS");

  const navigateToScheduleDate = (dateStr: string) => {
    setDate(dateStr);
    setViewMode("TIMELINE");
    window.setTimeout(() => {
      scheduleSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const fetchBooths = async () => {
    try {
      const data = await boothsApi.getBooths();
      setBooths(Array.isArray(data) ? data : []);
    } catch {
      setBooths([]);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      let page = 1;
      let totalPages = 1;
      const all: Booking[] = [];

      while (page <= totalPages) {
        const res = await bookingsApi.getBookings({
          page,
          limit: BOOKING_PAGE_LIMIT,
          date: date || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          type: typeFilter === "ALL" ? undefined : typeFilter,
          sortOrder: "desc",
        });

        const pageData = Array.isArray(res?.data) ? res.data : [];
        all.push(...pageData);

        const apiTotalPages = Number(res?.totalPages || 0);
        if (apiTotalPages > 0) {
          totalPages = apiTotalPages;
        } else {
          const total = Number(res?.total || pageData.length);
          totalPages = Math.max(1, Math.ceil(total / BOOKING_PAGE_LIMIT));
        }

        page += 1;
      }

      setBookings(all);
    } catch (e: any) {
      setError(e?.message || "Không thể tải lịch trình booth.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummaries = async (targetMonth: Date) => {
    const requestId = ++monthlyRequestRef.current;
    setMonthlyLoading(true);

    try {
      const monthStart = startOfMonth(targetMonth);
      const monthEnd = endOfMonth(targetMonth);

      const days: string[] = [];
      let cursor = monthStart;
      while (cursor <= monthEnd) {
        days.push(format(cursor, "yyyy-MM-dd"));
        cursor = addDays(cursor, 1);
      }

      const summaryEntries = await Promise.all(
        days.map(async (day) => {
          try {
            const availability = await bookingsApi.getAvailability(day);
            const uniqueBookedBoothIds = new Set<string>();
            let bookedSlots = 0;

            (availability.slots || []).forEach((slot) => {
              bookedSlots += slot.bookedBooths || 0;
              (slot.bookedBoothIds || []).forEach((boothId) => {
                uniqueBookedBoothIds.add(boothId);
              });
            });

            return [
              day,
              {
                bookedBooths: uniqueBookedBoothIds.size,
                bookedSlots,
                totalBooths: Array.isArray(availability.booths)
                  ? availability.booths.length
                  : 0,
              } as MonthlyDaySummary,
            ] as const;
          } catch {
            return [
              day,
              {
                bookedBooths: 0,
                bookedSlots: 0,
                totalBooths: 0,
                hasError: true,
              } as MonthlyDaySummary,
            ] as const;
          }
        }),
      );

      if (requestId !== monthlyRequestRef.current) {
        return;
      }

      setMonthlySummaries(Object.fromEntries(summaryEntries));
    } finally {
      if (requestId === monthlyRequestRef.current) {
        setMonthlyLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!canViewPage) return;
    void fetchBooths();
  }, [canViewPage]);

  useEffect(() => {
    if (!canViewPage) return;
    void fetchBookings();
  }, [canViewPage, date, statusFilter, typeFilter]);

  useEffect(() => {
    if (!canViewPage) return;
    void fetchMonthlySummaries(monthCursor);
  }, [canViewPage, monthCursor]);

  useEffect(() => {
    if (!date) return;

    const selectedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(selectedDate.getTime())) return;

    const selectedMonth = startOfMonth(selectedDate);
    if (selectedMonth.getTime() !== monthCursor.getTime()) {
      setMonthCursor(selectedMonth);
    }
  }, [date, monthCursor]);

  useEffect(() => {
    setSelectedTimelineBooking(null);
  }, [date, statusFilter, typeFilter, boothFilter, keyword, viewMode]);

  useEffect(() => {
    if (!canViewPage) {
      return;
    }

    const refresh = () => {
      void fetchBookings();
      void fetchBooths();
      void fetchMonthlySummaries(monthCursor);
    };

    const offCheckin = realtimeClient.subscribe<BookingRealtimeEvent>("booking.checkin", refresh);
    const offCheckout = realtimeClient.subscribe<BookingRealtimeEvent>("booking.checkout", refresh);
    const offBoothStatus = realtimeClient.subscribe<BoothStatusUpdatedEvent>("booth.status.updated", refresh);

    return () => {
      offCheckin();
      offCheckout();
      offBoothStatus();
    };
  }, [canViewPage, date, statusFilter, typeFilter, monthCursor]);

  const filteredBookings = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return bookings.filter((booking) => {
      if (boothFilter !== "ALL" && booking.booth?.id !== boothFilter) {
        return false;
      }

      if (!q) return true;

      const studentName = booking.user?.name?.toLowerCase() || "";
      const studentEmail = booking.user?.email?.toLowerCase() || "";
      const boothName = booking.booth?.name?.toLowerCase() || "";

      return studentName.includes(q) || studentEmail.includes(q) || boothName.includes(q);
    });
  }, [bookings, boothFilter, keyword]);

  const summary = useMemo(() => {
    const pending = filteredBookings.filter((b) => b.status === "PENDING").length;
    const confirmed = filteredBookings.filter((b) => b.status === "CONFIRMED").length;
    const inUse = filteredBookings.filter((b) => b.status === "CHECKED_IN").length;
    const completed = filteredBookings.filter((b) => b.status === "COMPLETED").length;

    return {
      total: filteredBookings.length,
      pending,
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
    const map = new Map<string, { id: string; name: string; code: string | null; status: string }>();

    booths.forEach((booth) => {
      map.set(booth.id, {
        id: booth.id,
        name: booth.name,
        code: booth.code,
        status: booth.status,
      });
    });

    bookings.forEach((booking) => {
      if (booking.booth?.id && booking.booth?.name && !map.has(booking.booth.id)) {
        map.set(booking.booth.id, {
          id: booking.booth.id,
          name: booking.booth.name,
          code: booking.booth.code || null,
          status: booking.booth.status,
        });
      }
    });

    return Array.from(map.entries())
      .map(([, booth]) => booth)
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [booths, bookings]);

  const timelineBookings = useMemo(() => {
    if (!date) return [];
    return filteredBookings;
  }, [date, filteredBookings]);

  const timelineRange = useMemo(() => {
    if (timelineBookings.length === 0) {
      return {
        startHour: DEFAULT_TIMELINE_START_HOUR,
        endHour: DEFAULT_TIMELINE_END_HOUR,
      };
    }

    const minStart = Math.min(...timelineBookings.map((booking) => toLocalMinutes(booking.startTime)));
    const maxEnd = Math.max(...timelineBookings.map((booking) => toLocalMinutes(booking.endTime)));

    const startHour = Math.max(
      0,
      Math.min(DEFAULT_TIMELINE_START_HOUR, Math.floor(minStart / 60) - 1),
    );
    let endHour = Math.min(
      24,
      Math.max(DEFAULT_TIMELINE_END_HOUR, Math.ceil(maxEnd / 60) + 1),
    );

    if (endHour - startHour < 8) {
      endHour = Math.min(24, startHour + 8);
    }

    return { startHour, endHour };
  }, [timelineBookings]);

  const timelineStartMinutes = timelineRange.startHour * 60;
  const timelineEndMinutes = timelineRange.endHour * 60;
  const timelineTotalMinutes = Math.max(60, timelineEndMinutes - timelineStartMinutes);

  const hourMarks = useMemo(
    () =>
      Array.from(
        { length: timelineRange.endHour - timelineRange.startHour + 1 },
        (_, idx) => timelineRange.startHour + idx,
      ),
    [timelineRange.endHour, timelineRange.startHour],
  );

  const timelineRows = useMemo(() => {
    return boothOptions
      .filter((booth) => boothFilter === "ALL" || booth.id === boothFilter)
      .map((booth) => {
        const boothBookings = timelineBookings
          .filter((booking) => booking.booth?.id === booth.id)
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          )
          .map((booking) => {
            const rawStartMinutes = toLocalMinutes(booking.startTime);
            const rawEndMinutes = toLocalMinutes(booking.endTime);

            const clampedStartMinutes = Math.max(timelineStartMinutes, rawStartMinutes);
            const clampedEndMinutes = Math.min(timelineEndMinutes, rawEndMinutes);

            if (clampedEndMinutes <= clampedStartMinutes) {
              return null;
            }

            const leftPercent =
              ((clampedStartMinutes - timelineStartMinutes) / timelineTotalMinutes) * 100;
            const widthPercent =
              ((clampedEndMinutes - clampedStartMinutes) / timelineTotalMinutes) * 100;

            const startDate = new Date(booking.startTime);
            const endDate = new Date(booking.endTime);

            return {
              booking,
              leftPercent,
              widthPercent: Math.max(1.8, widthPercent),
              studentName: booking.user?.name || "N/A",
              studentEmail: booking.user?.email || "N/A",
              timeRange: `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`,
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

        return {
          booth,
          boothBookings,
        };
      })
      .sort((a, b) => {
        if (a.boothBookings.length === 0 && b.boothBookings.length > 0) return 1;
        if (a.boothBookings.length > 0 && b.boothBookings.length === 0) return -1;
        return a.booth.name.localeCompare(b.booth.name, "vi");
      });
  }, [boothFilter, boothOptions, timelineBookings, timelineStartMinutes, timelineEndMinutes, timelineTotalMinutes]);

  const selectedDateLabel = useMemo(() => {
    if (!date) return null;
    const dt = new Date(`${date}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return date;
    return format(dt, "dd/MM/yyyy");
  }, [date]);

  const monthLabel = useMemo(() => format(monthCursor, "MM/yyyy"), [monthCursor]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const monthEnd = endOfMonth(monthCursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: CALENDAR_WEEK_STARTS_ON_MONDAY });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: CALENDAR_WEEK_STARTS_ON_MONDAY });

    const days: Date[] = [];
    let cursor = gridStart;

    while (cursor <= gridEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }

    return days;
  }, [monthCursor]);

  const monthOverview = useMemo(() => {
    let activeDays = 0;
    let totalBookedBooths = 0;
    let totalBookedSlots = 0;

    Object.values(monthlySummaries).forEach((summary) => {
      totalBookedBooths += summary.bookedBooths;
      totalBookedSlots += summary.bookedSlots;
      if (summary.bookedBooths > 0) {
        activeDays += 1;
      }
    });

    return {
      activeDays,
      totalBookedBooths,
      totalBookedSlots,
    };
  }, [monthlySummaries]);

  const todayDateKey = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

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
        <Link
          href="/admin/monitoring"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Giám sát realtime
        </Link>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-700">Lịch trình Booth</h1>
          <p className="text-gray-600 mt-2">
            Xem trực quan booth nào đang có người đặt ở khung giờ nào theo dạng timeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("TIMELINE")}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "TIMELINE"
                  ? "bg-navy-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Timeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "LIST"
                  ? "bg-navy-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <List className="mr-1.5 h-3.5 w-3.5" />
              Danh sách
            </button>
          </div>

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
              placeholder="Lọc theo sinh viên hoặc booth"
              className="ml-2 w-full border-0 bg-transparent p-0 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-navy-50 px-3 py-1 text-navy-700">Tổng: {summary.total}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Chờ xác nhận: {summary.pending}</span>
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

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center text-xl font-bold text-navy-700">
              <CalendarDays className="mr-2 h-5 w-5" />
              Lịch tháng tổng quan
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Mỗi ngày hiển thị tổng số booth đã được đặt. Bấm vào ngày để nhảy xuống lịch trong ngày đó.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setMonthCursor((prev) => startOfMonth(subMonths(prev, 1)))}
                className="rounded-md p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Tháng trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm font-bold text-slate-700">Tháng {monthLabel}</span>
              <button
                type="button"
                onClick={() => setMonthCursor((prev) => startOfMonth(addMonths(prev, 1)))}
                className="rounded-md p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Tháng sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMonthCursor(startOfMonth(new Date()));
                navigateToScheduleDate(todayDateKey);
              }}
              className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Điều hướng tới lịch hôm nay
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-navy-50 px-3 py-1 text-navy-700">
            Ngày có phát sinh booking: {monthOverview.activeDays}
          </span>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">
            Tổng lượt booth-book trong tháng: {monthOverview.totalBookedBooths}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
            Tổng lượt đặt theo khung giờ: {monthOverview.totalBookedSlots}
          </span>
          {monthlyLoading ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              Đang tải thống kê tháng...
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {MONTH_WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="rounded-lg border border-slate-100 bg-slate-50 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              {label}
            </div>
          ))}

          {monthDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const summary = monthlySummaries[dayKey];
            const isCurrentMonthDay = isSameMonth(day, monthCursor);
            const isSelectedDay = date ? isSameDay(day, new Date(`${date}T00:00:00`)) : false;
            const isToday = dayKey === todayDateKey;

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => {
                  setMonthCursor(startOfMonth(day));
                  navigateToScheduleDate(dayKey);
                }}
                className={`min-h-[128px] rounded-xl border p-3 text-left transition ${
                  isSelectedDay
                    ? "border-navy-500 bg-navy-50 shadow-sm"
                    : isCurrentMonthDay
                      ? "border-slate-200 bg-white hover:border-navy-300 hover:bg-slate-50"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${isCurrentMonthDay ? "text-slate-900" : "text-slate-400"}`}>
                    {format(day, "d")}
                  </span>
                  {isToday ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      Hôm nay
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-600">
                    Booth đã book: <span className="font-bold text-slate-900">{summary?.bookedBooths || 0}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Lượt đặt theo slot: {summary?.bookedSlots || 0}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tổng booth hệ thống: {summary?.totalBooths || 0}
                  </p>
                  {summary?.hasError ? (
                    <p className="text-[10px] font-semibold text-rose-600">Không tải được dữ liệu ngày này</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={scheduleSectionRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-navy-700 mb-6">
          {selectedDateLabel ? `Lịch trình ngày ${selectedDateLabel}` : "Tất cả lịch trình"}
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
        ) : viewMode === "TIMELINE" ? (
          !date ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Vui lòng chọn ngày cụ thể để xem timeline theo booth.
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">Đang sử dụng</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Đã xác nhận</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Chờ xác nhận</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Hoàn tất</span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">Hủy / Vắng mặt</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <div className="min-w-[1120px]">
                  <div className="grid grid-cols-[240px_minmax(860px,1fr)] border-b border-slate-200 bg-slate-50">
                    <div className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Booth</div>
                    <div className="relative h-12">
                      {hourMarks.map((hour) => {
                        const leftPercent =
                          ((hour * 60 - timelineStartMinutes) / timelineTotalMinutes) * 100;

                        return (
                          <div
                            key={hour}
                            className="absolute inset-y-0"
                            style={{ left: `${leftPercent}%` }}
                          >
                            <div className="h-full w-px bg-slate-200" />
                            <span className="absolute left-1 top-1 text-[10px] font-semibold text-slate-500">
                              {`${hour.toString().padStart(2, "0")}:00`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {timelineRows.map(({ booth, boothBookings }) => (
                    <div
                      key={booth.id}
                      className="grid grid-cols-[240px_minmax(860px,1fr)] border-b border-slate-100 last:border-b-0"
                    >
                      <div className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{booth.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {booth.code ? `Code: ${booth.code}` : "Không có mã"} • {booth.status}
                        </p>
                      </div>

                      <div className="relative h-20 bg-white">
                        {hourMarks.map((hour) => {
                          const leftPercent =
                            ((hour * 60 - timelineStartMinutes) / timelineTotalMinutes) * 100;
                          return (
                            <div
                              key={`${booth.id}-${hour}`}
                              className="absolute inset-y-0 w-px bg-slate-100"
                              style={{ left: `${leftPercent}%` }}
                            />
                          );
                        })}

                        {boothBookings.length === 0 ? (
                          <div className="absolute inset-0 flex items-center px-3 text-xs text-slate-400">
                            Chưa có đặt lịch trong khung giờ hiển thị.
                          </div>
                        ) : (
                          boothBookings.map((item) => (
                            <button
                              key={item.booking.id}
                              type="button"
                              onClick={() => setSelectedTimelineBooking(item.booking)}
                              className={`absolute top-2 h-16 overflow-hidden rounded-lg border px-2 py-1 shadow-sm ${getTimelineBookingClass(item.booking)}`}
                              style={{
                                left: `${item.leftPercent}%`,
                                width: `${item.widthPercent}%`,
                              }}
                              title={`${item.studentName} (${item.studentEmail}) | ${item.timeRange} | ${getBookingTypeLabel(item.booking.type)} | ${getBookingStatusLabel(item.booking.status)}`}
                            >
                              <p className="truncate text-[11px] font-bold">{item.studentName}</p>
                              <p className="truncate text-[10px] opacity-95">{item.timeRange}</p>
                              <p className="truncate text-[10px] opacity-90">
                                {getBookingTypeLabel(item.booking.type)} • {getBookingStatusLabel(item.booking.status)}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Mẹo: Bấm vào block để xem chi tiết đặt lịch, hoặc di chuột để xem tóm tắt nhanh.
              </p>
            </>
          )
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
                          {getBookingTypeLabel(booking.type)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getBookingStatusChipClass(booking.status)}`}
                        >
                          {getBookingStatusLabel(booking.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center text-xs text-gray-500 font-medium">
                          <UserRound className="mr-1 h-3.5 w-3.5" />
                          {booking.user?.studentCode || "Không có MSSV"}
                          <Clock3 className="mx-1 h-3.5 w-3.5" />
                          {getBookingDurationMinutes(booking)}
                          p
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

      {selectedTimelineBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Chi tiết đặt lịch</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedTimelineBooking.booth?.name || "Chưa có booth"} • {selectedTimelineBooking.booth?.code || "Không có mã"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTimelineBooking(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sinh viên</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{selectedTimelineBooking.user?.name || "N/A"}</p>
                <p className="text-xs text-slate-600">{selectedTimelineBooking.user?.email || "-"}</p>
                <p className="text-xs text-slate-600">MSSV: {selectedTimelineBooking.user?.studentCode || "-"}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thông tin booking</p>
                <p className="mt-1 text-sm text-slate-800">
                  Mục đích: <span className="font-semibold">{getBookingTypeLabel(selectedTimelineBooking.type)}</span>
                </p>
                <p className="text-sm text-slate-800">
                  Trạng thái: <span className="font-semibold">{getBookingStatusLabel(selectedTimelineBooking.status)}</span>
                </p>
                <p className="text-sm text-slate-800">
                  Thời lượng: <span className="font-semibold">{getBookingDurationMinutes(selectedTimelineBooking)} phút</span>
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mốc thời gian</p>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-800 md:grid-cols-2">
                  <p>
                    Bắt đầu: <span className="font-semibold">{formatDateTime(selectedTimelineBooking.startTime)}</span>
                  </p>
                  <p>
                    Kết thúc: <span className="font-semibold">{formatDateTime(selectedTimelineBooking.endTime)}</span>
                  </p>
                  <p>
                    Check-in: <span className="font-semibold">{formatDateTime(selectedTimelineBooking.checkedInAt)}</span>
                  </p>
                  <p>
                    Check-out: <span className="font-semibold">{formatDateTime(selectedTimelineBooking.checkedOutAt)}</span>
                  </p>
                  <p>
                    Tạo lúc: <span className="font-semibold">{formatDateTime(selectedTimelineBooking.createdAt)}</span>
                  </p>
                  <p>
                    Cập nhật: <span className="font-semibold">{formatDateTime(selectedTimelineBooking.updatedAt)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
