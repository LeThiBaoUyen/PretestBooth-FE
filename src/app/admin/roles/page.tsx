"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import {
  usersApi,
  type CreateLecturerRolePayload,
  type LecturerRoleItem,
  type UpdateLecturerRolePayload,
} from "@/lib/api/users";
import type { LecturerPermission } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";

const PERMISSION_LABELS: Record<LecturerPermission, string> = {
  CREATE_EXAM: "Tạo/Cập nhật đề thi",
  REVIEW_QUESTION: "Review câu hỏi",
  MANAGE_QUESTION_BANK: "Quản lý ngân hàng câu hỏi",
  MANAGE_STUDENTS: "Quản lý sinh viên",
  MANAGE_BOOTHS: "Quản lý booth",
  MONITOR_SESSIONS: "Giám sát phiên thi/booth",
  LECTURER_ADMIN: "Admin giảng viên",
};

const PERMISSION_ORDER: LecturerPermission[] = [
  "CREATE_EXAM",
  "REVIEW_QUESTION",
  "MANAGE_QUESTION_BANK",
  "MANAGE_STUDENTS",
  "MANAGE_BOOTHS",
  "MONITOR_SESSIONS",
  "LECTURER_ADMIN",
];

type RoleFormState = {
  code: string;
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  permissions: LecturerPermission[];
};

const DEFAULT_FORM: RoleFormState = {
  code: "",
  name: "",
  description: "",
  priority: 1,
  isActive: true,
  permissions: [],
};

function toCreatePayload(form: RoleFormState): CreateLecturerRolePayload {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    priority: Number(form.priority),
    isActive: form.isActive,
    permissions: form.permissions,
  };
}

function toUpdatePayload(form: RoleFormState): UpdateLecturerRolePayload {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    priority: Number(form.priority),
    isActive: form.isActive,
    permissions: form.permissions,
  };
}

function roleToFormState(role: LecturerRoleItem): RoleFormState {
  return {
    code: role.code,
    name: role.name,
    description: role.description || "",
    priority: role.priority,
    isActive: role.isActive,
    permissions: role.permissions || [],
  };
}

