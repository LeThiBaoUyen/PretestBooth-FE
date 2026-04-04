"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { usersApi, type LecturerListItem } from "@/lib/api/users";
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

export default function LecturerManagementPage() {
  const { user, userLoading } = useAuth();
  const canManageLecturers = hasPermission(user, "LECTURER_ADMIN");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingLecturer, setCreatingLecturer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lecturers, setLecturers] = useState<LecturerListItem[]>([]);
  const [assignablePermissions, setAssignablePermissions] = useState<LecturerPermission[]>([]);
  const [canGrantAdminPackage, setCanGrantAdminPackage] = useState(false);

  const [selectedLecturer, setSelectedLecturer] = useState<LecturerListItem | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<LecturerPermission[]>([]);
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    password: "",
  });

  const permissionSet = useMemo(() => new Set(draftPermissions), [draftPermissions]);

  const loadLecturers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await usersApi.getLecturers({
        page: 1,
        limit: 100,
        search: search.trim() || undefined,
        sortOrder: "desc",
      });

      setLecturers(response.data || []);
      setAssignablePermissions(response.assignablePermissions || []);
      setCanGrantAdminPackage(Boolean(response.canGrantAdminPackage));
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách giảng viên");
      setLecturers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canManageLecturers) return;
    void loadLecturers();
  }, [canManageLecturers, search]);

  const openEditor = (lecturer: LecturerListItem) => {
    setSelectedLecturer(lecturer);
    setDraftPermissions(lecturer.permissions || []);
  };

  const closeEditor = () => {
    setSelectedLecturer(null);
    setDraftPermissions([]);
  };

  const togglePermission = (permission: LecturerPermission) => {
    if (permission === "LECTURER_ADMIN" && !canGrantAdminPackage) return;

    setDraftPermissions((current) => {
      if (current.includes(permission)) {
        return current.filter((item) => item !== permission);
      }
      return [...current, permission];
    });
  };

  const savePermissions = async () => {
    if (!selectedLecturer) return;

    try {
      setSaving(true);
      setError(null);
      await usersApi.updateLecturerPermissions(selectedLecturer.id, {
        permissions: draftPermissions,
      });

      await loadLecturers();
      closeEditor();
    } catch (err: any) {
      setError(err?.message || "Không thể cập nhật quyền giảng viên");
    } finally {
      setSaving(false);
    }
  };

  const createLecturer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = createForm.email.trim().toLowerCase();
    const name = createForm.name.trim();
    const password = createForm.password.trim();

    if (!email || !name || !password) {
      setError("Vui lòng nhập đầy đủ email, tên giảng viên và mật khẩu.");
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu giảng viên phải có ít nhất 8 ký tự.");
      return;
    }

    try {
      setCreatingLecturer(true);
      setError(null);

      const response = await usersApi.createLecturer({
        email,
        name,
        password,
      });

      alert(response?.message || "Tạo tài khoản giảng viên thành công.");
      setCreateForm({ email: "", name: "", password: "" });
      await loadLecturers();
    } catch (err: any) {
      setError(err?.message || "Không thể tạo tài khoản giảng viên");
    } finally {
      setCreatingLecturer(false);
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

  if (!canManageLecturers) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-white p-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm text-slate-600">
            Bạn cần quyền Admin giảng viên để quản lý phân quyền cho giảng viên khác.
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
              <h1 className="ui-page-title">Quản lý giảng viên</h1>
              <p className="ui-page-subtitle">
                Cấp quyền lẻ cho từng giảng viên và quản lý quyền admin giảng viên theo phân cấp.
              </p>
            </div>
            <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {canGrantAdminPackage ? "Có quyền cấp admin package" : "Chỉ cấp quyền thấp hơn"}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900">Tạo tài khoản giảng viên</h2>
            <p className="text-sm text-slate-600">
              Tạo giảng viên mới với mật khẩu khởi tạo do bạn thiết lập. Sau khi tạo, có thể phân quyền ngay trong bảng bên dưới.
            </p>
          </div>

          <form onSubmit={createLecturer} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="email"
              value={createForm.email}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="Email giảng viên"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Họ tên giảng viên"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Mật khẩu khởi tạo (>= 8 ký tự)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              minLength={8}
              required
            />

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={creatingLecturer}
                className="inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
              >
                {creatingLecturer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {creatingLecturer ? "Đang tạo tài khoản..." : "Tạo giảng viên"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center text-sm font-semibold text-slate-700">
              <Users className="mr-2 h-4 w-4" />
              Danh sách giảng viên
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email giảng viên"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:max-w-sm"
            />
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
          ) : lecturers.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">Không có giảng viên phù hợp.</div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700">Giảng viên</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Quyền hiện có</th>
                    <th className="px-3 py-2 font-semibold text-slate-700 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lecturers.map((lecturer) => (
                    <tr key={lecturer.id}>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">{lecturer.name || "Chưa cập nhật"}</p>
                        <p className="text-xs text-slate-500">{lecturer.email}</p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(lecturer.permissions || []).length === 0 ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              Chưa có quyền
                            </span>
                          ) : (
                            lecturer.permissions.map((permission) => (
                              <span
                                key={`${lecturer.id}-${permission}`}
                                className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-semibold text-navy-700"
                              >
                                {PERMISSION_LABELS[permission]}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(lecturer)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Phân quyền
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedLecturer && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Phân quyền giảng viên</h2>
                <p className="text-sm text-slate-600">{selectedLecturer.name || selectedLecturer.email}</p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {PERMISSION_ORDER.map((permission) => {
                const checked = permissionSet.has(permission);
                const isAssignable = assignablePermissions.includes(permission);
                const disabled = !isAssignable || saving;

                return (
                  <label
                    key={permission}
                    className={`flex items-start rounded-lg border px-3 py-2 text-sm ${
                      disabled ? "border-slate-200 bg-slate-50 text-slate-400" : "border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => togglePermission(permission)}
                      className="mt-1 mr-3"
                    />
                    <span>
                      <span className="block font-semibold">{PERMISSION_LABELS[permission]}</span>
                      {!isAssignable && (
                        <span className="block text-xs">
                          Quyền này chỉ ADMIN gốc mới có thể cấp.
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={savePermissions}
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Lưu quyền
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
