"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/hooks";
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    try {
      await usersApi.updateUser(user.id, {
        name: form.name.trim() || undefined,
        className: form.className.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });
      alert("Đã cập nhật thông tin cá nhân");
    } catch (err: any) {
      alert(err?.message || "Không thể cập nhật thông tin");
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
    return <div className="p-8 text-center text-gray-500">Đang tải hồ sơ...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-700">Hồ sơ cá nhân</h1>
        <p className="text-gray-600 mt-2">Bạn có thể cập nhật thông tin cá nhân của mình tại đây.</p>
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input
              value={user.email}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Vai trò</label>
            <input
              value={user.role}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Họ tên</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Nhập họ tên"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Lớp học phần</label>
            <input
              value={form.className}
              onChange={(e) => setForm((prev) => ({ ...prev, className: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Nhập lớp học phần"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày sinh</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <h2 className="text-lg font-bold text-red-800">Vùng nguy hiểm</h2>
        <p className="text-sm text-red-700 mt-1">Xóa tài khoản sẽ xóa dữ liệu liên quan và không thể khôi phục.</p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="mt-4 inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {deleting ? "Đang xóa..." : "Xóa tài khoản"}
        </button>
      </div>
    </div>
  );
}
