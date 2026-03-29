"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { boothsApi } from "@/lib/api/booths";
import { bookingDurationsApi } from "@/lib/api/bookingDurations";
import { checkinApi } from "@/lib/api/checkin";
import { useAuth } from "@/lib/hooks";
import type {
  BookingDurationOption,
  BookingType,
  Booth,
  BoothStatus,
  BoothStatusLog,
  CheckinThresholdConfig,
} from "@/lib/api/types";
import type { BoothNotificationEvent, BoothStatusUpdatedEvent, BookingRealtimeEvent } from "@/lib/api/types";
import { realtimeClient } from "@/lib/realtime/socketClient";

const STATUS_OPTIONS: BoothStatus[] = ["ACTIVE", "MAINTENANCE", "INACTIVE"];
const BOOKING_TYPE_OPTIONS: BookingType[] = ["PRACTICE", "EXAM"];

interface BoothFormData {
  name: string;
  code: string;
  location: string;
  description: string;
}

interface StatusModalState {
  isOpen: boolean;
  booth: Booth | null;
  nextStatus: BoothStatus;
  note: string;
  submitting: boolean;
}

interface OtpModalState {
  isOpen: boolean;
  booth: Booth | null;
  boothCode: string;
  otp: string;
  expiresAt: string;
  expiresAtLocal: string;
  submitting: boolean;
}

interface DurationFormData {
  type: BookingType;
  durationMinutes: string;
  displayOrder: string;
  isActive: boolean;
}

const emptyForm: BoothFormData = {
  name: "",
  code: "",
  location: "",
  description: "",
};

const emptyDurationForm: DurationFormData = {
  type: "PRACTICE",
  durationMinutes: "30",
  displayOrder: "",
  isActive: true,
};

const statusLabel: Record<BoothStatus, string> = {
  ACTIVE: "Đang hoạt động",
  MAINTENANCE: "Bảo trì",
  INACTIVE: "Ngưng hoạt động",
};

const statusColor: Record<BoothStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
  INACTIVE: "bg-slate-200 text-slate-700",
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

