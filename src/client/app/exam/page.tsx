"use client";

import { useState, useCallback } from "react";
import {
  ExamHeader,
  ExamTabs,
  DescriptionTab,
  TestCaseTab,
  ResultTab,
  CodeEditor,
  type Problem,
  type TestResult,
  type TabType,
} from "@/client/components/exam";

// Sample problem data
const sampleProblem: Problem = {
  id: 1,
  title: "Two Sum",
  difficulty: "Easy",
  description: `Cho một mảng số nguyên **nums** và một số nguyên **target**, hãy trả về chỉ số của hai số sao cho tổng của chúng bằng **target**.

Bạn có thể giả định rằng mỗi đầu vào sẽ có **đúng một lời giải**, và bạn không được sử dụng cùng một phần tử hai lần.

Bạn có thể trả về kết quả theo bất kỳ thứ tự nào.`,
  examples: [
    {
      input: "nums = [2, 7, 11, 15], target = 9",
      output: "[0, 1]",
      explanation: "Vì nums[0] + nums[1] == 9, nên trả về [0, 1].",
    },
    {
      input: "nums = [3, 2, 4], target = 6",
      output: "[1, 2]",
      explanation: "Vì nums[1] + nums[2] == 6, nên trả về [1, 2].",
    },
    {
      input: "nums = [3, 3], target = 6",
      output: "[0, 1]",
    },
  ],
  constraints: [
    "2 <= nums.length <= 10^4",
    "-10^9 <= nums[i] <= 10^9",
    "-10^9 <= target <= 10^9",
    "Chỉ có duy nhất một đáp án hợp lệ.",
  ],
  testCases: [
    { id: 1, input: "[2, 7, 11, 15]\n9", expectedOutput: "[0, 1]" },
    { id: 2, input: "[3, 2, 4]\n6", expectedOutput: "[1, 2]" },
    { id: 3, input: "[3, 3]\n6", expectedOutput: "[0, 1]" },
  ],
};

const defaultCode = `function twoSum(nums, target) {
  // Viết code của bạn ở đây
  
}

// Đọc input và gọi hàm
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let lines = [];
rl.on('line', (line) => {
  lines.push(line);
  if (lines.length === 2) {
    const nums = JSON.parse(lines[0]);
    const target = parseInt(lines[1]);
    console.log(JSON.stringify(twoSum(nums, target)));
    rl.close();
  }
});
`;

export default function ExamPage() {
  const [code, setCode] = useState(defaultCode);
  const [activeTab, setActiveTab] = useState<TabType>("description");
  const [language, setLanguage] = useState("javascript");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTestCase, setActiveTestCase] = useState(0);

  const handleEditorChange = useCallback((value: string | undefined) => {
    setCode(value || "");
  }, []);

  // Simulate running test cases
  const runCode = async () => {
    setIsRunning(true);
    setActiveTab("result");

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const results: TestResult[] = sampleProblem.testCases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: tc.expectedOutput,
      passed: Math.random() > 0.3,
      executionTime: Math.floor(Math.random() * 100) + 10,
    }));

    setTestResults(results);
    setIsRunning(false);
  };

  const submitCode = async () => {
    setIsSubmitting(true);
    setActiveTab("result");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const results: TestResult[] = sampleProblem.testCases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: tc.expectedOutput,
      passed: true,
      executionTime: Math.floor(Math.random() * 50) + 5,
    }));

    setTestResults(results);
    setIsSubmitting(false);
  };

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <ExamHeader
        problemTitle={sampleProblem.title}
        difficulty={sampleProblem.difficulty}
        isRunning={isRunning}
        isSubmitting={isSubmitting}
        onRun={runCode}
        onSubmit={submitCode}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Panel - Problem Info */}
        <div className="w-1/2 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {/* Tabs */}
          <ExamTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            passedCount={passedCount}
            totalCount={totalCount}
          />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "description" && (
              <DescriptionTab problem={sampleProblem} />
            )}
            {activeTab === "testcase" && (
              <TestCaseTab
                testCases={sampleProblem.testCases}
                activeTestCase={activeTestCase}
                setActiveTestCase={setActiveTestCase}
              />
            )}
            {activeTab === "result" && (
              <ResultTab
                results={testResults}
                isRunning={isRunning}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2">
          <CodeEditor
            code={code}
            language={language}
            onChange={handleEditorChange}
            onLanguageChange={setLanguage}
          />
        </div>
      </div>
    </div>
  );
}
