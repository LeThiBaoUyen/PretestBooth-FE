import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-navy-700">Bảng điều phối Quản trị</h1>
          <p className="mt-2 text-gray-600">Chọn module để quản trị hệ thống.</p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              href="/admin/booths"
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-800 transition hover:border-navy-200 hover:bg-white"
            >
              Quản lý Booth
            </Link>
            <Link
              href="/admin/student"
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-800 transition hover:border-navy-200 hover:bg-white"
            >
              Quản lý Sinh viên
            </Link>
            <Link
              href="/admin/lecturers"
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-800 transition hover:border-navy-200 hover:bg-white"
            >
              Quản lý Giảng viên
            </Link>
            <Link
              href="/admin/access-control"
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-800 transition hover:border-navy-200 hover:bg-white"
            >
              Phân quyền hệ thống
            </Link>
            <Link
              href="/admin/roles"
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-800 transition hover:border-navy-200 hover:bg-white"
            >
              Danh mục vai trò giảng viên
            </Link>
            <Link
              href="/admin/monitoring"
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-800 transition hover:border-navy-200 hover:bg-white"
            >
              Giám sát phiên thi/booth
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
