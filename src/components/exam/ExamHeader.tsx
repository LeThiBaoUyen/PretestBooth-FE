"use client";

import Link from "next/link";
import Image from "next/image";

interface ExamHeaderProps {
  problemTitle: string;
  difficulty: "Easy" | "Medium" | "Hard";
  isRunning: boolean;
  isSubmitting: boolean;
  onRun: () => void;
  onSubmit: () => void;
}

export default function ExamHeader({
  problemTitle,
  difficulty,
  isRunning,
  isSubmitting,
  onRun,
  onSubmit,
}: ExamHeaderProps) {
  const getDifficultyStyle = () => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-700 border-green-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Hard":
        return "bg-red-100 text-red-700 border-red-200";
    }
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/assets/iuhcm-logo.png"
            alt="IUHCM Logo"
            width={160}
            height={46}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <div className="h-6 w-px bg-gray-300" />

        {/* Problem Info */}
        <div className="flex items-center gap-3">
          <span className="text-gray-800 font-semibold">{problemTitle}</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDifficultyStyle()}`}
          >
            {difficulty}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRun}
          disabled={isRunning || isSubmitting}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
              Đang chạy...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Chạy thử
            </>
          )}
        </button>
        <button
          onClick={onSubmit}
          disabled={isRunning || isSubmitting}
          className="px-4 py-2 bg-navy-600 hover:bg-navy-700 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang nộp...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Nộp bài
            </>
          )}
        </button>
      </div>
    </header>
  );
}
