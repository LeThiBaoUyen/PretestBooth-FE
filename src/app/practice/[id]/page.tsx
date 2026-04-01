"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, Send, CheckCircle2, ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { practiceApi } from "@/lib/api/practice";
import type { PracticeSession } from "@/lib/api/types";
import Editor from "@monaco-editor/react";

export default function PracticeExecutionPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Local state for answers before submitting
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const data = await practiceApi.getSession(id);
      setSession(data);
      if (data.status === "COMPLETED") {
        setSessionCompleted(true);
      } else {
        // Calculate remaining time
        const start = new Date(data.startedAt).getTime();
        const end = start + data.duration * 60000;
        const now = Date.now();
        const rem = Math.max(0, Math.floor((end - now) / 1000));
        setTimeLeft(rem);
        
        // Populate existing answers
        const ans: Record<string, any> = {};
        data.items?.forEach(item => {
          if (item.answers && item.answers.length > 0) {
            const lastAns = item.answers[0];
            if (item.question?.questionType === "SINGLE_CHOICE" || item.question?.questionType === "MULTIPLE_CHOICE") {
              ans[item.id] = lastAns.selectedChoiceIds || [];
            } else if (item.question?.questionType === "SHORT_ANSWER") {
              ans[item.id] = lastAns.textAnswer || "";
            } else if (item.problem) {
              ans[item.id] = { sourceCode: lastAns.sourceCode || "", language: lastAns.language || "javascript" };
            }
          }
        });
        setAnswers(ans);
      }
    } catch (err) {
      console.error(err);
      alert("Không tải được phiên luyện tập.");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || sessionCompleted) return;

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev <= 1) {
          clearInterval(timerId);
          handleComplete();
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, sessionCompleted]);

  const handleAnswerChange = async (itemId: string, value: any, type: string) => {
    // Update locally immediately
    setAnswers(prev => ({
      ...prev,
      [itemId]: value
    }));

    // Debounced or direct submission for tracking progress globally
    try {
      if (type === "CHOICE") {
        await practiceApi.submitAnswer(id, { itemId, selectedChoiceIds: value });
      } else if (type === "TEXT") {
        // For text we just save it locally and rely on user completing, but we can sync casually
        await practiceApi.submitAnswer(id, { itemId, textAnswer: value });
      } else if (type === "CODE") {
        await practiceApi.submitAnswer(id, { itemId, sourceCode: value.sourceCode, language: value.language });
      }
    } catch(e) { /* ignore silent sync failure */ }
  };

  const handleComplete = async () => {
    if (sessionCompleted) return;
    setIsSubmitting(true);
    try {
      await practiceApi.completeSession(id);
      setSessionCompleted(true);
      fetchSession(); // Refetch to show scores
    } catch (err: any) {
      alert("Lỗi khi nộp bài: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!user || user.role !== "STUDENT") return null;
  if (loading || !session) return <div className="text-center py-20">Đang khởi tạo bài làm...</div>;

  const currentItem = session.items?.[currentIndex];
  
  if (sessionCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 text-center border border-gray-100">
          <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-navy-800 mb-2">Hoàn Thành!</h1>
          <p className="text-gray-500 mb-6">Bạn đã hoàn thành phiên luyện tập này.</p>
          
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Kết quả</p>
            <div className="text-4xl font-black text-navy-600">
              {session.score !== null ? session.score : "?"} <span className="text-xl text-gray-400">/ {session.maxScore}</span>
            </div>
            {session.score !== null && (
              <p className="text-emerald-600 font-bold mt-3 text-sm flex items-center justify-center">
                +5 Điểm Khen thưởng
              </p>
            )}
          </div>
          
          <button 
            onClick={() => router.push("/dashboard")}
            className="w-full py-4 bg-navy-600 hover:bg-navy-700 text-white rounded-xl font-bold transition shadow-lg shadow-navy-200"
          >
            Quay về Tổng quan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col h-screen">
      {/* Top Header Row */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <BookOpen className="w-6 h-6 text-navy-600 mr-3" />
          <h1 className="text-lg font-bold text-navy-900">Phiên Luyện Tập</h1>
        </div>
        
        <div className={`flex items-center px-4 py-2 rounded-lg font-bold ${
          (timeLeft ?? Infinity) < 300 ? "bg-red-50 text-red-600 border border-red-200 animate-pulse" : "bg-navy-50 text-navy-700 border border-navy-100"
        }`}>
          <Clock className="w-5 h-5 mr-2" />
          {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
        </div>
        
        <button 
          onClick={() => {
            if(confirm("Bạn có chắc chắn muốn nộp bài sớm?")) handleComplete();
          }}
          disabled={isSubmitting}
          className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-lg shadow transition"
        >
          <Send className="w-4 h-4 mr-2" /> Nộp bài
        </button>
      </div>

      {/* Main Execution Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Navigation Grid */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-700">Danh sách câu hỏi</h3>
            <p className="text-xs text-gray-500 mt-1">{session.items?.length || 0} câu / {session.duration} phút</p>
          </div>
          <div className="p-4 grid grid-cols-4 gap-2">
            {session.items?.map((item, idx) => {
              const hasAnswered = !!answers[item.id] && 
                                  (Array.isArray(answers[item.id]) ? answers[item.id].length > 0 : 
                                   typeof answers[item.id] === 'object' ? !!answers[item.id].sourceCode : !!answers[item.id]);
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`aspect-square rounded flex items-center justify-center font-bold text-sm transition-all ${
                    idx === currentIndex 
                      ? "ring-2 ring-navy-600 ring-offset-2 bg-navy-50 text-navy-700 border border-navy-200"
                      : hasAnswered 
                        ? "bg-navy-600 text-white" 
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Question Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 relative">
          {currentItem && (
            <div className="max-w-4xl mx-auto p-6 md:p-10">
              <div className="mb-6 flex items-center justify-between">
                <span className="bg-navy-100 text-navy-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Question {currentIndex + 1} of {session.totalItems}
                </span>
                <span className="text-sm font-semibold text-gray-500">{currentItem.points} Điểm</span>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
                {/* Render Question OR Problem */}
                {currentItem.question ? (
                  <>
                    <h2 className="text-xl font-medium text-gray-900 leading-relaxed mb-8">
                      {currentItem.question.content}
                    </h2>
                    {currentItem.question.imageUrl && (
                      <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <img
                          src={currentItem.question.imageUrl}
                          alt={`Ảnh minh họa câu ${currentIndex + 1}`}
                          className="max-h-80 w-full rounded-lg object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                    
                    {currentItem.question.questionType === "SINGLE_CHOICE" || currentItem.question.questionType === "MULTIPLE_CHOICE" ? (
                      <div className="space-y-3">
                        {currentItem.question.choices?.map(choice => {
                          const isSelected = Array.isArray(answers[currentItem.id]) && answers[currentItem.id].includes(choice.id);
                          const isMultiple = currentItem.question!.questionType === "MULTIPLE_CHOICE";
                          
                          return (
                            <label key={choice.id} className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${
                              isSelected ? "bg-navy-50 border-navy-500 ring-1 ring-navy-500 shadow-sm" : "bg-white border-gray-200 hover:bg-gray-50"
                            }`}>
                              <input 
                                type={isMultiple ? "checkbox" : "radio"}
                                name={`q_${currentItem.id}`}
                                className="mt-1 w-5 h-5 text-navy-600 focus:ring-navy-500 border-gray-300 rounded-sm"
                                checked={isSelected}
                                onChange={() => {
                                  let newArr = [...(answers[currentItem.id] || [])];
                                  if (isMultiple) {
                                    if (isSelected) newArr = newArr.filter(i => i !== choice.id);
                                    else newArr.push(choice.id);
                                  } else {
                                    newArr = [choice.id];
                                  }
                                  handleAnswerChange(currentItem.id, newArr, "CHOICE");
                                }}
                              />
                              <span className="ml-3 text-gray-800 leading-tight">{choice.content}</span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <textarea
                        className="w-full border border-gray-300 rounded-xl p-4 min-h-[150px] focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                        placeholder="Nhập câu trả lời của bạn vào đây..."
                        value={answers[currentItem.id] || ""}
                        onChange={(e) => handleAnswerChange(currentItem.id, e.target.value, "TEXT")}
                        onBlur={(e) => handleAnswerChange(currentItem.id, e.target.value, "TEXT")} // extra sync
                      />
                    )}
                  </>
                ) : currentItem.problem ? (
                  <>
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentItem.problem.title}</h2>
                      <p className="text-gray-700 mb-6">{currentItem.problem.description}</p>
                    </div>
                    
                    <div className="h-[400px] border border-gray-200 rounded-xl overflow-hidden mb-4">
                      <Editor
                        height="100%"
                        language={answers[currentItem.id]?.language || "javascript"}
                        theme="vs-dark"
                        value={answers[currentItem.id]?.sourceCode || currentItem.problem.starterCode?.javascript || "// Write your code here"}
                        onChange={(val) => handleAnswerChange(currentItem.id, { sourceCode: val, language: answers[currentItem.id]?.language || "javascript" }, "CODE")}
                        options={{ minimap: { enabled: false }, fontSize: 14 }}
                      />
                    </div>
                  </>
                ) : null}
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex justify-between mt-6">
                <button 
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Trang trước
                </button>
                
                {currentIndex < (session.items?.length || 0) - 1 ? (
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.min((session.items?.length || 0) - 1, prev + 1))}
                    className="flex items-center px-6 py-3 rounded-xl font-bold transition bg-navy-600 text-white hover:bg-navy-700 shadow-md"
                  >
                    Tiếp theo <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if(confirm("Bạn đã ở câu cuối cùng. Hoàn tất nộp bài?")) handleComplete();
                    }}
                    className="flex items-center px-6 py-3 rounded-xl font-bold transition bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                  >
                    Nộp Bài <CheckCircle2 className="w-5 h-5 ml-2" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
