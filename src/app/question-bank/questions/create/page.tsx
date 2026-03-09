"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AddQuestionForm from "./AddQuestionForm";

export default function CreateQuestionPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 pt-16 pb-20">
        <AddQuestionForm />
      </main>
      <Footer />
    </>
  );
}
