"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Shield, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { getEffectivePermissions, hasPermission } from "@/lib/auth/permissions";
import type { LecturerPermission } from "@/lib/api/types";

const PERMISSION_DESCRIPTIONS: Array<{ key: LecturerPermission; label: string; description: string }> = [
  {
    key: "CREATE_EXAM",
    label: "Tạo/Cập nhật đề thi",
    description: "Cho phép tạo đề thi mới, chỉnh sửa và chấm điểm các phiên thi.",
  },
  {
    key: "REVIEW_QUESTION",
    label: "Review câu hỏi",
    description: "Cho phép truy cập module review định kỳ và duyệt trạng thái câu hỏi.",
  },
  {
    key: "MANAGE_QUESTION_BANK",
    label: "Quản lý ngân hàng câu hỏi",
    description: "Cho phép quản lý subject/topic/question và import ngân hàng câu hỏi.",
  },
  {
    key: "MANAGE_STUDENTS",
    label: "Quản lý sinh viên",
    description: "Cho phép CRUD tài khoản sinh viên, lock/unlock, import/export danh sách.",
  },
  {
    key: "MANAGE_BOOTHS",
    label: "Quản lý booth",
    description: "Cho phép CRUD booth, lịch vận hành và tạo OTP kích hoạt booth.",
  },
  {
    key: "LECTURER_ADMIN",
    label: "Admin giảng viên",
    description:
      "Cho phép cấp các quyền thấp hơn cho giảng viên khác. Chỉ ADMIN gốc mới được cấp quyền này.",
  },
];

export default function AccessControlPage() {
  const { user, userLoading } = useAuth();
  const canAccess = hasPermission(user, "LECTURER_ADMIN");
  const effectivePermissions = useMemo(() => getEffectivePermissions(user), [user]);

  if (userLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          Đang tải cấu hình phân quyền...
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
            Trang này chỉ dành cho ADMIN gốc hoặc giảng viên có quyền admin.
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
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="ui-page-header">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="ui-page-title">Phân quyền hệ thống</h1>
              <p className="ui-page-subtitle">
                Theo dõi ma trận quyền giảng viên và quy tắc phân cấp cấp quyền.
              </p>
            </div>
            <Link
              href="/admin/lecturers"
              className="inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Đi tới quản lý giảng viên
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Quy tắc phân cấp hiện tại</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>1. ADMIN gốc có toàn quyền và là bên duy nhất được cấp/revoke quyền admin giảng viên.</li>
            <li>
              2. Giảng viên có quyền admin chỉ được cấp các quyền thấp hơn, không thể cấp quyền admin giảng viên.
            </li>
            <li>3. Giảng viên không có quyền nào sẽ không truy cập được các module quản trị tương ứng.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center text-sm font-semibold text-slate-700">
            <Shield className="mr-2 h-4 w-4" />
            Quyền hiệu lực của bạn
          </div>
          <div className="flex flex-wrap gap-2">
            {effectivePermissions.length === 0 ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Chưa có quyền</span>
            ) : (
              effectivePermissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                >
                  {permission}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Permission</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Mô tả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PERMISSION_DESCRIPTIONS.map((item) => (
                <tr key={item.key}>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-700">
                      {item.key}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">{item.label}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
