"use client";

import Link from "next/link";
import { AdminUsersPageContent } from "../../dashboard/users/page";
import { COHORTS } from "./cohort-config";

export default function AdminStudentRoutePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Chọn khóa sinh viên</h2>
          <p className="mt-1 text-sm text-slate-600">
            Chọn khóa để xem danh sách lớp học phần, sau đó mở trang danh sách sinh viên theo lớp.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {COHORTS.map((cohort) => (
              <Link
                key={cohort}
                href={`/admin/student/cohort/${cohort}`}
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Khóa {cohort}
              </Link>
            ))}
          </div>
        </section>

        <AdminUsersPageContent />
      </div>
    </main>
  );
}