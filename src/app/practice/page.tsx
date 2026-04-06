"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Play, Target, Clock, BookOpen, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { practiceApi } from "@/lib/api/practice";
import type { Difficulty } from "@/lib/api/types";

export default function PracticeSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [duration, setDuration] = useState(30);
  const [totalItems, setTotalItems] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty | "ALL">("MEDIUM");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await practiceApi.createSession({
        duration,
        totalItems,
        difficulty: difficulty === "ALL" ? undefined : difficulty,
      });
      router.push(`/practice/${res.sessionId}`);
    } catch (err: any) {
      setError(err.message || "Không thể tạo phiên luyện tập.");
      setIsSubmitting(false);
    }
  };

  if (!user || user.role !== "STUDENT") return <div className="text-center py-20 text-red-500">Chỉ sinh viên mới có thể luyện tập.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col">
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-navy-600 p-8 text-center text-white">
            <div className="inline-block bg-white/20 p-4 rounded-full mb-4 backdrop-blur-sm">
              <Target className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Tạo Phiên Luyện Tập</h1>
            <p className="text-navy-100">Điểm càng cao - xếp hạng càng Top. Hoàn thành luyện tập nhận ngay +5 điểm vào tổng điểm tích lũy.</p>
          </div>

          <div className="p-8 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start border border-red-200 text-sm font-medium">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Config: Duration */}
            <div>
              <label className="text-gray-900 font-bold mb-3 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-navy-600" /> Thời gian làm bài (Phút)
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[15, 30, 45, 60].map(m => (
                  <button 
                    key={m}
                    onClick={() => setDuration(m)}
                    className={`py-3 rounded-xl border-2 font-bold transition ${
                      duration === m 
                        ? "border-navy-600 bg-navy-50 text-navy-700" 
                        : "border-gray-200 hover:border-navy-300 text-gray-600"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Config: Question Count */}
            <div>
              <label className="text-gray-900 font-bold mb-3 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-navy-600" /> Số lượng câu hỏi
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[5, 10, 20, 30].map(c => (
                  <button 
                    key={c}
                    onClick={() => setTotalItems(c)}
                    className={`py-3 rounded-xl border-2 font-bold transition ${
                      totalItems === c 
                        ? "border-navy-600 bg-navy-50 text-navy-700" 
                        : "border-gray-200 hover:border-navy-300 text-gray-600"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Config: Difficulty */}
            <div>
              <label className="text-gray-900 font-bold mb-3 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-navy-600" /> Độ khó
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: "ALL", label: "Hỗn hợp" },
                  { value: "EASY", label: "Dễ" },
                  { value: "MEDIUM", label: "Trung bình" },
                  { value: "HARD", label: "Khó" }
                ].map(d => (
                  <button 
                    key={d.value}
                    onClick={() => setDifficulty(d.value as Difficulty | "ALL")}
                    className={`py-3 rounded-xl border-2 font-bold transition ${
                      difficulty === d.value 
                        ? "border-navy-600 bg-navy-50 text-navy-700" 
                        : "border-gray-200 hover:border-navy-300 text-gray-600"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button
                disabled={isSubmitting}
                onClick={handleStart}
                className="flex items-center px-8 py-4 bg-navy-600 hover:bg-navy-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                ) : (
                  <Play className="w-5 h-5 mr-2 fill-current" />
                )}
                Bắt đầu luyện tập
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
