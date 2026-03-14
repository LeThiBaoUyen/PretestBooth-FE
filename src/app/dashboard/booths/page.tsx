"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks";
import { boothsApi } from "@/lib/api/booths";
import type { Booth } from "@/lib/api/types";
import { 
  MonitorPlay, 
  Settings, 
  PowerOff, 
  Plus,
  Pencil,
  Trash2,
  X,
  Wrench,
  Clock3,
  Save,
} from "lucide-react";

export default function AdminBoothsPage() {
  const { user, userLoading } = useAuth();
  
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBooth, setEditingBooth] = useState<Booth | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const canViewPage = user?.role === "ADMIN" || user?.role === "LECTURER";
  const canManageBooths = user?.role === "ADMIN";
  
  const activeCount = booths.filter((b) => b.status === "ACTIVE").length;
  const maintenanceCount = booths.filter((b) => b.status === "MAINTENANCE").length;
  const inactiveCount = booths.filter((b) => b.status === "INACTIVE").length;

  const resetForm = () => {
    setFormName("");
    setFormLocation("");
    setFormDescription("");
  };

  const openCreateModal = () => {
    resetForm();
    setEditingBooth(null);
    setShowCreateModal(true);
  };

  const openEditModal = (booth: Booth) => {
    setEditingBooth(booth);
    setFormName(booth.name || "");
    setFormLocation(booth.location || "");
    setFormDescription(booth.description || "");
    setShowCreateModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setEditingBooth(null);
    resetForm();
  };

  const fetchBooths = async () => {
    setLoading(true);
    setError(null);
    try {
      const boothsRes = await boothsApi.getBooths();
      setBooths(Array.isArray(boothsRes) ? boothsRes : []);
    } catch (e) {
      console.error(e);
      setError("Không thể tải dữ liệu booth. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewPage) {
      fetchBooths();
    }
  }, [canViewPage]);

  const handleSaveBooth = async () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      alert("Tên booth không được để trống.");
      return;
    }

    setSaving(true);
    try {
      if (editingBooth) {
        await boothsApi.updateBooth(editingBooth.id, {
          name: trimmedName,
          location: formLocation.trim() || null,
          description: formDescription.trim() || null,
        });
      } else {
        await boothsApi.createBooth({
          name: trimmedName,
          location: formLocation.trim() || undefined,
          description: formDescription.trim() || undefined,
        });
      }

      closeModal();
      fetchBooths();
    } catch (err: any) {
      alert(err.message || "Không thể lưu booth.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBoothStatus = async (booth: Booth) => {
    if (!canManageBooths) return;

    const newStatus = booth.status === "ACTIVE" ? "MAINTENANCE" : 
                     booth.status === "MAINTENANCE" ? "INACTIVE" : "ACTIVE";
    try {
      await boothsApi.updateBooth(booth.id, { status: newStatus });
      fetchBooths();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBooth = async (booth: Booth) => {
    if (!canManageBooths) return;
    if (!confirm(`Xóa booth \"${booth.name}\"?`)) return;

    setDeletingId(booth.id);
    try {
      await boothsApi.deleteBooth(booth.id);
      fetchBooths();
    } catch (err: any) {
      alert(err.message || "Không thể xóa booth.");
    } finally {
      setDeletingId(null);
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
          Bạn không có quyền truy cập trang quản lý booth.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-700">Quản lý Booth chuyên sâu</h1>
          <p className="text-gray-600 mt-2">Tạo mới, đổi tên, cập nhật thông tin và điều phối trạng thái vận hành booth.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/booths/schedule"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Clock3 className="h-4 w-4 mr-2" />
            Lịch trình Booth
          </Link>

          {canManageBooths && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tạo booth mới
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase text-emerald-700">Hoạt động</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-bold uppercase text-orange-700">Bảo trì</p>
          <p className="mt-2 text-3xl font-bold text-orange-700">{maintenanceCount}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold uppercase text-red-700">Ngưng hoạt động</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{inactiveCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-700 flex items-center">
            <Wrench className="h-5 w-5 mr-2" />
            Danh sách booth
          </h2>
          <button
            onClick={fetchBooths}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Tải lại
          </button>
        </div>

        {loading ? (
          <div className="text-center py-14 text-gray-500">Đang tải dữ liệu booth...</div>
        ) : error ? (
          <div className="text-center py-14 text-red-500">{error}</div>
        ) : booths.length === 0 ? (
          <div className="text-center py-14 text-gray-500">Chưa có booth nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Booth</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Vị trí</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Mô tả</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500">Trạng thái</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {booths.map((booth) => (
                  <tr key={booth.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{booth.name}</p>
                      <p className="text-xs text-slate-500 mt-1">ID: {booth.id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{booth.location || "--"}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 max-w-xs truncate">{booth.description || "--"}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleBoothStatus(booth)}
                        disabled={!canManageBooths}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition disabled:opacity-60 ${
                          booth.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : booth.status === "MAINTENANCE"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {booth.status === "ACTIVE" ? <MonitorPlay className="h-3.5 w-3.5 mr-1" /> : booth.status === "MAINTENANCE" ? <Settings className="h-3.5 w-3.5 mr-1" /> : <PowerOff className="h-3.5 w-3.5 mr-1" />}
                        {booth.status === "ACTIVE" ? "HOẠT ĐỘNG" : booth.status === "MAINTENANCE" ? "BẢO TRÌ" : "NGƯNG"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(booth)}
                          disabled={!canManageBooths}
                          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteBooth(booth)}
                          disabled={!canManageBooths || deletingId === booth.id}
                          className="inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          {deletingId === booth.id ? "Đang xóa" : "Xóa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingBooth ? "Cập nhật booth" : "Tạo booth mới"}
              </h3>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Tên booth</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                  placeholder="Nhập tên booth"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Vị trí</label>
                <input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                  placeholder="Ví dụ: Khu A - Tầng 2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Mô tả</label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                  placeholder="Thông tin cấu hình booth, ghi chú bảo trì..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveBooth}
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
