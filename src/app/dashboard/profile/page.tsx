"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw, Save, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { kycApi } from "@/lib/api/kyc";
import { usersApi } from "@/lib/api/users";

type ProfileForm = {
  name: string;
  className: string;
  dateOfBirth: string;
};

export default function DashboardProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<"NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED" | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    className: "",
    dateOfBirth: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const profile = await usersApi.getUser(user.id);
        setForm({
          name: profile.name || "",
          className: profile.className || "",
          dateOfBirth: profile.dateOfBirth
            ? new Date(profile.dateOfBirth).toISOString().slice(0, 10)
            : "",
        });
      } catch {
        // ignore and keep defaults
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    const loadKycStatus = async () => {
      if (!user || user.role !== "STUDENT") return;
      try {
        const status = await kycApi.getStatus();
        setKycStatus(status.kycStatus);
      } catch {
        setKycStatus(null);
      }
    };

    void loadKycStatus();
  }, [user]);

  const getKycStatusLabel = () => {
    if (kycStatus === "VERIFIED") return "Đã xác minh";
    if (kycStatus === "PENDING") return "Đang chờ xử lý";
    if (kycStatus === "REJECTED") return "Cần xác thực lại";
    if (kycStatus === "NOT_STARTED") return "Chưa xác thực";
    return "Không xác định";
  };

  const getKycStatusClassName = () => {
    if (kycStatus === "VERIFIED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (kycStatus === "PENDING") return "bg-amber-50 text-amber-700 border-amber-200";
    if (kycStatus === "REJECTED") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setSubmitMessage(null);
    setSubmitError(null);
    try {
      await usersApi.updateUser(user.id, {
        name: form.name.trim() || undefined,
        className: form.className.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });
      setSubmitMessage("Đã cập nhật thông tin cá nhân.");
    } catch (err: any) {
      setSubmitError(err?.message || "Không thể cập nhật thông tin.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    if (!confirm("Bạn chắc chắn muốn xóa tài khoản của mình? Hành động này không thể hoàn tác.")) return;

    setDeleting(true);
    try {
      await usersApi.deleteUser(user.id);
      await logout();
      router.push("/login");
    } catch (err: any) {
      alert(err?.message || "Không thể xóa tài khoản");
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="pb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-gray-500 shadow-sm">
          Đang tải hồ sơ...
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-6">
      <div className="ui-page-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="ui-page-title">Hồ sơ cá nhân</h1>
            <p className="ui-page-subtitle">
              Cập nhật thông tin cơ bản để đồng bộ với các tính năng trong hệ thống.
            </p>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-navy-50 px-3 py-1 text-xs font-bold text-navy-700">
            Vai trò: {user.role}
          </span>
        </div>
      </div>

      {submitMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {submitMessage}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <form
          onSubmit={handleSave}
          className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
            <UserRound className="h-4 w-4" />
            Thông tin có thể chỉnh sửa
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Họ tên</label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nhập họ tên"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Lớp học phần</label>
              <input
                value={form.className}
                onChange={(e) => setForm((prev) => ({ ...prev, className: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nhập lớp học phần"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày sinh</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-60"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Thông tin tài khoản</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Email</p>
                <p className="font-semibold text-slate-800 break-all">{user.email}</p>
              </div>
              <div>
                <p className="text-slate-500">Vai trò</p>
                <p className="font-semibold text-slate-800">{user.role}</p>
              </div>
            </div>
          </div>

          {user.role === "STUDENT" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Xác thực KYC</h2>
              <p className="mt-1 text-sm text-slate-600">
                Bạn có thể chủ động xác thực lại khuôn mặt/thẻ sinh viên khi ảnh cũ không còn phù hợp.
              </p>

              <div className={`mt-3 inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${getKycStatusClassName()}`}>
                Trạng thái: {getKycStatusLabel()}
              </div>

              <button
                type="button"
                onClick={() => router.push("/dashboard/kyc")}
                className="mt-4 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Xác thực lại KYC
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-red-800">
              <ShieldAlert className="h-5 w-5" />
              Vùng nguy hiểm
            </h2>
            <p className="mt-1 text-sm text-red-700">
              Xóa tài khoản sẽ xóa dữ liệu liên quan và không thể khôi phục.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="mt-4 inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Đang xóa..." : "Xóa tài khoản"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
