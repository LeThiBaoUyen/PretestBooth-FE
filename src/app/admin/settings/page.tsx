"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { bookingDurationsApi } from "@/lib/api/bookingDurations";
import { checkinApi } from "@/lib/api/checkin";
import type {
  BookingDurationOption,
  BookingType,
  CheckinThresholdConfig,
} from "@/lib/api/types";
import { useAuth } from "@/lib/hooks";

const BOOKING_TYPE_OPTIONS: BookingType[] = ["PRACTICE", "EXAM"];

interface DurationFormData {
  type: BookingType;
  durationMinutes: string;
  displayOrder: string;
  isActive: boolean;
}

const emptyDurationForm: DurationFormData = {
  type: "PRACTICE",
  durationMinutes: "30",
  displayOrder: "",
  isActive: true,
};

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSettingsPage() {
  const { user, userLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const [durationOptions, setDurationOptions] = useState<BookingDurationOption[]>([]);
  const [durationLoading, setDurationLoading] = useState(true);
  const [durationSubmitting, setDurationSubmitting] = useState(false);
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [durationForm, setDurationForm] = useState<DurationFormData>(emptyDurationForm);
  const [durationFilter, setDurationFilter] = useState<BookingType | "ALL">("ALL");

  const [thresholdConfig, setThresholdConfig] = useState<CheckinThresholdConfig | null>(null);
  const [thresholdInput, setThresholdInput] = useState("0.6");
  const [thresholdLoading, setThresholdLoading] = useState(true);
  const [thresholdSubmitting, setThresholdSubmitting] = useState(false);

  const canManageSettings = user?.role === "ADMIN";

  const filteredDurationOptions = useMemo(
    () =>
      durationFilter === "ALL"
        ? durationOptions
        : durationOptions.filter((option) => option.type === durationFilter),
    [durationOptions, durationFilter],
  );

  const resetDurationForm = () => {
    setEditingDurationId(null);
    setDurationForm(emptyDurationForm);
  };

  const loadCheckinThreshold = async () => {
    try {
      setThresholdLoading(true);
      const threshold = await checkinApi.getThreshold();
      setThresholdConfig(threshold);
      setThresholdInput(String(threshold.threshold));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải ngưỡng xác thực khuôn mặt");
      setThresholdConfig(null);
    } finally {
      setThresholdLoading(false);
    }
  };

  const loadDurationOptions = async () => {
    try {
      setDurationLoading(true);
      const items = await bookingDurationsApi.getDurationOptions();
      setDurationOptions(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải cấu hình thời lượng");
      setDurationOptions([]);
    } finally {
      setDurationLoading(false);
    }
  };

  useEffect(() => {
    if (!canManageSettings) {
      return;
    }

    void loadDurationOptions();
    void loadCheckinThreshold();
  }, [canManageSettings]);

  const handleDurationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManageSettings) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const durationMinutes = Number(durationForm.durationMinutes);
    const displayOrder =
      durationForm.displayOrder.trim() === "" ? undefined : Number(durationForm.displayOrder);

    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      setError("Thời lượng phải là số nguyên dương");
      return;
    }

    if (displayOrder !== undefined && (!Number.isInteger(displayOrder) || displayOrder < 0)) {
      setError("Thứ tự hiển thị phải là số nguyên >= 0");
      return;
    }

    try {
      setDurationSubmitting(true);
      setError(null);

      if (editingDurationId) {
        await bookingDurationsApi.updateDurationOption(editingDurationId, {
          type: durationForm.type,
          durationMinutes,
          displayOrder: displayOrder ?? null,
          isActive: durationForm.isActive,
        });
      } else {
        await bookingDurationsApi.createDurationOption({
          type: durationForm.type,
          durationMinutes,
          displayOrder,
          isActive: durationForm.isActive,
        });
      }

      await loadDurationOptions();
      resetDurationForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể lưu cấu hình thời lượng");
    } finally {
      setDurationSubmitting(false);
    }
  };

  const editDurationOption = (item: BookingDurationOption) => {
    setEditingDurationId(item.id);
    setDurationForm({
      type: item.type,
      durationMinutes: String(item.durationMinutes),
      displayOrder: item.displayOrder === null ? "" : String(item.displayOrder),
      isActive: item.isActive,
    });
  };

  const deleteDurationOption = async (item: BookingDurationOption) => {
    if (!canManageSettings) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const confirmed = window.confirm(
      `Xóa mốc ${item.durationMinutes} phút (${item.type})? Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    try {
      setError(null);
      await bookingDurationsApi.deleteDurationOption(item.id);
      await loadDurationOptions();
      if (editingDurationId === item.id) {
        resetDurationForm();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể xóa cấu hình thời lượng");
    }
  };

  const saveCheckinThreshold = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManageSettings) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const threshold = Number(thresholdInput);
    if (!Number.isFinite(threshold) || threshold < 0.5 || threshold > 0.99) {
      setError("Ngưỡng xác thực phải nằm trong khoảng 0.5 - 0.99");
      return;
    }

    try {
      setThresholdSubmitting(true);
      setError(null);
      const saved = await checkinApi.updateThreshold({ threshold });
      setThresholdConfig(saved);
      setThresholdInput(String(saved.threshold));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật ngưỡng xác thực khuôn mặt");
    } finally {
      setThresholdSubmitting(false);
    }
  };

  if (userLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
          <p className="mt-3 text-sm text-gray-600">Đang tải thông tin cài đặt...</p>
        </div>
      </main>
    );
  }

  if (!canManageSettings) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
          Bạn không có quyền truy cập trang cài đặt hệ thống.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="ui-page-header">
          <div>
            <h1 className="ui-page-title">Cài đặt hệ thống</h1>
            <p className="ui-page-subtitle">
              Quản trị ngưỡng xác thực khuôn mặt và các mốc thời lượng đặt booth.
            </p>
          </div>
        </div>

        <nav className="-mt-2 flex flex-wrap items-center gap-2" aria-label="Admin settings navigation">
          <Link
            href="/admin/booths"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Quản lý Booth
          </Link>
          <Link
            href="/admin/booths/schedule"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Lịch trình Booth
          </Link>
          <Link
            href="/admin/settings"
            className="inline-flex items-center rounded-full bg-navy-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            Cài đặt hệ thống
          </Link>
        </nav>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ngưỡng xác thực khuôn mặt</h2>
              <p className="text-sm text-gray-600">
                Áp dụng cho toàn bộ luồng check-in booth. Giá trị thấp hơn sẽ dễ pass hơn.
              </p>
            </div>
            <button
              type="button"
              onClick={loadCheckinThreshold}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm mới ngưỡng
            </button>
          </div>

          {thresholdLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải ngưỡng xác thực...
            </div>
          ) : (
            <form onSubmit={saveCheckinThreshold} className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <input
                type="number"
                min={0.5}
                max={0.99}
                step={0.01}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                disabled={thresholdSubmitting}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100"
                placeholder="0.6"
              />

              <div className="md:col-span-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                <p>
                  Giá trị hiện tại: <span className="font-semibold">{thresholdConfig?.threshold ?? "-"}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Nguồn cấu hình: {thresholdConfig?.source ?? "-"} • Cập nhật lúc:{" "}
                  {thresholdConfig?.updatedAt ? formatDateTime(thresholdConfig.updatedAt) : "-"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={thresholdSubmitting}
                  className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
                >
                  {thresholdSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu ngưỡng
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cấu hình thời lượng đặt booth</h2>
              <p className="text-sm text-gray-600">
                Admin có thể thêm, chỉnh sửa hoặc xóa các mốc thời gian khả dụng cho sinh viên.
              </p>
            </div>
            <button
              type="button"
              onClick={loadDurationOptions}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm mới danh sách
            </button>
          </div>

          <form onSubmit={handleDurationSubmit} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            <select
              value={durationForm.type}
              onChange={(e) => setDurationForm((prev) => ({ ...prev, type: e.target.value as BookingType }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {BOOKING_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type === "PRACTICE" ? "Luyện tập" : "Kiểm tra"}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={5}
              max={240}
              step={1}
              value={durationForm.durationMinutes}
              onChange={(e) => setDurationForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Thời lượng (phút)"
            />

            <input
              type="number"
              min={0}
              step={1}
              value={durationForm.displayOrder}
              onChange={(e) => setDurationForm((prev) => ({ ...prev, displayOrder: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Thứ tự hiển thị"
            />

            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={durationForm.isActive}
                onChange={(e) => setDurationForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Đang hoạt động
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={durationSubmitting}
                className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
              >
                {durationSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDurationId ? "Lưu" : "Thêm"}
              </button>
              {editingDurationId && (
                <button
                  type="button"
                  onClick={resetDurationForm}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </form>

          <div className="mb-4 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              Lọc theo loại:
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value as BookingType | "ALL")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">Tất cả</option>
                <option value="PRACTICE">Luyện tập</option>
                <option value="EXAM">Kiểm tra</option>
              </select>
            </label>
            <span className="text-sm text-gray-500">
              ({filteredDurationOptions.length} / {durationOptions.length} mốc)
            </span>
          </div>

          {durationLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải cấu hình thời lượng...
            </div>
          ) : durationOptions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
              Chưa có mốc thời lượng nào.
            </p>
          ) : filteredDurationOptions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
              Không có mốc thời lượng nào phù hợp với bộ lọc.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredDurationOptions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <div className="text-sm text-gray-800">
                    <span className="font-semibold">{item.durationMinutes} phút</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span>{item.type === "PRACTICE" ? "Luyện tập" : "Kiểm tra"}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span>Thứ tự: {item.displayOrder ?? "-"}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span className={item.isActive ? "text-emerald-700" : "text-slate-500"}>
                      {item.isActive ? "Đang hoạt động" : "Ngưng sử dụng"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => editDurationOption(item)}
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDurationOption(item)}
                      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
