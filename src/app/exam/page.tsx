"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  type ProblemExample,
} from "@/components/exam";
import { problemsApi } from "@/lib/api/problems";
import { executionApi } from "@/lib/api/execution";
import type { Problem as APIProblem, TestCase } from "@/lib/api/types";

const LANGUAGE_MAP: Record<string, { language: string; version?: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
};

// Transform backend problem to UI problem format
function transformProblem(apiProblem: APIProblem): Problem {
  const examples: ProblemExample[] = [];

  // Try to extract examples from description or use sample test cases
  const sampleTestCases =
    apiProblem.testCases?.filter((tc: TestCase) => tc.isSample) || [];
  sampleTestCases.forEach((tc: TestCase) => {
    examples.push({
      input: tc.input,
      output: tc.expectedOutput,
      explanation: undefined,
    });
  });

  return {
    id: parseInt(apiProblem.id, 10) || 0,
    title: apiProblem.title,
    difficulty: (apiProblem.difficulty.charAt(0).toUpperCase() +
      apiProblem.difficulty.slice(1).toLowerCase()) as
      | "Easy"
      | "Medium"
      | "Hard",
    description: apiProblem.description,
    examples,
    constraints: apiProblem.constraints
      ? apiProblem.constraints.split("\n").filter(Boolean)
      : [],
    testCases: (apiProblem.testCases || [])
      .filter((tc: TestCase) => tc.isSample)
      .map((tc: TestCase, idx: number) => ({
        id: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
      })),
  };
}

function ExamContent() {
  const searchParams = useSearchParams();
  const problemSlug = searchParams.get("problem") || "two-sum";

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("description");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTestCase, setActiveTestCase] = useState(0);

  // Fetch problem data
  const { data: apiProblem, isLoading } = useQuery({
    queryKey: ["problem", problemSlug],
    queryFn: () => problemsApi.getProblemBySlug(problemSlug),
  });

  const problem = useMemo(() => {
    if (!apiProblem) return null;
    return transformProblem(apiProblem);
  }, [apiProblem]);

  // Initialize code with starter code when problem loads
  useEffect(() => {
    if (apiProblem?.starterCode?.[language]) {
      setCode(apiProblem.starterCode[language]);
    }
  }, [apiProblem, language]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    setCode(value || "");
  }, []);

  // Handle language change and update code with starter code
  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      setLanguage(newLanguage);
      if (apiProblem?.starterCode?.[newLanguage]) {
        setCode(apiProblem.starterCode[newLanguage]);
      }
    },
    [apiProblem],
  );

  // Run test cases mutation
  const runMutation = useMutation({
    mutationFn: async () => {
      if (!apiProblem) throw new Error("No problem loaded");

      const { language: lang, version } = LANGUAGE_MAP[language] || {
        language,
      };
      const sampleTestCases =
        apiProblem.testCases?.filter((tc: TestCase) => tc.isSample) || [];

      // Run test cases sequentially to avoid rate limiting (Piston limits to 1 request per 200ms)
      const results = [];
      for (let idx = 0; idx < sampleTestCases.length; idx++) {
        const tc = sampleTestCases[idx];
        try {
          const response = await executionApi.runTestCase({
            language: lang,
            version: version || "*",
            source: code,
            functionName: apiProblem.functionName,
            inputTypes: apiProblem.inputTypes,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            runTimeout: apiProblem.timeLimit || 3000,
          });

          results.push({
            id: idx + 1,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: response.actualOutput,
            passed: response.passed,
            executionTime: response.executionTime,
          });
        } catch (error) {
          results.push({
            id: idx + 1,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: error instanceof Error ? error.message : "Error",
            passed: false,
            executionTime: 0,
          });
        }

        // Add delay between requests to respect rate limit (200ms minimum)
        if (idx < sampleTestCases.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setTestResults(results);
      setActiveTab("result");
    },
  });

  // Submit code mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!apiProblem) throw new Error("No problem loaded");

      const { language: lang, version } = LANGUAGE_MAP[language] || {
        language,
      };

      const response = await executionApi.submitCode({
        language: lang,
        version: version || "*",
        source: code,
        functionName: apiProblem.functionName,
        inputTypes: apiProblem.inputTypes,
        problemId: apiProblem.id,
        runTimeout: apiProblem.timeLimit || 3000,
      });

      const results = response.testCaseResults.map((tc, idx) => ({
        id: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: tc.actualOutput,
        passed: tc.passed,
        executionTime: tc.executionTime,
      }));

      return results;
    },
    onSuccess: (results) => {
      setTestResults(results);
      setActiveTab("result");
    },
  });

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;

  if (isLoading || !problem) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Đang tải bài tập...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <ExamHeader
        problemTitle={problem.title}
        difficulty={problem.difficulty}
        isRunning={runMutation.isPending}
        isSubmitting={submitMutation.isPending}
        onRun={() => runMutation.mutate()}
        onSubmit={() => submitMutation.mutate()}
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
              <DescriptionTab problem={problem} />
            )}
            {activeTab === "testcase" && (
              <TestCaseTab
                testCases={problem.testCases}
                activeTestCase={activeTestCase}
                setActiveTestCase={setActiveTestCase}
              />
            )}
            {activeTab === "result" && (
              <ResultTab
                results={testResults}
                isRunning={runMutation.isPending}
                isSubmitting={submitMutation.isPending}
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
            onLanguageChange={handleLanguageChange}
          />
        </div>
      </div>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      }
    >
      <ExamContent />
    </Suspense>
  );
}
