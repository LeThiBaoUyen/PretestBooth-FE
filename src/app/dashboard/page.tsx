"use client";
import Footer from "@/components/Footer";
import ExamLibrary from "./ExamLibrary";
import { useAuth } from "@/lib/hooks";
import StudentStatsDashboard from "./StudentStats";
import AdminStatsDashboard from "./AdminStats";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-rose-100 pt-8 pb-20">
        {user?.role === "STUDENT" && <StudentStatsDashboard />}
        {user?.role === "ADMIN" && <AdminStatsDashboard />}
        
        {/* We still show ExamLibrary for both, Admin needs to manage it, Student needs to take them */}
        <div className="border-t border-gray-200 mt-12 pt-4">
          <ExamLibrary />
        </div>
      </main>
      <Footer />
    </>
  );
}
