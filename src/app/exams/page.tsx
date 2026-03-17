"use client";

import ExamLibrary from "../dashboard/ExamLibrary";

export default function ExamsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-rose-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <ExamLibrary />
      </div>
    </main>
  );
}
