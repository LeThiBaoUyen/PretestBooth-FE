"use client";

import { Suspense } from "react";
import QuestionReviewBoard from "./QuestionReviewBoard";

export default function QuestionReviewPage() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pt-6 pb-20">
        <Suspense fallback={<div>Loading...</div>}>
          <QuestionReviewBoard />
        </Suspense>
      </main>
    </>
  );
}
