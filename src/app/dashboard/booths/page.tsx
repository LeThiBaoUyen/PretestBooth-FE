"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useAuth } from "@/lib/hooks";
import { boothsApi } from "@/lib/api/booths";
import { bookingsApi } from "@/lib/api/bookings";
import type { Booth, Booking } from "@/lib/api/types";
import { 
  MonitorPlay, 
  Settings, 
  PowerOff, 
  CheckCircle2, 
  LogOut,
  Calendar
} from "lucide-react";

export default function AdminBoothsPage() {
  const { user } = useAuth();
  
  const [booths, setBooths] = useState<Booth[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Refresh Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [boothsRes, bookingsRes] = await Promise.all([
        boothsApi.getBooths(),
        bookingsApi.getBookings({ date, limit: 100, sortOrder: "asc" })
      ]);
      setBooths(boothsRes);
      setBookings(bookingsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchData();
    }
  }, [user, date]);

  // Actions
  const handleCheckIn = async (id: string) => {
    try {
      await bookingsApi.checkIn(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to check in");
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      await bookingsApi.checkOut(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to check out");
    }
  };

  const handleToggleBoothStatus = async (booth: Booth) => {
    const newStatus = booth.status === "ACTIVE" ? "MAINTENANCE" : 
                     booth.status === "MAINTENANCE" ? "INACTIVE" : "ACTIVE";
    try {
      await boothsApi.updateBooth(booth.id, { status: newStatus });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-600">Quản lý Booths & Lịch đặt</h1>
          <p className="text-gray-600 mt-2">Giám sát các thiết bị và điều phối sinh viên ra/vào khu vực thi.</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <Calendar className="w-5 h-5 text-gray-400 ml-2" />
          <input 
            type="date" 
            className="border-0 focus:ring-0 text-gray-700 font-medium bg-transparent"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* BOOTHS LIST (LEFT COL) */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-navy-700 flex items-center mb-4">
            <MonitorPlay className="w-5 h-5 mr-2" />
            Trạng thái Booths
          </h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : booths.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100">Chưa có booth nào.</div>
          ) : (
            booths.map(booth => (
              <div key={booth.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{booth.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{booth.location}</p>
                  </div>
                  <button 
                    onClick={() => handleToggleBoothStatus(booth)}
                    title="Chuyển trạng thái"
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-navy-600 transition"
                  >
                    {booth.status === "ACTIVE" ? <MonitorPlay className="w-4 h-4 text-emerald-500" /> :
                     booth.status === "MAINTENANCE" ? <Settings className="w-4 h-4 text-orange-500" /> :
                     <PowerOff className="w-4 h-4 text-red-500" />}
                  </button>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    booth.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                    booth.status === "MAINTENANCE" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                    "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {booth.status === "ACTIVE" ? "HOẠT ĐỘNG" : booth.status === "MAINTENANCE" ? "BẢO TRÌ" : "ĐÓNG"}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {bookings.filter(b => b.boothId === booth.id).length} ca đặt
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* BOOKINGS TIMELINE (RIGHT COL) */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-navy-700 mb-6 flex items-center justify-between">
              <span>Lịch trình ngày {format(new Date(date), "dd/MM/yyyy")}</span>
              <span className="bg-navy-50 text-navy-600 px-3 py-1 rounded-full text-sm font-semibold">
                {bookings.length} ca
              </span>
            </h2>

            {loading ? (
              <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                Không có lịch đặt nào trong ngày này.
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
                    {bookings.map(booking => {
                      const start = new Date(booking.startTime);
                      const end = new Date(booking.endTime);
                      
                      return (
                        <tr key={booking.id} className="hover:bg-gray-50 transition">
                          <td className="py-4 px-4">
                            <div className="font-bold text-gray-900">{format(start, "HH:mm")}</div>
                            <div className="text-xs text-gray-500">{format(end, "HH:mm")}</div>
                          </td>
                          <td className="py-4 px-4 font-medium text-navy-700">
                            {booking.booth?.name}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-gray-900">{booking.user?.name || "N/A"}</div>
                            <div className="text-xs text-gray-500">{booking.user?.email}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              booking.type === "EXAM" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                            }`}>
                              {booking.type === "EXAM" ? "KIỂM TRA" : "LUYỆN TẬP"}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              booking.status === "PENDING" ? "bg-gray-100 text-gray-600" :
                              booking.status === "CONFIRMED" ? "bg-amber-100 text-amber-700" :
                              booking.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" :
                              booking.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {booking.status === "CONFIRMED" ? "Đã xác nhận" :
                               booking.status === "CHECKED_IN" ? "Đang sử dụng" :
                               booking.status === "COMPLETED" ? "Đã xong" :
                               booking.status === "CANCELLED" ? "Đã hủy" :
                               booking.status === "NO_SHOW" ? "Vắng mặt" : "Chờ xác nhận"}
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
      </div>
    </div>
  );
}
