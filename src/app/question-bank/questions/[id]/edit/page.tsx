"use client";

import Footer from "@/components/Footer";
import EditQuestionForm from "./EditQuestionForm";

export default function EditQuestionPage() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pt-16 pb-20">
        <EditQuestionForm />
      </main>
      <Footer />
    </>
  );
}
