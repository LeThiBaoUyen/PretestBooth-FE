"use client";

import Footer from "@/components/Footer";
import QuestionsLibrary from "./QuestionsLibrary";

export default function QuestionsPage() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-navy-50 pt-16 pb-20">
        <QuestionsLibrary />
      </main>
      <Footer />
    </>
  );
}
