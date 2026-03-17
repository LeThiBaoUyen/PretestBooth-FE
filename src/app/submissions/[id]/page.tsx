"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { submissionsApi } from "@/lib/api/execution";
import type { SubmissionStatus, TestCaseResult } from "@/lib/api/types";

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  ACCEPTED: "bg-green-100 text-green-800",
  WRONG_ANSWER: "bg-red-100 text-red-800",
  COMPILE_ERROR: "bg-orange-100 text-orange-800",
  RUNTIME_ERROR: "bg-purple-100 text-purple-800",
  TIME_LIMIT_EXCEEDED: "bg-yellow-100 text-yellow-800",
  MEMORY_LIMIT_EXCEEDED: "bg-yellow-100 text-yellow-800",
  PENDING: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  ACCEPTED: "Đạt",
  WRONG_ANSWER: "Sai",
  COMPILE_ERROR: "Lỗi biên dịch",
  RUNTIME_ERROR: "Lỗi runtime",
  TIME_LIMIT_EXCEEDED: "Quá thời gian",
  MEMORY_LIMIT_EXCEEDED: "Quá bộ nhớ",
  PENDING: "Đang chạy",
};

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const { data: submission, isLoading } = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => submissionsApi.getSubmission(submissionId),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Đang tải...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Không tìm thấy bài nộp
          </h2>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Quay lại
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Chi tiết bài nộp</h1>
        </div>

        {/* Submission Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Bài tập
              </h3>
              {submission.problem ? (
                <Link
                  href={`/question-bank/problems/${submission.problem.slug}`}
                  className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                >
                  {submission.problem.title}
                </Link>
              ) : (
                <p className="text-lg font-semibold text-gray-900">
                  {submission.problemId}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Trạng thái
              </h3>
              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                  STATUS_COLORS[submission.status]
                }`}
              >
                {STATUS_LABELS[submission.status]}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Ngôn ngữ
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {submission.language} {submission.version}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Thời gian thực thi
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {submission.executionTime}ms
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Test cases
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                <span
                  className={
                    submission.passedTestCases === submission.totalTestCases
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {submission.passedTestCases}/{submission.totalTestCases}
                </span>{" "}
                đạt
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Ngày nộp
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(submission.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>

          {/* Compile/Error Output */}
          {submission.compileOutput && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Kết quả biên dịch
              </h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {submission.compileOutput}
              </pre>
            </div>
          )}

          {submission.errorMessage && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Thông báo lỗi
              </h3>
              <pre className="bg-red-50 text-red-900 p-4 rounded-lg overflow-x-auto text-sm border border-red-200">
                {submission.errorMessage}
              </pre>
            </div>
          )}
        </div>

        {/* Test Case Results */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Kết quả test cases
          </h2>
          <div className="space-y-4">
            {submission.testCaseResults
              .sort((a: TestCaseResult, b: TestCaseResult) => a.order - b.order)
              .map((result: TestCaseResult, idx: number) => (
                <div
                  key={result.testCaseId}
                  className={`border rounded-lg p-4 ${
                    result.passed
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      Test case #{idx + 1}{" "}
                      {result.isHidden && (
                        <span className="text-sm text-gray-500">(Ẩn)</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {result.executionTime}ms
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          result.passed
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {result.passed ? "Đạt" : "Không đạt"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Input</h4>
                      <pre className="bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                        {result.input}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">
                        Expected Output
                      </h4>
                      <pre className="bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                        {result.expectedOutput}
                      </pre>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">
                        Actual Output
                      </h4>
                      <pre
                        className={`p-2 rounded border overflow-x-auto ${
                          result.passed
                            ? "bg-white border-gray-200"
                            : "bg-red-100 border-red-300"
                        }`}
                      >
                        {result.actualOutput}
                      </pre>
                    </div>
                  </div>

                  {result.stderr && (
                    <div className="mt-3">
                      <h4 className="font-medium text-gray-700 mb-1 text-sm">
                        Stderr
                      </h4>
                      <pre className="bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto">
                        {result.stderr}
                      </pre>
                    </div>
                  )}

                  {result.message && (
                    <div className="mt-2 text-sm text-gray-600">
                      {result.message}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Source Code */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mã nguồn</h2>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{submission.sourceCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
