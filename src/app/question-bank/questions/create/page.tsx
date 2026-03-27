"use client";

import Footer from "@/components/Footer";
import AddQuestionForm from "./AddQuestionForm";

export default function CreateQuestionPage() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pt-6 pb-20">
        <AddQuestionForm />
      </main>
      <Footer />
    </>
  );
}
