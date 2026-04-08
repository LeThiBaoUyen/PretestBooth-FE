"use client";

import Link from "next/link";
import { use } from "react";
import { AdminUsersPageContent } from "../../../../../../dashboard/users/page";

type StudentClassPageProps = {
  params: Promise<{
    cohort: string;
    className: string;
  }>;
};

export default function StudentClassPage({ params }: StudentClassPageProps) {
  const { cohort: cohortParam, className } = use(params);
  const cohort = Number(cohortParam);
  const decodedClassName = decodeURIComponent(className);
  const isValidCohort = Number.isInteger(cohort) && cohort > 0 && cohort <= 99;

  if (!isValidCohort) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Khóa không hợp lệ</h1>
          <p className="mt-1 text-sm text-slate-600">Không tìm thấy khóa bạn vừa chọn.</p>
          <Link
            href="/admin/student"
            className="mt-4 inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Quay lại trang quản lý sinh viên
          </Link>
        </div>
      </main>
    );
  }

  if (!decodedClassName.trim()) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Lớp không hợp lệ</h1>
          <p className="mt-1 text-sm text-slate-600">Không tìm thấy lớp bạn vừa chọn.</p>
          <Link
            href={`/admin/student/cohort/${cohort}`}
            className="mt-4 inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Quay lại danh sách lớp
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminUsersPageContent
          initialCohortFilter={cohort}
          initialClassFilter={decodedClassName}
          tableOnly
        />
      </div>
    </main>
  );
}
