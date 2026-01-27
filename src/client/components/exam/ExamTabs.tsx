"use client";

import type { TabType } from "./types";

interface ExamTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  passedCount: number;
  totalCount: number;
}

export default function ExamTabs({
  activeTab,
  setActiveTab,
  passedCount,
  totalCount,
}: ExamTabsProps) {
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "description", label: "Đề bài", icon: "📄" },
    { key: "testcase", label: "Test Cases", icon: "🧪" },
    { key: "result", label: "Kết quả", icon: "📊" },
  ];

  return (
    <div className="flex border-b border-gray-200 bg-gray-50">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`px-5 py-3 text-sm font-medium transition-colors relative ${
            activeTab === tab.key
              ? "text-navy-600 bg-white border-b-2 border-navy-600"
              : "text-gray-600 hover:text-navy-600 hover:bg-gray-100"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>{tab.icon}</span>
            {tab.label}
            {tab.key === "result" && totalCount > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  passedCount === totalCount
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {passedCount}/{totalCount}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
