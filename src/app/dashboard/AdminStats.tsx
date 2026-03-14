"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Users, 
  MonitorPlay, 
  CalendarDays, 
  FileCheck,
  AlertTriangle
} from "lucide-react";

import { useAuth } from "@/lib/hooks";
import { dashboardApi } from "@/lib/api/dashboard";
import type { AdminStats } from "@/lib/api/types";

export default function AdminStatsDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === "ADMIN") {
      dashboardApi.getAdminStats()
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (!user || user.role !== "ADMIN") return null;
  if (loading) return <div className="text-center py-8 text-gray-500">Đang tải thống kê hệ thống...</div>;
  if (!stats) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-600">Tổng quan Hệ thống Quản trị</h1>
        <p className="text-gray-600 mt-2">Dữ liệu thời gian thực tình hình hoạt động của Booths và sinh viên.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Tổng Sinh viên</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded-xl">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Booth đang HĐ</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeBooths}</p>
          </div>
          <div className="bg-emerald-100 p-4 rounded-xl">
            <MonitorPlay className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Lượt đặt hôm nay</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.todayBookings}</p>
          </div>
          <div className="bg-indigo-100 p-4 rounded-xl">
            <CalendarDays className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Tổng Kỳ thi / Lượt thi</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalExams}</p>
          </div>
          <div className="bg-orange-100 p-4 rounded-xl">
            <FileCheck className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Utilization */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-navy-700 mb-6">Hiệu suất sử dụng Booth hôm nay</h2>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                <circle 
                  cx="80" 
                  cy="80" 
                  r="70" 
                  fill="transparent" 
                  stroke="#162a4d" 
                  strokeWidth="16" 
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - stats.boothUtilizationPercent / 100)}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-navy-700">{stats.boothUtilizationPercent}%</span>
                <span className="text-xs text-gray-500">Tần suất</span>
              </div>
            </div>
            <p className="text-sm text-center text-gray-500 mt-6">
              Dựa trên tổng thời gian và năng lực của tất cả các booth đang hoạt động trong khung giờ 7:00 - 17:00.
            </p>
          </div>
        </div>

        {/* Proctoring Events */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-navy-700">Cảnh báo giám thị gần đây</h2>
          </div>
          
          {stats.recentProctoringEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
              Không có cảnh báo vi phạm nào trong hôm nay.
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentProctoringEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition">
                  <div className={`p-2 font-bold rounded-lg text-white mt-1 ${
                    event.warningLevel >= 3 ? "bg-red-500" : 
                    event.warningLevel === 2 ? "bg-orange-500" : "bg-amber-400"
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">
                        {event.eventType === "TAB_SWITCH" ? "Chuyển Tab / Ra khỏi màn hình thi" :
                         event.eventType === "COPY_PASTE" ? "Phát hiện Copy-Paste" :
                         event.eventType === "MULTIPLE_FACES" ? "Có nhiều hơn 1 khuôn mặt trong khung hình" :
                         event.eventType === "NO_FACE" ? "Không thấy sinh viên" : 
                         event.eventType}
                      </h3>
                      <span className="text-xs text-gray-500 font-medium">
                        {format(new Date(event.timestamp), "HH:mm dd/MM")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Mức cảnh báo: <span className="font-semibold text-gray-900">{event.warningLevel}</span> 
                      <span className="mx-2">•</span>
                      Sinh viên: <span className="font-semibold">{event.session.user.name} ({event.session.user.studentCode})</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
