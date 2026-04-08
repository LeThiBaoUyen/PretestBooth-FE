"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { AdminUsersPageContent } from "../../../../dashboard/users/page";
import { buildClassNamesByCohort } from "../../cohort-config";
import { Plus } from "lucide-react";

type CohortPageProps = {
  params: Promise<{
    cohort: string;
  }>;
};

export default function StudentCohortPage({ params }: CohortPageProps) {
  const { cohort: cohortParam } = use(params);
  const router = useRouter();
  const cohort = Number(cohortParam);
  const isValidCohort = Number.isInteger(cohort) && cohort > 0 && cohort <= 99;
  const storageKey = `admin-student-custom-classes-${cohort}`;
  const defaultClassNames = useMemo(() => buildClassNamesByCohort(cohort), [cohort]);
  const [customClassNames, setCustomClassNames] = useState<string[]>([]);
  const [newClassName, setNewClassName] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const values = Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
      setCustomClassNames(Array.from(new Set(values)));
    } catch {
      setCustomClassNames([]);
    }
  }, [storageKey]);

  const mergedClassNames = useMemo(() => {
    return Array.from(new Set([...defaultClassNames, ...customClassNames]));
  }, [defaultClassNames, customClassNames]);

  const handleAddClass = () => {
    const className = newClassName.trim();
    if (!className) return;
    if (mergedClassNames.includes(className)) return;

    const nextValues = Array.from(new Set([...customClassNames, className]));
    setCustomClassNames(nextValues);
    window.localStorage.setItem(storageKey, JSON.stringify(nextValues));
    setNewClassName("");
    router.push("/admin/student");
  };

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Khóa {cohort}</h1>
              <p className="mt-1 text-sm text-slate-600">Chọn lớp để xem danh sách sinh viên của lớp đó.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddClass();
                  }
                }}
                placeholder={`Nhập lớp mới, ví dụ: DHKHDL${cohort}A`}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-navy-500"
              />

              <button
                type="button"
                onClick={handleAddClass}
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Thêm lớp
              </button>

              <Link
                href="/admin/student"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Quay lại chọn khóa
              </Link>
            </div>

            <p className="mt-2 text-xs text-slate-500">Chỉ cần gõ tên lớp rồi bấm Thêm hoặc nhấn Enter.</p>
          </div>

        </section>

        <AdminUsersPageContent initialCohortFilter={cohort} />
      </div>
    </main>
  );
}
