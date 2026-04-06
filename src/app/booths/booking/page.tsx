"use client";

import { useState, useEffect } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, Clock, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { bookingsApi } from "@/lib/api/bookings";
import { bookingDurationsApi } from "@/lib/api/bookingDurations";
import { kycApi } from "@/lib/api/kyc";
import type { AvailableTimeSlot } from "@/lib/api/types";
import { useRouter } from "next/navigation";

export default function BookingPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Booking config rules
  const minDaysInAdvance = 7;
  const maxDaysInAdvance = 30;

  const [dates, setDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<AvailableTimeSlot[]>([]);
  const [myBookedRanges, setMyBookedRanges] = useState<Array<{ startTime: string; endTime: string }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null);
  const [bookingType, setBookingType] = useState<"PRACTICE" | "EXAM">("PRACTICE");
  const [duration, setDuration] = useState<number>(30);
  const [durationOptions, setDurationOptions] = useState<number[]>([]);
  const [loadingDurations, setLoadingDurations] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [kycStatus, setKycStatus] = useState<"NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED">("NOT_STARTED");
  const [hasFaceEmbedding, setHasFaceEmbedding] = useState(false);

  // Generate selectable dates (from today + 7 days, for next 30 days)
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const availableDates = [];
    for (let i = minDaysInAdvance; i <= maxDaysInAdvance; i++) {
      const d = addDays(today, i);
      // Optional: Skip Sundays? (d.getDay() !== 0)
      availableDates.push(d);
    }
    setDates(availableDates);
    setSelectedDate(availableDates[0]);
  }, []);

  // Fetch availability when date changes
  useEffect(() => {
    if (!selectedDate) return;
    
    const fetchAvailability = async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setError(null);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const [availability, myBookings] = await Promise.all([
          bookingsApi.getAvailability(dateStr),
          bookingsApi.getBookings({
            date: dateStr,
            limit: 50,
            sortOrder: "asc",
          }),
        ]);

        setSlots(Array.isArray(availability?.slots) ? availability.slots : []);

        const activeStatuses = new Set(["PENDING", "CONFIRMED", "CHECKED_IN"]);
        const myActiveBookings = (myBookings.data || [])
          .filter((booking) => activeStatuses.has(booking.status))
          .map((booking) => ({
            startTime: booking.startTime,
            endTime: booking.endTime,
          }));

        setMyBookedRanges(myActiveBookings);
      } catch (err: any) {
        setError("Không thể tải lịch trống. Vui lòng thử lại sau.");
        setMyBookedRanges([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailability();
  }, [selectedDate]);

  useEffect(() => {
    const fetchDurationOptions = async () => {
      setLoadingDurations(true);
      setError(null);

      try {
        const options = await bookingDurationsApi.getDurationOptions({
          type: bookingType,
          isActive: true,
        });

        const minutes = Array.isArray(options)
          ? options.map((item) => item.durationMinutes)
          : [];
        setDurationOptions(minutes);

        if (minutes.length > 0) {
          setDuration((current) => (minutes.includes(current) ? current : minutes[0]));
        }
      } catch {
        setError("Không thể tải cấu hình thời lượng. Vui lòng thử lại sau.");
        setDurationOptions([]);
      } finally {
        setLoadingDurations(false);
      }
    };

    fetchDurationOptions();
  }, [bookingType]);

  useEffect(() => {
    if (!user || user.role !== "STUDENT") {
      setLoadingKyc(false);
      return;
    }

    const fetchKycStatus = async () => {
      try {
        setLoadingKyc(true);
        const response = await kycApi.getStatus();
        setKycStatus(response.kycStatus);
        setHasFaceEmbedding(response.hasEmbedding);
      } catch {
        setKycStatus("NOT_STARTED");
        setHasFaceEmbedding(false);
      } finally {
        setLoadingKyc(false);
      }
    };

    fetchKycStatus();
  }, [user]);

  const isKycVerified = kycStatus === "VERIFIED" && hasFaceEmbedding;
  const safeSlots = Array.isArray(slots) ? slots : [];
  const safeDurationOptions = Array.isArray(durationOptions) ? durationOptions : [];

  const isSlotBookedByMe = (slot: AvailableTimeSlot) => {
    const slotStart = new Date(slot.startTime).getTime();
    const slotEnd = new Date(slot.endTime).getTime();

    return myBookedRanges.some((booking) => {
      const bookingStart = new Date(booking.startTime).getTime();
      const bookingEnd = new Date(booking.endTime).getTime();
      return bookingStart < slotEnd && bookingEnd > slotStart;
    });
  };

  const handleBook = async () => {
    if (!isKycVerified) {
      setError("Bạn cần hoàn tất Facial KYC trước khi đặt lịch.");
      return;
    }

    if (!selectedDate || !selectedSlot) return;
    if (!safeDurationOptions.includes(duration)) {
      setError("Vui lòng chọn thời lượng hợp lệ.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Find a booth that is NOT booked at this slot
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const res = await bookingsApi.getAvailability(dateStr);
      
      const availableBooths = res.booths.filter(
        b => !selectedSlot.bookedBoothIds.includes(b.id)
      );

      if (availableBooths.length === 0) {
        throw new Error("Rất tiếc, đã hết Booth trống vào khung giờ này.");
      }

      const boothId = availableBooths[0].id; // Pick the first available
      
      const start = new Date(selectedSlot.startTime);
      const end = new Date(start.getTime() + duration * 60000);

      await bookingsApi.createBooking({
        boothId,
        type: bookingType,
        date: dateStr,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi đặt lịch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return <div className="text-center py-20">Vui lòng đăng nhập...</div>;
  if (user.role !== "STUDENT") return <div className="text-center py-20 text-red-500">Chỉ sinh viên mới có thể đặt lịch.</div>;
  if (loadingKyc) return <div className="text-center py-20">Đang kiểm tra trạng thái KYC...</div>;

  if (!isKycVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-xl w-full rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-7 w-7 mt-0.5" />
              <div>
                <h1 className="text-2xl font-bold">Cần hoàn tất Facial KYC</h1>
                <p className="mt-3 text-sm">
                  Bạn chưa có dữ liệu khuôn mặt hợp lệ trong hệ thống. Vui lòng hoàn tất bước KYC
                  một lần trước khi đặt lịch booth.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/kyc")}
                  className="mt-5 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Đi đến trang KYC
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col">
      <main className="flex-1 pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          <div className="bg-white shadow rounded-2xl p-6 sm:p-10 border border-gray-100">
          
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-navy-100 p-3 rounded-xl">
              <CalendarDays className="w-8 h-8 text-navy-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-900">Đặt lịch sử dụng Booth</h1>
              <p className="text-gray-500 mt-1">Lưu ý: Bạn phải đặt lịch trước ít nhất 1 tuần.</p>
            </div>
          </div>

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-8 text-center flex flex-col items-center">
              <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Đặt lịch thành công!</h2>
              <p className="text-emerald-600 mb-6">Bạn đã chọn ca sử dụng Booth thành công.</p>
              <button onClick={() => router.push("/dashboard")} className="bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-emerald-700 transition">
                Về lại Dashboard
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Date & Type Selection */}
              <div className="col-span-1 lg:col-span-5 space-y-8">
                
                {/* 1. Date Selection */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-navy-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">1</span>
                    Chọn ngày
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2">
                    {dates.slice(0, 16).map(date => {
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => setSelectedDate(date)}
                          className={`flex flex-col items-center justify-center py-3 rounded-xl border transition ${
                            isSelected 
                              ? "bg-navy-600 border-navy-600 text-white shadow-md shadow-navy-200" 
                              : "bg-white border-gray-200 text-gray-700 hover:border-navy-300 hover:bg-navy-50"
                          }`}
                        >
                          <span className="text-xs uppercase font-medium">{format(date, "EEE", { locale: vi })}</span>
                          <span className="text-xl font-bold mt-1">{format(date, "dd")}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Type & Duration Selection */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-navy-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">2</span>
                    Mục đích sử dụng
                  </h3>
                  
                  <div className="flex gap-4 mb-6">
                    <label className={`flex-1 cursor-pointer p-4 rounded-xl border-2 transition text-center ${
                      bookingType === "PRACTICE" ? "border-navy-600 bg-navy-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <input type="radio" name="type" className="sr-only" checked={bookingType === "PRACTICE"} onChange={() => { setBookingType("PRACTICE"); }} />
                      <span className="block font-bold text-gray-900">Luyện tập</span>
                      <span className="text-xs text-gray-500">Theo cấu hình Admin</span>
                    </label>
                    <label className={`flex-1 cursor-pointer p-4 rounded-xl border-2 transition text-center ${
                      bookingType === "EXAM" ? "border-red-600 bg-red-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <input type="radio" name="type" className="sr-only" checked={bookingType === "EXAM"} onChange={() => { setBookingType("EXAM"); }} />
                      <span className="block font-bold text-gray-900 text-red-700">Kiểm tra</span>
                      <span className="text-xs text-red-500">Theo cấu hình Admin</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Thời lượng mong muốn (phút)</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-navy-500 focus:border-navy-500 block p-3"
                      disabled={loadingDurations || safeDurationOptions.length === 0}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    >
                      {loadingDurations && <option value={duration}>Đang tải...</option>}
                      {!loadingDurations && safeDurationOptions.length === 0 && (
                        <option value={duration}>Chưa có cấu hình thời lượng</option>
                      )}
                      {!loadingDurations && safeDurationOptions.map((item) => (
                        <option key={item} value={item}>{item} phút</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Right Column: Time Slots */}
              <div className="col-span-1 lg:col-span-7">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-navy-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-sm mr-2">3</span>
                  Khung giờ khả dụng
                </h3>
                
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 min-h-[400px]">
                  {loadingSlots ? (
                    <div className="flex justify-center items-center h-full text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600 mr-3"></div>
                      Đang tải khung giờ...
                    </div>
                  ) : safeSlots.length === 0 ? (
                    <div className="text-center text-gray-500 py-20 flex flex-col items-center">
                      <Clock className="w-12 h-12 text-gray-300 mb-3" />
                      Không có khung giờ nào khả dụng trong ngày này.
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-4 font-medium flex items-center">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block mr-2"></span> Còn trống
                        <span className="w-3 h-3 rounded-full bg-red-500 inline-block ml-4 mr-2"></span> Đã đầy
                        <span className="w-3 h-3 rounded-full bg-slate-400 inline-block ml-4 mr-2"></span> Bạn đã đặt
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {safeSlots.map(slot => {
                          const isBookedByMe = isSlotBookedByMe(slot);
                          const isFull = slot.availableBooths === 0;
                          const isSelected = selectedSlot?.startTime === slot.startTime;

                          return (
                            <button
                              key={slot.startTime}
                              disabled={isFull || isBookedByMe}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-3 px-2 rounded-lg text-sm font-bold border transition ${
                                isBookedByMe
                                  ? "bg-slate-200 border-slate-300 text-slate-600 cursor-not-allowed"
                                  : isFull
                                    ? "bg-red-100 border-red-200 text-red-600 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-navy-600 border-navy-600 text-white shadow-md"
                                    : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100"
                              }`}
                            >
                              {format(new Date(slot.startTime), "HH:mm")}
                              {isBookedByMe && <span className="block text-[10px] font-normal text-slate-600 mt-1">Bạn đã đặt</span>}
                              {!isBookedByMe && !isFull && !isSelected && (
                                <span className="block text-[10px] font-normal text-emerald-600 mt-1">Còn {slot.availableBooths}</span>
                              )}
                              {!isBookedByMe && isFull && (
                                <span className="block text-[10px] font-normal text-red-600 mt-1">Hết chỗ</span>
                              )}
                              {!isBookedByMe && isSelected && (
                                <span className="block text-[10px] font-normal text-navy-200 mt-1">Đã chọn</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start border border-red-200">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                  <button
                    disabled={!selectedSlot || isSubmitting || safeDurationOptions.length === 0}
                    onClick={handleBook}
                    className={`px-8 py-3 rounded-xl font-bold text-white transition shadow-lg ${
                      !selectedSlot || isSubmitting || safeDurationOptions.length === 0
                        ? "bg-gray-400 cursor-not-allowed shadow-none"
                        : "bg-navy-600 hover:bg-navy-700 hover:shadow-navy-200/50"
                    }`}
                  >
                    {isSubmitting ? "Đang xử lý..." : "Xác nhận đặt lịch"}
                  </button>
                </div>
              </div>

            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