export default function LecturerRolesPage() {
  const { user, userLoading } = useAuth();
  const canAccess = hasPermission(user, "LECTURER_ADMIN");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [roles, setRoles] = useState<LecturerRoleItem[]>([]);
  const [createForm, setCreateForm] = useState<RoleFormState>(DEFAULT_FORM);
  const [editingRole, setEditingRole] = useState<LecturerRoleItem | null>(null);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)),
    [roles],
  );

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.getLecturerRoles({
        page: 1,
        limit: 100,
        sortOrder: "asc",
      });

      setRoles(response.data || []);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh mục vai trò giảng viên");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    void loadRoles();
  }, [canAccess]);

  const toggleCreatePermission = (permission: LecturerPermission) => {
    setCreateForm((current) => {
      if (current.permissions.includes(permission)) {
        return {
          ...current,
          permissions: current.permissions.filter((item) => item !== permission),
        };
      }

      return {
        ...current,
        permissions: [...current.permissions, permission],
      };
    });
  };

  const resetRoleForm = () => {
    setEditingRole(null);
    setCreateForm(DEFAULT_FORM);
  };

  const handleCreateRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    if (!createForm.code.trim() || !createForm.name.trim()) {
      setError("Vui lòng nhập mã và tên vai trò.");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      if (editingRole) {
        const payload = toUpdatePayload(createForm);
        const response = await usersApi.updateLecturerRole(editingRole.id, payload);
        setSuccessMessage(response.message || "Cập nhật vai trò thành công.");
      } else {
        const payload = toCreatePayload(createForm);
        const response = await usersApi.createLecturerRole(payload);
        setSuccessMessage(response.message || "Tạo vai trò thành công.");
      }

      resetRoleForm();
      await loadRoles();
    } catch (err: any) {
      setError(err?.message || "Không thể lưu vai trò giảng viên");
    } finally {
      setCreating(false);
    }
  };

  const startEditRole = (role: LecturerRoleItem) => {
    setSuccessMessage(null);
    setError(null);
    setEditingRole(role);
    setCreateForm(roleToFormState(role));
  };

  const handleDeleteRole = async (role: LecturerRoleItem) => {
    const shouldDelete = window.confirm(
      `Bạn có chắc muốn xóa vai trò ${role.name}? Hành động này không thể hoàn tác.`,
    );
    if (!shouldDelete) return;

    try {
      setDeletingRoleId(role.id);
      setError(null);
      setSuccessMessage(null);

      const response = await usersApi.deleteLecturerRole(role.id);
      setSuccessMessage(response.message || "Đã xóa vai trò.");

      if (editingRole?.id === role.id) {
        resetRoleForm();
      }

      await loadRoles();
    } catch (err: any) {
      setError(err?.message || "Không thể xóa vai trò giảng viên");
    } finally {
      setDeletingRoleId(null);
    }
  };

  if (userLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          <p className="mt-2 text-sm">Đang tải quyền truy cập...</p>
        </div>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-white p-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm text-slate-600">
            Bạn cần quyền Admin giảng viên để quản lý danh mục vai trò.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
          >
            Quay về dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="ui-page-header">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="ui-page-title">Danh mục vai trò giảng viên</h1>
              <p className="ui-page-subtitle">
                Quản lý vai trò hệ thống theo priority. Vai trò priority nhỏ hơn sẽ có quyền quản lý cao hơn.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/lecturers"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Quản lý giảng viên
                </Link>
                <Link
                  href="/admin/access-control"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Ma trận quyền
                </Link>
                <Link
                  href="/admin/roles"
                  className="inline-flex items-center rounded-full bg-navy-600 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Danh mục vai trò
                </Link>
              </div>
            </div>
            <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Quản trị phân cấp theo priority
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr,1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Danh sách vai trò</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {sortedRoles.length} vai trò
              </span>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
            ) : sortedRoles.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">Chưa có vai trò nào.</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">Vai trò</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Priority</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Quyền</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedRoles.map((role) => (
                      <tr key={role.id}>
                        <td className="px-3 py-2 align-top">
                          <p className="font-semibold text-slate-900">{role.name}</p>
                          <p className="text-xs text-slate-500">{role.code}</p>
                          {!role.isActive && (
                            <span className="mt-1 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-sm font-semibold text-slate-700">
                          {role.priority}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex max-w-md flex-wrap gap-1.5">
                            {role.permissions.length === 0 ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                Không có quyền
                              </span>
                            ) : (
                              role.permissions.map((permission) => (
                                <span
                                  key={`${role.id}-${permission}`}
                                  className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-semibold text-navy-700"
                                >
                                  {PERMISSION_LABELS[permission]}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right align-top">
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditRole(role)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role)}
                              disabled={deletingRoleId === role.id}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingRoleId === role.id ? "Đang xóa..." : "Xóa"}
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

          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {editingRole ? "Chỉnh sửa vai trò" : "Tạo vai trò mới"}
                </h2>
                {editingRole && (
                  <button
                    type="button"
                    onClick={resetRoleForm}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>
              {editingRole && (
                <p className="mb-3 text-xs text-slate-500">
                  Đang chỉnh sửa: {editingRole.name} ({editingRole.code})
                </p>
              )}
              <form onSubmit={handleCreateRole} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={createForm.code}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, code: event.target.value }))
                    }
                    placeholder="Mã vai trò (VD: LECTURER_MANAGER)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                  <input
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Tên vai trò"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>

                <textarea
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Mô tả vai trò"
                  className="min-h-[84px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-semibold">Priority</span>
                    <input
                      type="number"
                      min={1}
                      value={createForm.priority}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          priority: Number(event.target.value || 1),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Số càng nhỏ thì quyền quản lý càng cao. Mặc định là 1.
                    </p>
                  </label>

                  <div className="space-y-1 text-sm text-slate-700">
                    <span className="font-semibold">Trạng thái</span>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={createForm.isActive}
                        onChange={(event) =>
                          setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
                        }
                      />
                      <span>Đang hoạt động</span>
                    </label>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-800">Quyền của vai trò</p>
                  <div className="grid grid-cols-1 gap-2">
                    {PERMISSION_ORDER.map((permission) => {
                      const checked = createForm.permissions.includes(permission);
                      return (
                        <label
                          key={`create-${permission}`}
                          className="flex items-start rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCreatePermission(permission)}
                            className="mt-1 mr-3"
                          />
                          <span className="font-semibold text-slate-800">{PERMISSION_LABELS[permission]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : editingRole ? (
                    <Save className="mr-2 h-4 w-4" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {creating
                    ? "Đang lưu..."
                    : editingRole
                      ? "Lưu chỉnh sửa"
                      : "Tạo vai trò"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-800">Lưu ý vận hành</p>
          <p className="mt-1">
            Vai trò chỉ định quyền mặc định cho giảng viên. Quyền gán lẻ ở trang quản lý giảng viên sẽ được cộng thêm vào quyền từ vai trò.
          </p>
        </div>
      </div>
    </main>
  );
}
