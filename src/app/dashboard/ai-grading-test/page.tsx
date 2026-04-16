"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks";
import { hasPermission } from "@/lib/auth/permissions";
import { examsApiClient } from "@/lib/api/exams";
import type {
  TestShortAnswerGradingRequest,
  TestShortAnswerGradingResponse,
} from "@/lib/api/types";

const SAMPLE_PAYLOAD: TestShortAnswerGradingRequest = {
  question: "Nêu khác biệt chính giữa stack và queue trong cấu trúc dữ liệu.",
  referenceAnswer:
    "Stack hoạt động theo nguyên tắc LIFO, còn queue hoạt động theo FIFO.",
  studentAnswer:
    "Stack vào sau ra trước (LIFO), queue vào trước ra trước (FIFO).",
  maxScore: 1,
  explanation: "Cần nêu đúng nguyên tắc truy xuất phần tử của mỗi cấu trúc.",
};

export default function AiGradingTestPage() {
  const { user } = useAuth();
  const [payload, setPayload] = useState<TestShortAnswerGradingRequest>(SAMPLE_PAYLOAD);
  const [result, setResult] = useState<TestShortAnswerGradingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canUsePage = user?.role === "ADMIN" || hasPermission(user, "CREATE_EXAM");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await examsApiClient.testShortAnswerGrading(payload);
      setResult(response);
    } catch (err: any) {
      setResult(null);
      setError(err?.message || "Không thể chấm thử câu trả lời tự luận.");
    } finally {
      setLoading(false);
    }
  };

  const patchField = <K extends keyof TestShortAnswerGradingRequest>(
    key: K,
    value: TestShortAnswerGradingRequest[K],
  ) => {
    setPayload((previous) => ({ ...previous, [key]: value }));
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-700">Bạn cần đăng nhập để dùng trang test chấm tự luận.</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
        >
          Đi tới đăng nhập
        </Link>
      </div>
    );
  }

  if (!canUsePage) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-xl font-bold text-amber-800">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-amber-700">
          Trang test tạm chỉ dành cho giảng viên có quyền quản lý đề thi hoặc quản trị viên.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-navy-700">Test tạm chấm tự luận ngắn bằng Gemini</h1>
        <p className="mt-2 text-sm text-slate-600">
          Trang này gọi trực tiếp API test để kiểm tra kết quả chấm theo GEMINI_API_KEY và GEMINI_MODEL hiện tại.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4">
          <label className="text-sm font-semibold text-slate-700">
            Câu hỏi
            <textarea
              value={payload.question}
              onChange={(event) => patchField("question", event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-navy-400 focus:ring-2"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Đáp án tham chiếu
            <textarea
              value={payload.referenceAnswer}
              onChange={(event) => patchField("referenceAnswer", event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-navy-400 focus:ring-2"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Câu trả lời sinh viên
            <textarea
              value={payload.studentAnswer}
              onChange={(event) => patchField("studentAnswer", event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-navy-400 focus:ring-2"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Điểm tối đa
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={payload.maxScore}
                onChange={(event) => patchField("maxScore", Number(event.target.value || 0))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-navy-400 focus:ring-2"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Giải thích tham khảo (optional)
              <input
                type="text"
                value={payload.explanation || ""}
                onChange={(event) => patchField("explanation", event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-navy-400 focus:ring-2"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Đang chấm..." : "Chấm thử"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPayload(SAMPLE_PAYLOAD);
              setResult(null);
              setError(null);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Dùng dữ liệu mẫu
          </button>
        </div>
      </form>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      )}

      {result && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-navy-700">Kết quả chấm</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Mode</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{result.mode}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Model</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{result.model}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">AI Configured</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {result.aiConfigured ? "Có" : "Không"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Điểm</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{result.score}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Kết luận</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {result.isCorrect ? "Đúng" : "Chưa đạt"}
              </p>
            </div>
          </div>

          {result.rationale && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">Giải thích</p>
              <p className="mt-1 whitespace-pre-wrap">{result.rationale}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