export default function BoothsManagementPage() {
  const { user, userLoading } = useAuth();
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingBooth, setEditingBooth] = useState<Booth | null>(null);
  const [formData, setFormData] = useState<BoothFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
  const [logs, setLogs] = useState<BoothStatusLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [statusModal, setStatusModal] = useState<StatusModalState>({
    isOpen: false,
    booth: null,
    nextStatus: "ACTIVE",
    note: "",
    submitting: false,
  });
  const [otpModal, setOtpModal] = useState<OtpModalState>({
    isOpen: false,
    booth: null,
    boothCode: "",
    otp: "",
    expiresAt: "",
    expiresAtLocal: "",
    submitting: false,
  });

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
  const [realtimeMessage, setRealtimeMessage] = useState<string | null>(null);

  const selectedBooth = useMemo(
    () => booths.find((booth) => booth.id === selectedBoothId) ?? null,
    [booths, selectedBoothId],
  );

  const filteredDurationOptions = useMemo(
    () =>
      durationFilter === "ALL"
        ? durationOptions
        : durationOptions.filter((option) => option.type === durationFilter),
    [durationOptions, durationFilter],
  );

  const canViewPage = user?.role === "ADMIN" || user?.role === "LECTURER";
  const canManageBooths = user?.role === "ADMIN";

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

  const loadBooths = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await boothsApi.getBooths();
      setBooths(data);

      if (data.length === 0) {
        setSelectedBoothId(null);
      } else if (!selectedBoothId || !data.some((item) => item.id === selectedBoothId)) {
        setSelectedBoothId(data[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách booth");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (boothId: string) => {
    try {
      setLogsLoading(true);
      setLogsError(null);
      const items = await boothsApi.getBoothStatusLogs(boothId);
      setLogs(items);
    } catch (err: unknown) {
      setLogsError(err instanceof Error ? err.message : "Không thể tải lịch sử trạng thái");
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (canViewPage) {
      loadBooths();
      loadDurationOptions();
      loadCheckinThreshold();
    }
  }, [canViewPage]);

  useEffect(() => {
    if (!selectedBoothId) {
      setLogs([]);
      return;
    }

    loadLogs(selectedBoothId);
  }, [selectedBoothId]);

  useEffect(() => {
    if (!canViewPage) {
      return;
    }

    const offStatus = realtimeClient.subscribe<BoothStatusUpdatedEvent>(
      "booth.status.updated",
      (payload) => {
        setBooths((prev) =>
          prev.map((booth) =>
            booth.id === payload.boothId ? { ...booth, status: payload.status } : booth,
          ),
        );

        if (selectedBoothId === payload.boothId) {
          void loadLogs(payload.boothId);
        }
      },
    );

    const offCheckin = realtimeClient.subscribe<BookingRealtimeEvent>("booking.checkin", () => {
      void loadBooths();
    });

    const offCheckout = realtimeClient.subscribe<BookingRealtimeEvent>("booking.checkout", () => {
      void loadBooths();
    });

    const offNotification = realtimeClient.subscribe<BoothNotificationEvent>(
      "booth.notification",
      (payload) => {
        setRealtimeMessage(payload.message);
        window.setTimeout(() => setRealtimeMessage(null), 5000);
      },
    );

    if (selectedBoothId) {
      realtimeClient.joinBooth(selectedBoothId);
    }

    return () => {
      offStatus();
      offCheckin();
      offCheckout();
      offNotification();
    };
  }, [canViewPage, selectedBoothId]);

  const resetForm = () => {
    setShowForm(false);
    setEditingBooth(null);
    setFormData(emptyForm);
  };

  const openCreateForm = () => {
    setEditingBooth(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (booth: Booth) => {
    setEditingBooth(booth);
    setFormData({
      name: booth.name,
      code: booth.code ?? "",
      location: booth.location ?? "",
      description: booth.description ?? "",
    });
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManageBooths) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (editingBooth) {
        await boothsApi.updateBooth(editingBooth.id, {
          name: formData.name,
          code: formData.code.trim() || null,
          location: formData.location.trim() || null,
          description: formData.description.trim() || null,
        });
      } else {
        await boothsApi.createBooth({
          name: formData.name,
          code: formData.code.trim() || undefined,
          location: formData.location.trim() || undefined,
          description: formData.description.trim() || undefined,
        });
      }

      await loadBooths();
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể lưu booth");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBooth = async (booth: Booth) => {
    if (!canManageBooths) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const confirmed = window.confirm(
      `Xóa booth ${booth.name}? Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    try {
      setError(null);
      await boothsApi.deleteBooth(booth.id);
      await loadBooths();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể xóa booth");
    }
  };

  const openStatusModal = (booth: Booth) => {
    setStatusModal({
      isOpen: true,
      booth,
      nextStatus: booth.status,
      note: "",
      submitting: false,
    });
  };

  const closeStatusModal = () => {
    if (statusModal.submitting) return;

    setStatusModal({
      isOpen: false,
      booth: null,
      nextStatus: "ACTIVE",
      note: "",
      submitting: false,
    });
  };

  const submitStatusChange = async () => {
    if (!canManageBooths) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const booth = statusModal.booth;
    const note = statusModal.note.trim();

    if (!booth) return;
    if (!note) {
      setError("Vui lòng nhập ghi chú khi đổi trạng thái");
      return;
    }
    if (statusModal.nextStatus === booth.status) {
      setError("Trạng thái mới phải khác trạng thái hiện tại");
      return;
    }

    try {
      setStatusModal((prev) => ({ ...prev, submitting: true }));
      setError(null);

      await boothsApi.updateBooth(booth.id, {
        status: statusModal.nextStatus,
        statusNote: note,
      });

      await loadBooths();
      await loadLogs(booth.id);
      closeStatusModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái booth");
      setStatusModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const openOtpModal = (booth: Booth) => {
    setOtpModal({
      isOpen: true,
      booth,
      boothCode: booth.code || booth.name,
      otp: "",
      expiresAt: "",
      expiresAtLocal: "",
      submitting: false,
    });
  };

  const closeOtpModal = () => {
    if (otpModal.submitting) return;
    setOtpModal({
      isOpen: false,
      booth: null,
      boothCode: "",
      otp: "",
      expiresAt: "",
      expiresAtLocal: "",
      submitting: false,
    });
  };

  const submitGenerateOtp = async () => {
    if (!canManageBooths) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const boothCode = otpModal.boothCode.trim();
    if (!boothCode) {
      setError("Vui lòng nhập booth code để tạo OTP");
      return;
    }

    try {
      setOtpModal((prev) => ({ ...prev, submitting: true }));
      setError(null);
      const result = await boothsApi.generateActivationOtp(boothCode);
      setOtpModal((prev) => ({
        ...prev,
        otp: result.otp,
        expiresAt: result.expiresAt,
        expiresAtLocal: result.expiresAtLocal || "",
        submitting: false,
      }));
    } catch (err: unknown) {
      setOtpModal((prev) => ({ ...prev, submitting: false }));
      setError(err instanceof Error ? err.message : "Không thể tạo OTP");
    }
  };

  const handleDurationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManageBooths) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const durationMinutes = Number(durationForm.durationMinutes);
    const displayOrder = durationForm.displayOrder.trim() === "" ? undefined : Number(durationForm.displayOrder);

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
    if (!canManageBooths) {
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

    if (!canManageBooths) {
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

  if (userLoading || loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
        <p className="mt-3 text-sm text-gray-600">Đang tải dữ liệu booth...</p>
      </div>
    );
  }

  if (!canViewPage) {
    return (
      <div className="py-12">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
          Bạn không có quyền truy cập quản lý booth.
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-6">
      {realtimeMessage && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          {realtimeMessage}
        </div>
      )}

      <div className="ui-page-header">
        <div>
          <h1 className="ui-page-title">Quản lý Booth</h1>
          <p className="ui-page-subtitle">
            Đổi trạng thái có ghi chú bắt buộc, lưu lịch sử thao tác theo thời gian.
          </p>
        </div>
      </div>

      <nav className="-mt-2 flex flex-wrap items-center gap-2" aria-label="Booth navigation">
        <Link
          href="/admin/booths"
          className="inline-flex items-center rounded-full bg-navy-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          Quản lý Booth
        </Link>
        <Link
          href="/admin/booths/schedule"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Lịch trình Booth
        </Link>
      </nav>

      <div className="-mt-2 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={loadBooths}
          className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Làm mới
        </button>
        {canManageBooths && (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo booth
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && canManageBooths && (
        <form
          onSubmit={handleFormSubmit}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {editingBooth ? "Cập nhật thông tin booth" : "Tạo booth mới"}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tên booth</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Ví dụ: Booth A01"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Booth code</label>
              <input
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none"
                placeholder="Ví dụ: BOOTH-A01"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vị trí</label>
              <input
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Ví dụ: Tầng 2 - Khu A"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Mô tả thêm về booth"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editingBooth ? "Lưu thay đổi" : "Tạo mới"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ngưỡng xác thực khuôn mặt</h2>
            <p className="text-sm text-gray-600">Áp dụng cho toàn bộ luồng check-in booth. Giá trị thấp hơn sẽ dễ pass hơn.</p>
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
              disabled={!canManageBooths || thresholdSubmitting}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100"
              placeholder="0.6"
            />

            <div className="md:col-span-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
              <p>
                Giá trị hiện tại: <span className="font-semibold">{thresholdConfig?.threshold ?? "-"}</span>
              </p>
              <p className="text-xs text-gray-500">
                Nguồn cấu hình: {thresholdConfig?.source ?? "-"} • Cập nhật lúc: {thresholdConfig?.updatedAt ? formatDateTime(thresholdConfig.updatedAt) : "-"}
              </p>
            </div>

            <div className="flex gap-2">
              {canManageBooths ? (
                <button
                  type="submit"
                  disabled={thresholdSubmitting}
                  className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
                >
                  {thresholdSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu ngưỡng
                </button>
              ) : (
                <span className="self-center text-xs text-gray-500">Chỉ ADMIN mới được chỉnh ngưỡng</span>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cấu hình thời lượng đặt booth</h2>
            <p className="text-sm text-gray-600">Admin có thể thêm, chỉnh sửa hoặc xóa các mốc thời gian khả dụng cho sinh viên.</p>
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

        {canManageBooths && (
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
        )}

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
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
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

                {canManageBooths && (
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Danh sách booth</h2>

          {booths.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              Chưa có booth nào.
            </p>
          ) : (
            <div className="space-y-2">
              {booths.map((booth) => {
                const isSelected = selectedBoothId === booth.id;

                return (
                  <div
                    key={booth.id}
                    className={`rounded-lg border p-3 transition ${
                      isSelected
                        ? "border-indigo-300 bg-indigo-50/40"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedBoothId(booth.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedBoothId(booth.id);
                          }
                        }}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{booth.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[booth.status]}`}>
                            {statusLabel[booth.status]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          Booth code: {booth.code || "Chưa đặt code"}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">{booth.location || "Chưa có vị trí"}</p>
                        {booth.description && (
                          <p className="mt-1 text-xs text-gray-500">{booth.description}</p>
                        )}
                      </div>

                      {canManageBooths && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openStatusModal(booth)}
                            className="inline-flex items-center rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                          >
                            <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
                            Đổi trạng thái
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(booth)}
                            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            aria-label={`Sửa booth ${booth.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openOtpModal(booth)}
                            className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50"
                            aria-label={`Tạo OTP cho booth ${booth.name}`}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBooth(booth)}
                            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50"
                            aria-label={`Xóa booth ${booth.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Lịch sử trạng thái</h2>
            {selectedBooth && (
              <button
                type="button"
                onClick={() => loadLogs(selectedBooth.id)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                Tải lại
              </button>
            )}
          </div>

          {!selectedBooth ? (
            <p className="text-sm text-gray-500">Chọn một booth để xem lịch sử thay đổi.</p>
          ) : logsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải lịch sử...
            </div>
          ) : logsError ? (
            <p className="text-sm text-red-600">{logsError}</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500">Booth này chưa có thay đổi trạng thái nào.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatDateTime(log.changedAt)}</span>
                    <span>|</span>
                    <span>{log.changedByUser?.name || log.changedByUser?.email || "Không rõ người thao tác"}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-800">
                    <span className="font-medium">{statusLabel[log.fromStatus]}</span>
                    <span className="mx-1">→</span>
                    <span className="font-medium">{statusLabel[log.toStatus]}</span>
                  </div>
                  {log.note && <p className="mt-1 text-sm text-gray-600">{log.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {statusModal.isOpen && statusModal.booth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Xác nhận đổi trạng thái</h3>
            <p className="mt-1 text-sm text-gray-600">
              Booth: <span className="font-medium">{statusModal.booth.name}</span>
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Trạng thái mới</label>
                <select
                  value={statusModal.nextStatus}
                  onChange={(e) =>
                    setStatusModal((prev) => ({ ...prev, nextStatus: e.target.value as BoothStatus }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ghi chú xác nhận</label>
                <textarea
                  value={statusModal.note}
                  onChange={(e) => setStatusModal((prev) => ({ ...prev, note: e.target.value }))}
                  rows={4}
                  placeholder="Nhập lý do đổi trạng thái (bắt buộc)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeStatusModal}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                disabled={statusModal.submitting}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitStatusChange}
                disabled={statusModal.submitting}
                className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
              >
                {statusModal.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận đổi trạng thái
              </button>
            </div>
          </div>
        </div>
      )}

      {otpModal.isOpen && otpModal.booth && canManageBooths && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Tạo OTP kích hoạt booth</h3>
            <p className="mt-1 text-sm text-gray-600">{otpModal.booth.name}</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Booth code</label>
                <input
                  value={otpModal.boothCode}
                  onChange={(e) =>
                    setOtpModal((prev) => ({ ...prev, boothCode: e.target.value.toUpperCase() }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none"
                  placeholder="BOOTH-A01"
                />
              </div>

              {otpModal.otp && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">OTP mới</p>
                  <p className="mt-1 text-xl font-bold text-emerald-800">{otpModal.otp}</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Hết hạn lúc: {otpModal.expiresAtLocal || formatDateTime(otpModal.expiresAt)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeOtpModal}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={submitGenerateOtp}
                disabled={otpModal.submitting}
                className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
              >
                {otpModal.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo OTP mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
