"use client";

import type { TestResult } from "./types";

interface ResultTabProps {
  results: TestResult[];
  isRunning: boolean;
  isSubmitting: boolean;
}

export default function ResultTab({
  results,
  isRunning,
  isSubmitting,
}: ResultTabProps) {
  if (isRunning || isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-navy-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium">
          {isSubmitting ? "Đang nộp bài..." : "Đang chạy test cases..."}
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <svg
          className="w-20 h-20 mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-gray-500 font-medium">Chưa có kết quả</p>
        <p className="text-sm text-gray-400 mt-1">
          Nhấn "Chạy thử" để kiểm tra code của bạn
        </p>
      </div>
    );
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const allPassed = passedCount === totalCount;

  return (
    <div className="p-5 space-y-5">
      {/* Summary */}
      <div
        className={`p-5 rounded-xl border-2 ${
          allPassed
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <div className="flex items-center gap-4">
          {allPassed ? (
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-7 h-7 text-green-600"
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
            </div>
          ) : (
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-7 h-7 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
          <div>
            <p
              className={`text-xl font-bold ${allPassed ? "text-green-700" : "text-red-700"}`}
            >
              {allPassed ? "Accepted ✓" : "Wrong Answer ✗"}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {passedCount}/{totalCount} test cases đã pass
            </p>
          </div>
        </div>
      </div>

      {/* Individual Results */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <div
            key={result.id}
            className={`p-4 rounded-xl border ${
              result.passed
                ? "bg-white border-gray-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${result.passed ? "bg-green-500" : "bg-red-500"}`}
                />
                <span className="font-medium text-gray-800">
                  Case {index + 1}
                </span>
                {result.passed && (
                  <span className="text-green-600 text-sm font-medium">
                    Passed
                  </span>
                )}
              </div>
              {result.executionTime && (
                <span className="text-gray-500 text-sm">
                  {result.executionTime} ms
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className="text-gray-500 font-medium">Input:</span>
                <pre className="mt-1 p-3 bg-gray-900 rounded-lg text-gray-300 overflow-x-auto font-mono text-xs">
                  {result.input || "(empty)"}
                </pre>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Expected:</span>
                <pre className="mt-1 p-3 bg-gray-900 rounded-lg text-green-400 overflow-x-auto font-mono text-xs">
                  {result.expectedOutput || "(empty)"}
                </pre>
              </div>
              <div>
                <span className="text-gray-500 font-medium">
                  Your Output:
                </span>
                <pre
                  className={`mt-1 p-3 bg-gray-900 rounded-lg overflow-x-auto font-mono text-xs ${
                    result.passed ? "text-blue-300" : "text-red-400"
                  }`}
                >
                  {result.actualOutput || "(empty)"}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
