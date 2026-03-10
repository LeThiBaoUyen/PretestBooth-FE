"use client";

// ...existing code...
import Footer from "@/components/Footer";
import ProblemsLibrary from "./ProblemsLibrary";

export default function ProblemsPage() {
  return (
    <>
      {/* Header removed, handled by layout.tsx */}
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 pt-16 pb-20">
        <ProblemsLibrary />
      </main>
      <Footer />
    </>
  );
}
