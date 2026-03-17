"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { boothsApi } from "@/lib/api/booths";
import { useAuth } from "@/lib/hooks";
import type { Booth, BoothStatus, BoothStatusLog } from "@/lib/api/types";

const STATUS_OPTIONS: BoothStatus[] = ["ACTIVE", "MAINTENANCE", "INACTIVE"];

interface BoothFormData {
  name: string;
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

const emptyForm: BoothFormData = {
  name: "",
  location: "",
  description: "",
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

  const selectedBooth = useMemo(
    () => booths.find((booth) => booth.id === selectedBoothId) ?? null,
    [booths, selectedBoothId],
  );

  const canViewPage = user?.role === "ADMIN" || user?.role === "LECTURER";
  const canManageBooths = user?.role === "ADMIN";

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
    }
  }, [canViewPage]);

  useEffect(() => {
    if (!selectedBoothId) {
      setLogs([]);
      return;
    }

    loadLogs(selectedBoothId);
  }, [selectedBoothId]);

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
          location: formData.location.trim() || null,
          description: formData.description.trim() || null,
        });
      } else {
        await boothsApi.createBooth({
          name: formData.name,
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
    <div className="py-8 space-y-6">
      <nav className="mb-4 flex flex-wrap items-center gap-2" aria-label="Booth navigation">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy-700">Quản lý Booth</h1>
          <p className="text-sm text-gray-600 mt-1">
            Đổi trạng thái có ghi chú bắt buộc, lưu lịch sử thao tác theo thời gian.
          </p>
        </div>

        <div className="flex gap-2">
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
    </div>
  );
}
