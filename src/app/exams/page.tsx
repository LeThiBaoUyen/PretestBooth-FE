"use client";

import { Suspense } from "react";
import ExamLibrary from "../dashboard/ExamLibrary";

export default function ExamsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Suspense fallback={<div>Loading...</div>}>
          <ExamLibrary />
        </Suspense>
      </div>
    </main>
  );
}
