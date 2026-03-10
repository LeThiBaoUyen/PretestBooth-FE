"use client";

// ...existing code...
import Footer from "@/components/Footer";
import AddProblemForm from "./AddProblemForm";

export default function CreateProblemPage() {
  return (
    <>
      {/* Header removed, handled by layout.tsx */}
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 pt-16 pb-20">
        <AddProblemForm />
      </main>
      <Footer />
    </>
  );
}
