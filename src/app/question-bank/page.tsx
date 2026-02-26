"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuestionBankHome from "./QuestionBankHome";

export default function QuestionBankPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 pt-16 pb-20">
        <QuestionBankHome />
      </main>
      <Footer />
    </>
  );
}
