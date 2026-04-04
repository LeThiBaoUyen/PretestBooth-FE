"use client";
import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { examsApiClient } from "@/lib/api/exams";
import { questionsApiClient } from "@/lib/api/questions";
import { bookingsApi } from "@/lib/api/bookings";
import { useAuth } from "@/lib/hooks";
import type { ExamListItem, Subject } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import {
  BookOpen,
  Clock3,
  Filter,
  Hash,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import ExamSelection from "./ExamSelection";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DURATION_RANGE_CONFIG = {
  min: 15,
  max: 240,
  step: 5,
};

const QUESTION_RANGE_CONFIG = {
  min: 0,
  max: 150,
  step: 1,
};

function RangeFilterSlider({
  label,
  icon,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
}) {
  const [from, to] = value;
  const range = max - min;
  const leftPercent = ((from - min) / range) * 100;
  const rightPercent = ((to - min) / range) * 100;
  const selectedWidth = Math.max(rightPercent - leftPercent, 0);

  const handleMin = (nextValue: number) => {
    const next = Math.min(nextValue, to - step);
    onChange([next, to]);
  };

  const handleMax = (nextValue: number) => {
    const next = Math.max(nextValue, from + step);
    onChange([from, next]);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700">
          {icon}
          {label}
        </div>
        <div className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-navy-700 border border-slate-200">
          {from}{unit} - {to}{unit}
        </div>
      </div>

      <div className="mt-3">
        <div className="relative h-10">
          <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200" />
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-navy-500"
            style={{
              left: `${leftPercent}%`,
              width: `${selectedWidth}%`,
            }}
          />

          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={from}
            onChange={(e) => handleMin(Number(e.target.value))}
            className="dual-range-input z-20"
            aria-label={`${label} từ`}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={to}
            onChange={(e) => handleMax(Number(e.target.value))}
            className="dual-range-input z-30"
            aria-label={`${label} đến`}
          />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-navy-700">
            Từ: <span className="font-semibold">{from}{unit}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-navy-700">
            Đến: <span className="font-semibold">{to}{unit}</span>
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function ExamLibrary() {
  const router = useRouter();
  const { accessToken, user, userLoading } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [durationRange, setDurationRange] = useState<[number, number]>([
    DURATION_RANGE_CONFIG.min,
    DURATION_RANGE_CONFIG.max,
  ]);
  const [questionRange, setQuestionRange] = useState<[number, number]>([
    QUESTION_RANGE_CONFIG.min,
    QUESTION_RANGE_CONFIG.max,
  ]);
  const [activeTab, setActiveTab] = useState<"all" | "published" | "custom">("all");
  const [error, setError] = useState<string | null>(null);
  const [checkingExamAutoAssign, setCheckingExamAutoAssign] = useState(false);
  const [hasCheckedInExamBooking, setHasCheckedInExamBooking] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState<string | null>(null);

  // Data
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const latestFetchRef = useRef(0);
  const autoAssignCheckedRef = useRef(false);

  // Role check: can this user manage the given exam?
  const canManage = (_exam: ExamListItem) => hasPermission(user, "CREATE_EXAM");
  const canCreateExam = hasPermission(user, "CREATE_EXAM");

  const attemptAutoAssignExam = useCallback(async () => {
    if (!accessToken || user?.role !== "STUDENT") {
      return;
    }

    setCheckingExamAutoAssign(true);
    setAutoAssignError(null);

    try {
      const bookingResult = await bookingsApi.getBookings({
        page: 1,
        limit: 20,
        status: "CHECKED_IN",
        type: "EXAM",
        sortOrder: "desc",
      });

      const activeExamBookings = Array.isArray(bookingResult.data)
        ? bookingResult.data
        : [];
      const hasActiveCheckedInExamBooking = activeExamBookings.length > 0;

      setHasCheckedInExamBooking(hasActiveCheckedInExamBooking);

      if (!hasActiveCheckedInExamBooking) {
        return;
      }

      router.replace("/exams/prepare");
    } catch (err: any) {
      setAutoAssignError(err?.message || "Không thể kiểm tra trạng thái lịch EXAM. Vui lòng thử lại.");
    } finally {
      setCheckingExamAutoAssign(false);
    }
  }, [accessToken, user?.role, router]);

  useEffect(() => {
    if (userLoading || !accessToken || user?.role !== "STUDENT") {
      return;
    }

    if (autoAssignCheckedRef.current) {
      return;
    }

    autoAssignCheckedRef.current = true;
    void attemptAutoAssignExam();
  }, [accessToken, user?.role, userLoading, attemptAutoAssignExam]);

  // Fetch subjects
  useEffect(() => {
    async function fetchSubjects() {
      try {
        if (!accessToken) return;
        const data = await questionsApiClient.getSubjects(
          accessToken,
        );
        setSubjects(Array.isArray(data) ? data : []);
      } catch {
        setSubjects([]);
      }
    }
    fetchSubjects();
  }, [accessToken]);

  // Fetch exams
  const fetchExams = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setExams([]);
      setTotal(0);
      return;
    }

    const requestId = ++latestFetchRef.current;
    setLoading(true);
    setError(null);
    try {
      const subjectMatch =
        selectedSubject !== "Tất cả"
          ? subjects.find((s) => s.name === selectedSubject)
          : null;

      const result = await examsApiClient.listExams(
        {
          page,
          limit: 12,
          subjectId: subjectMatch?.id,
          search: debouncedSearch || undefined,
          minDuration:
            durationRange[0] > DURATION_RANGE_CONFIG.min
              ? durationRange[0]
              : undefined,
          maxDuration:
            durationRange[1] < DURATION_RANGE_CONFIG.max
              ? durationRange[1]
              : undefined,
          minQuestionCount:
            questionRange[0] > QUESTION_RANGE_CONFIG.min
              ? questionRange[0]
              : undefined,
          maxQuestionCount:
            questionRange[1] < QUESTION_RANGE_CONFIG.max
              ? questionRange[1]
              : undefined,
          isPublished: activeTab === "published" ? true : undefined,
        },
        accessToken,
      );

      if (requestId !== latestFetchRef.current) return;

      if (Array.isArray(result)) {
        setExams(result as ExamListItem[]);
        setTotal((result as ExamListItem[]).length);
      } else {
        setExams(Array.isArray((result as any)?.data) ? (result as any).data : []);
        setTotal(Number((result as any)?.total ?? 0));
      }
    } catch (err: any) {
      if (requestId !== latestFetchRef.current) return;
      setExams([]);
      setTotal(0);
      setError(err?.message || "Không thể tải danh sách đề thi.");
    } finally {
      if (requestId !== latestFetchRef.current) return;
      setLoading(false);
    }
  }, [
    page,
    selectedSubject,
    debouncedSearch,
    durationRange,
    questionRange,
    subjects,
    accessToken,
    activeTab,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeExams = Array.isArray(exams) ? exams : [];
  const visibleExams =
    user?.role === "STUDENT"
      ? safeExams.filter((exam) => exam.type === "EXAM")
      : safeExams;
  const subjectNames = ["Tất cả", ...safeSubjects.map((s) => s.name)];

  if (userLoading) {
    return (
      <div className="py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-gray-500">
          Đang kiểm tra phiên đăng nhập...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Bạn cần đăng nhập để xem đề thi</h2>
          <p className="mt-2 text-slate-600">API exam yêu cầu xác thực, vui lòng đăng nhập rồi thử lại.</p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-navy-600 px-5 py-2.5 font-semibold text-white hover:bg-navy-700"
          >
            Đi tới đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (user.role === "STUDENT" && (checkingExamAutoAssign || hasCheckedInExamBooking)) {
    return (
      <div className="py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Đang mở phần khởi động EXAM</h2>
          <p className="mt-2 text-slate-600">
            Hệ thống sẽ chuyển bạn sang bước chuẩn bị trước khi vào bài thi.
          </p>

          {autoAssignError ? (
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-left text-sm text-rose-700">
              <p className="font-semibold">Không thể mở bước khởi động</p>
              <p className="mt-1">{autoAssignError}</p>
              <button
                type="button"
                onClick={() => void attemptAutoAssignExam()}
                className="mt-3 inline-flex items-center rounded-lg bg-navy-600 px-4 py-2 font-semibold text-white hover:bg-navy-700"
              >
                Thử gán lại
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Đang chuyển hướng...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="ui-page-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="ui-page-title">Thư viện đề thi</h1>
            <p className="ui-page-subtitle">Hãy tìm theo môn học và bắt đầu phiên luyện tập/thi ngay.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-3 py-1 text-xs font-bold text-navy-700">
            <Sparkles className="h-3.5 w-3.5" />
            {user.role}
          </div>
        </div>
      </div>

      {activeTab !== "custom" && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 lg:p-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-3 py-1 text-xs font-bold text-navy-700">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Bộ lọc đề thi
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Từ khóa</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên đề, mô tả..."
                  className="h-10 w-full rounded-lg border border-navy-200 bg-white py-2 pl-9 pr-3 text-sm text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-400"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Môn học</label>
              <select
                className="h-10 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-700"
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setPage(1);
                }}
              >
                {subjectNames.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-transparent select-none">Hành động</label>
              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => fetchExams()}
              >
                <RefreshCw className="h-4 w-4" />
                Tải lại
              </button>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-transparent select-none">Hành động</label>
              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                  setSelectedSubject("Tất cả");
                  setDurationRange([
                    DURATION_RANGE_CONFIG.min,
                    DURATION_RANGE_CONFIG.max,
                  ]);
                  setQuestionRange([
                    QUESTION_RANGE_CONFIG.min,
                    QUESTION_RANGE_CONFIG.max,
                  ]);
                  setPage(1);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Đặt lại
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RangeFilterSlider
              label="Thời gian làm bài"
              icon={<Clock3 className="h-3.5 w-3.5" />}
              unit="p"
              min={DURATION_RANGE_CONFIG.min}
              max={DURATION_RANGE_CONFIG.max}
              step={DURATION_RANGE_CONFIG.step}
              value={durationRange}
              onChange={(next) => {
                setDurationRange(next);
                setPage(1);
              }}
            />

            <RangeFilterSlider
              label="Số câu trắc nghiệm"
              icon={<Hash className="h-3.5 w-3.5" />}
              unit="c"
              min={QUESTION_RANGE_CONFIG.min}
              max={QUESTION_RANGE_CONFIG.max}
              step={QUESTION_RANGE_CONFIG.step}
              value={questionRange}
              onChange={(next) => {
                setQuestionRange(next);
                setPage(1);
              }}
            />
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Kéo slider để lọc nhanh theo thời gian và số lượng câu hỏi.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8 inline-flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1">
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "all"
              ? "bg-navy-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
          onClick={() => setActiveTab("all")}
        >
          Tất cả đề
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "published"
              ? "bg-navy-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
          onClick={() => setActiveTab("published")}
        >
          Chỉ đề công bố
        </button>
        {canCreateExam && (
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "custom"
                ? "bg-navy-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
            onClick={() => setActiveTab("custom")}
          >
            Tạo đề mới
          </button>
        )}
      </div>

      {error && activeTab !== "custom" && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Không tải được dữ liệu đề thi</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "custom" && canCreateExam ? (
        <ExamSelection
          onExamCreated={() => {
            setActiveTab("all");
            fetchExams();
          }}
        />
      ) : loading ? (
        <div className="text-center py-20 text-gray-500">Đang tải...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-xl shadow-sm p-5 flex flex-col justify-between border border-slate-200 relative hover:shadow-md transition"
              >
                <div className="flex-1">
                  <div className="min-h-[3.5rem] mb-2">
                    <h2 className="text-lg font-bold text-navy-700 line-clamp-2">
                      {exam.title}
                    </h2>
                  </div>
                  <div className="flex items-center text-gray-500 text-sm mb-2 gap-3 min-h-[1.5rem]">
                    <span>⏰ {exam.duration} phút</span>
                    <span>👁️ {exam.sessionCount} lượt thi</span>
                    <span>📝 {exam.totalItems} câu</span>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 mb-3 min-h-[2rem]">
                    {exam.subject && (
                      <span className="bg-navy-50 text-navy-600 px-2 py-1 rounded text-xs font-semibold">
                        #{exam.subject.name}
                      </span>
                    )}
                    {exam.difficulty && (
                      <span className="bg-navy-50 text-navy-600 px-2 py-1 rounded text-xs font-semibold">
                        {exam.difficulty === "EASY"
                          ? "Dễ"
                          : exam.difficulty === "MEDIUM"
                            ? "Trung bình"
                            : "Khó"}
                      </span>
                    )}
                    {!exam.subject && !exam.difficulty && (
                      <span className="invisible bg-navy-50 px-2 py-1 rounded text-xs font-semibold">
                        placeholder
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mb-2 min-h-[1.25rem]">
                    Trắc nghiệm: {exam.questionCount} | Code:{" "}
                    {exam.problemCount}
                  </div>
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-2 min-h-[1.25rem]">
                    <Filter className="h-3 w-3" />
                    {exam.isPublished ? "Công bố" : "Nháp"}
                  </div>
                </div>
                <Link
                  href={`/exams/${exam.id}`}
                  className="mt-2 w-full bg-navy-600 text-white py-2 rounded-lg font-bold hover:bg-navy-700 transition block text-center"
                >
                  Chi tiết
                </Link>
                {canManage(exam) && (
                  <div className="flex gap-2 mt-2">
                    <Link
                      href={`/exams/${exam.id}/edit`}
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold border border-navy-200 text-navy-600 hover:bg-navy-50 transition text-center"
                    >
                      ✏️ Sửa
                    </Link>
                  </div>
                )}
              </div>
            ))}
            {visibleExams.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-10">
                Không tìm thấy bộ đề phù hợp.
              </div>
            )}
          </div>
          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from(
                { length: Math.ceil(total / 12) },
                (_, i) => i + 1,
              ).map((p) => (
                <button
                  key={p}
                  className={`px-3 py-1 rounded font-bold text-sm ${
                    p === page
                      ? "bg-navy-600 text-white"
                      : "bg-white text-navy-600 border border-navy-200"
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
