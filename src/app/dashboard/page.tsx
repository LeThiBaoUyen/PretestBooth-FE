"use client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ExamLibrary from "./ExamLibrary";
export default function DashboardPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-rose-100 pt-16 pb-20">
        <ExamLibrary />
      </main>
      <Footer />
    </>
  );
}
