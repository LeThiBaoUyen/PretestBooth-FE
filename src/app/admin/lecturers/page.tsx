"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import {
  usersApi,
  type LecturerListItem,
  type LecturerRoleItem,
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
  APPROVE_KYC: "Duyệt KYC thủ công",
  LECTURER_ADMIN: "Admin giảng viên",
};

const PERMISSION_ORDER: LecturerPermission[] = [
  "CREATE_EXAM",
  "REVIEW_QUESTION",
  "MANAGE_QUESTION_BANK",
  "MANAGE_STUDENTS",
  "MANAGE_BOOTHS",
  "MONITOR_SESSIONS",
  "APPROVE_KYC",
  "LECTURER_ADMIN",
];

type LecturerInfoForm = {
  email: string;
  name: string;
  password: string;
  isLocked: boolean;
  lockedReason: string;
};

export default function LecturerManagementPage() {
  const { user, userLoading } = useAuth();
  const canManageLecturers = hasPermission(user, "LECTURER_ADMIN");
  const canManageStudents = hasPermission(user, "MANAGE_STUDENTS");
  const canApproveKyc = hasPermission(user, "APPROVE_KYC");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingLecturer, setCreatingLecturer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lecturers, setLecturers] = useState<LecturerListItem[]>([]);
  const [assignablePermissions, setAssignablePermissions] = useState<LecturerPermission[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<LecturerRoleItem[]>([]);
  const [canGrantAdminPackage, setCanGrantAdminPackage] = useState(false);

  const [selectedLecturer, setSelectedLecturer] = useState<LecturerListItem | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<LecturerPermission[]>([]);
  const [draftRoleId, setDraftRoleId] = useState<string | null>(null);
  const [lecturerInfoForm, setLecturerInfoForm] = useState<LecturerInfoForm>({
    email: "",
    name: "",
    password: "",
    isLocked: false,
    lockedReason: "",
  });
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    password: "",
  });

  const permissionSet = useMemo(() => new Set(draftPermissions), [draftPermissions]);
  const selectedDraftRole = useMemo(() => {
    if (!draftRoleId) return null;

    const fromAssignable = assignableRoles.find((role) => role.id === draftRoleId);
    if (fromAssignable) return fromAssignable;

    if (selectedLecturer?.lecturerRole?.id === draftRoleId) {
      return selectedLecturer.lecturerRole;
    }

    return null;
  }, [assignableRoles, draftRoleId, selectedLecturer]);
  const selectedDraftRolePermissions = useMemo<LecturerPermission[]>(() => {
    if (!draftRoleId) return [];

    const fromAssignable = assignableRoles.find((role) => role.id === draftRoleId);
    if (fromAssignable) {
      return fromAssignable.permissions || [];
    }

    if (selectedLecturer?.lecturerRole?.id === draftRoleId) {
      return selectedLecturer.rolePermissions || [];
    }

    return [];
  }, [assignableRoles, draftRoleId, selectedLecturer]);

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
      setAssignableRoles(response.assignableRoles || []);
      setCanGrantAdminPackage(Boolean(response.canGrantAdminPackage));
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách giảng viên");
      setLecturers([]);
      setAssignableRoles([]);
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
    setDraftPermissions(lecturer.individualPermissions || lecturer.permissions || []);
    setDraftRoleId(lecturer.lecturerRole?.id || null);
    setLecturerInfoForm({
      email: lecturer.email || "",
      name: lecturer.name || "",
      password: "",
      isLocked: Boolean(lecturer.isLocked),
      lockedReason: lecturer.lockedReason || "",
    });
  };

  const closeEditor = () => {
    setSelectedLecturer(null);
    setDraftPermissions([]);
    setDraftRoleId(null);
    setLecturerInfoForm({
      email: "",
      name: "",
      password: "",
      isLocked: false,
      lockedReason: "",
    });
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

    const currentRoleId = selectedLecturer.lecturerRole?.id || null;
    const currentIndividualPermissions = (
      selectedLecturer.individualPermissions || []
    ).slice().sort();
    const nextIndividualPermissions = draftPermissions.slice().sort();
    const roleChanged = currentRoleId !== draftRoleId;
    const permissionChanged =
      currentIndividualPermissions.length !== nextIndividualPermissions.length ||
      currentIndividualPermissions.some((item, index) => item !== nextIndividualPermissions[index]);

    if (!roleChanged && !permissionChanged) {
      closeEditor();
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (roleChanged) {
        await usersApi.assignLecturerRole(selectedLecturer.id, {
          roleId: draftRoleId,
        });
      }

      if (permissionChanged) {
        await usersApi.updateLecturerPermissions(selectedLecturer.id, {
          permissions: draftPermissions,
        });
      }

      await loadLecturers();
      closeEditor();
    } catch (err: any) {
      setError(err?.message || "Không thể cập nhật quyền giảng viên");
    } finally {
      setSaving(false);
    }
  };

  const saveLecturerInfo = async () => {
    if (!selectedLecturer) return;

    const nextEmail = lecturerInfoForm.email.trim().toLowerCase();
    const nextName = lecturerInfoForm.name.trim();
    const nextPassword = lecturerInfoForm.password.trim();
    const nextLockedReason = lecturerInfoForm.lockedReason.trim();

    if (!nextEmail || !nextName) {
      setError("Vui lòng nhập đầy đủ email và họ tên giảng viên.");
      return;
    }

    if (nextPassword && nextPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await usersApi.updateLecturer(selectedLecturer.id, {
        email: nextEmail,
        name: nextName,
        ...(nextPassword ? { password: nextPassword } : {}),
        isLocked: lecturerInfoForm.isLocked,
        lockedReason: lecturerInfoForm.isLocked ? nextLockedReason || undefined : undefined,
      });

      await loadLecturers();
      closeEditor();
    } catch (err: any) {
      setError(err?.message || "Không thể cập nhật thông tin giảng viên");
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
                Gán vai trò cho giảng viên và cấp quyền lẻ bổ sung theo nhu cầu thực tế.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {canManageStudents && (
                  <Link
                    href="/admin/student"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Quản lý sinh viên
                  </Link>
                )}

                {canApproveKyc && (
                  <Link
                    href="/admin/kyc"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Duyệt KYC thủ công
                  </Link>
                )}

                <Link
                  href="/admin/lecturers"
                  className="inline-flex items-center rounded-full bg-navy-600 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Quản lý giảng viên
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/admin/access-control"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Phân quyền hệ thống
              </Link>
              <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {canGrantAdminPackage ? "Có quyền cấp admin package" : "Chỉ cấp quyền thấp hơn"}
              </div>
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
                    <th className="px-3 py-2 font-semibold text-slate-700">Vai trò</th>
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
                        {lecturer.lecturerRole ? (
                          <div className="inline-flex flex-col gap-1">
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              {lecturer.lecturerRole.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              Priority {lecturer.lecturerRole.priority}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            Chưa gán vai trò
                          </span>
                        )}
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
                          Sửa thông tin
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
                <h2 className="text-lg font-bold text-slate-900">Sửa thông tin giảng viên</h2>
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

            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-800">Thông tin cơ bản</p>
                <p className="text-xs text-slate-600">
                  Cập nhật email, tên hiển thị, trạng thái khóa và mật khẩu khởi tạo nếu cần.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </span>
                  <input
                    type="email"
                    value={lecturerInfoForm.email}
                    onChange={(event) =>
                      setLecturerInfoForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Họ tên
                  </span>
                  <input
                    value={lecturerInfoForm.name}
                    onChange={(event) =>
                      setLecturerInfoForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mật khẩu mới
                  </span>
                  <input
                    type="password"
                    value={lecturerInfoForm.password}
                    onChange={(event) =>
                      setLecturerInfoForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Để trống nếu không đổi"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Trạng thái
                  </span>
                  <select
                    value={lecturerInfoForm.isLocked ? "LOCKED" : "ACTIVE"}
                    onChange={(event) =>
                      setLecturerInfoForm((current) => ({
                        ...current,
                        isLocked: event.target.value === "LOCKED",
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="LOCKED">Bị khóa</option>
                  </select>
                </label>
              </div>

              <label className="mt-3 block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Lý do khóa
                </span>
                <textarea
                  value={lecturerInfoForm.lockedReason}
                  onChange={(event) =>
                    setLecturerInfoForm((current) => ({
                      ...current,
                      lockedReason: event.target.value,
                    }))
                  }
                  disabled={!lecturerInfoForm.isLocked}
                  placeholder="Chỉ dùng khi khóa tài khoản"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
              </label>

              {selectedLecturer.isLocked && selectedLecturer.lockedReason && (
                <p className="mt-2 text-xs text-red-600">
                  Lý do khóa hiện tại: {selectedLecturer.lockedReason}
                </p>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={saveLecturerInfo}
                  disabled={saving}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Lưu thông tin
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">Vai trò mặc định</p>
              <p className="mb-2 text-xs text-slate-600">
                Mỗi giảng viên chỉ có một vai trò. Quyền hiệu lực = quyền từ vai trò + quyền gán lẻ.
              </p>
              <select
                value={draftRoleId || ""}
                onChange={(event) => setDraftRoleId(event.target.value || null)}
                disabled={saving}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:max-w-lg"
              >
                <option value="">Không gán vai trò</option>
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.code}) - Priority {role.priority}
                  </option>
                ))}
              </select>

              {selectedDraftRole && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedDraftRolePermissions.map((permission) => (
                    <span
                      key={`role-permission-${permission}`}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                    >
                      {PERMISSION_LABELS[permission]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-800">Quyền gán lẻ</p>
              <p className="text-xs text-slate-600">
                Các quyền bên dưới chỉ là quyền bổ sung riêng cho giảng viên này.
              </p>
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
                Lưu thay đổi
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
