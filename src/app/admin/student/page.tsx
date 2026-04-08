"use client";

import { AdminUsersPageContent } from "../../dashboard/users/page";

export default function AdminStudentRoutePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminUsersPageContent />
      </div>
    </main>
  );
}