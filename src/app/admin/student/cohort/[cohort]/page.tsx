"use client";

import Link from "next/link";
import { AdminUsersPageContent } from "../../../../dashboard/users/page";
import { buildClassNamesByCohort, COHORTS } from "../../cohort-config";

type CohortPageProps = {
  params: {
    cohort: string;
  };
};

export default function StudentCohortPage({ params }: CohortPageProps) {
  const cohort = Number(params.cohort);
  const isValidCohort = Number.isFinite(cohort) && COHORTS.includes(cohort);

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

  const classNames = buildClassNamesByCohort(cohort);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Khóa {cohort}</h1>
              <p className="mt-1 text-sm text-slate-600">Chọn lớp để xem danh sách sinh viên của lớp đó.</p>
            </div>

            <Link
              href="/admin/student"
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Quay lại chọn khóa
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {classNames.map((className) => (
              <Link
                key={className}
                href={`/admin/student/cohort/${cohort}/class/${encodeURIComponent(className)}`}
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {className}
              </Link>
            ))}
          </div>
        </section>

        <AdminUsersPageContent initialCohortFilter={cohort} />
      </div>
    </main>
  );
}
