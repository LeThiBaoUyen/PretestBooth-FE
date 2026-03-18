"use client";

import Footer from "@/components/Footer";
import AddProblemForm from "./AddProblemForm";

export default function CreateProblemPage() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pt-16 pb-20">
        <AddProblemForm />
      </main>
      <Footer />
    </>
  );
}
