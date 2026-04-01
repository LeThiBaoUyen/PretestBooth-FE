"use client";

import Footer from "@/components/Footer";
import ProblemsLibrary from "@/app/question-bank/problems/ProblemsLibrary";

export default function ProblemsPage() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pt-6 pb-20">
        <ProblemsLibrary />
      </main>
      <Footer />
    </>
  );
}
