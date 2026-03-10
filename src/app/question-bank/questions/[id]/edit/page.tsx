"use client";

// ...existing code...
import Footer from "@/components/Footer";
import EditQuestionForm from "./EditQuestionForm";

export default function EditQuestionPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 pt-16 pb-20">
        <EditQuestionForm />
      </main>
      <Footer />
    </>
  );
}
