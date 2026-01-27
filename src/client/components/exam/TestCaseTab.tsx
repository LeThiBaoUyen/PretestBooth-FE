"use client";

import type { TestCase } from "./types";

interface TestCaseTabProps {
  testCases: TestCase[];
  activeTestCase: number;
  setActiveTestCase: (index: number) => void;
}

export default function TestCaseTab({
  testCases,
  activeTestCase,
  setActiveTestCase,
}: TestCaseTabProps) {
  return (
    <div className="p-5 space-y-5">
      {/* TestCase Selection */}
      <div className="flex gap-2 flex-wrap">
        {testCases.map((tc, index) => (
          <button
            key={tc.id}
            onClick={() => setActiveTestCase(index)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTestCase === index
                ? "bg-navy-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
            }`}
          >
            Case {index + 1}
          </button>
        ))}
      </div>

      {/* Active TestCase Details */}
      {testCases[activeTestCase] && (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2">
              Input:
            </label>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 whitespace-pre-wrap border border-gray-700">
              {testCases[activeTestCase].input}
            </div>
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-2">
              Expected Output:
            </label>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 whitespace-pre-wrap border border-gray-700">
              {testCases[activeTestCase].expectedOutput}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
