"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Crown, History, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import Footer from "@/components/Footer";
import { pointsApi } from "@/lib/api/points";
import { useAuth } from "@/lib/hooks";
import type { LeaderboardUser, PointTransaction } from "@/lib/api/points";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function LeaderboardPage() {
  const { user } = useAuth();
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loadingLB, setLoadingLB] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<"LEADERBOARD" | "HISTORY">("LEADERBOARD");

  useEffect(() => {
    pointsApi.getLeaderboard(20)
      .then(setLeaderboard)
      .catch(console.error)
      .finally(() => setLoadingLB(false));

    if (user?.role === "STUDENT") {
      pointsApi.getMyPoints()
        .then(res => setTotalPoints(res.totalPoints))
        .catch(console.error);

      pointsApi.getHistory(1, 50)
        .then((res) => setHistory(Array.isArray(res?.data) ? res.data : []))
        .catch(console.error)
        .finally(() => setLoadingHistory(false));
    }
  }, [user]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="font-bold text-gray-500">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-50 border-yellow-200 text-yellow-900";
    if (rank === 2) return "bg-gray-50 border-gray-200 text-gray-800";
    if (rank === 3) return "bg-amber-50 border-amber-200 text-amber-900";
    return "bg-white border-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="text-center mb-10">
          <div className="inline-block bg-yellow-100 p-4 rounded-full mb-4">
            <Trophy className="w-12 h-12 text-yellow-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-navy-800 mb-2">Bảng Xếp Hạng Điểm Thưởng</h1>
          <p className="text-gray-500 text-lg">Thi đua luyện tập - Tích lũy điểm cao</p>
        </div>

        {/* User's Own Score card */}
        {user?.role === "STUDENT" && (
          <div className="bg-gradient-to-r from-navy-600 flex items-center justify-between to-navy-800 rounded-2xl shadow-lg p-6 mb-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
              <Trophy className="w-48 h-48" />
            </div>
            <div>
              <p className="text-navy-100 font-medium mb-1 uppercase tracking-wider text-sm">Điểm Của Bạn</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-5xl font-black text-yellow-400">{totalPoints}</span>
                <span className="text-navy-100 font-medium">điểm</span>
              </div>
            </div>
            
            <button 
              onClick={() => setActiveTab(activeTab === "HISTORY" ? "LEADERBOARD" : "HISTORY")}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 transition rounded-lg border border-white/20 flex items-center font-medium backdrop-blur-sm"
            >
              {activeTab === "LEADERBOARD" ? (
                <><History className="w-4 h-4 mr-2" /> Xem lịch sử</>
              ) : (
                <><Trophy className="w-4 h-4 mr-2" /> Xem BXH</>
              )}
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
          
          {activeTab === "LEADERBOARD" && (
            <div>
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center">
                <Trophy className="w-5 h-5 text-yellow-600 mr-2" />
                <h2 className="text-lg font-bold text-gray-900">Top 20 Sinh viên xuất sắc</h2>
              </div>
              
              {loadingLB ? (
                <div className="py-20 text-center text-gray-500">Đang tải bảng xếp hạng...</div>
              ) : leaderboard.length === 0 ? (
                <div className="py-20 text-center text-gray-500">Chưa có dữ liệu xếp hạng.</div>
              ) : (
                <div className="divide-y divide-gray-100 p-2 sm:p-4">
                  {leaderboard.map((lbUser) => (
                    <div 
                      key={lbUser.id} 
                      className={`flex items-center p-4 rounded-xl mb-2 border transition hover:-translate-y-0.5 ${getRankColor(lbUser.rank)} ${
                        user?.id === lbUser.id ? "ring-2 ring-navy-500 ring-offset-2" : ""
                      }`}
                    >
                      <div className="w-12 flex justify-center flex-shrink-0">
                        {getRankIcon(lbUser.rank)}
                      </div>
                      
                      <div className="flex-1 min-w-0 ml-4">
                        <p className="font-bold text-lg truncate flex items-center">
                          {lbUser.name || "Sinh viên"} 
                          {user?.id === lbUser.id && (
                            <span className="ml-2 text-[10px] uppercase font-black tracking-wider bg-navy-600 text-white px-2 py-0.5 rounded">Bạn</span>
                          )}
                        </p>
                        <p className="text-xs font-medium opacity-70">{lbUser.studentCode || "--"}</p>
                      </div>

                      <div className="text-right">
                        <span className={`text-xl font-black ${
                          lbUser.rank === 1 ? "text-yellow-600" : 
                          lbUser.rank === 2 ? "text-gray-600" : 
                          lbUser.rank === 3 ? "text-amber-700" : "text-navy-700"
                        }`}>
                          {lbUser.totalPoints}
                        </span>
                        <span className="text-xs font-medium ml-1 opacity-70 uppercase">Điểm</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "HISTORY" && (
            <div>
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center">
                  <History className="w-5 h-5 text-navy-600 mr-2" />
                  <h2 className="text-lg font-bold text-gray-900">Lịch sử biến động điểm</h2>
                </div>
              </div>

              {loadingHistory ? (
                <div className="py-20 text-center text-gray-500">Đang tải lịch sử...</div>
              ) : history.length === 0 ? (
                <div className="py-20 text-center text-gray-500">Bạn chưa có giao dịch điểm nào.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {history.map((tx) => (
                    <div key={tx.id} className="p-5 flex items-start justify-between hover:bg-gray-50 transition">
                      <div className="flex items-start">
                        <div className={`mt-1 mr-4 flex-shrink-0 ${tx.points >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {tx.points >= 0 ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{tx.reason}</p>
                          <p className="text-sm text-gray-500 mt-1 font-medium">
                            {format(new Date(tx.createdAt), "HH:mm dd/MM/yyyy", { locale: vi })}
                            <span className="mx-2">•</span>
                            <span>{tx.type}</span>
                          </p>
                        </div>
                      </div>
                      <div className={`text-lg font-bold whitespace-nowrap ${tx.points >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {tx.points > 0 ? "+" : ""}{tx.points}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
