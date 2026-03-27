"use client";
import { useState, useEffect, useCallback } from "react";
import { examsApiClient } from "@/lib/api/exams";
import { questionsApiClient } from "@/lib/api/questions";
import { problemsApiClient } from "@/lib/api/problems";
import { useAuth } from "@/lib/hooks";
import type {
  Subject,
  Topic,
  Difficulty,
  QuestionListItem,
  ProblemListItem,
} from "@/lib/api/types";

const DIFFICULTY_OPTIONS: { label: string; value: Difficulty }[] = [
  { label: "Dễ", value: "EASY" },
  { label: "Trung bình", value: "MEDIUM" },
  { label: "Khó", value: "HARD" },
];

const DURATIONS = [30, 45, 60, 90, 120];

type SelectionMode = "random" | "manual";
type AllocationPolicy = "STRICT" | "FLEXIBLE";
type ExamVisibility = "PRIVATE" | "PUBLIC";
type PublishMode = "now" | "schedule";
type SubjectDifficultyCounts = {
  easy: number;
  medium: number;
  hard: number;
};

/* ========== Toggle Switch ========== */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-navy-600" : "bg-gray-300"}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </div>
      <span className="text-navy-700 font-medium text-sm">{label}</span>
    </label>
  );
}

/* ========== Item Picker ========== */
function ItemPicker<T extends { id: string }>({
  title,
  items,
  selectedIds,
  onToggle,
  renderItem,
  search,
  onSearchChange,
  page,
  totalPages,
  onPageChange,
  loading,
}: {
  title: string;
  items: T[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  renderItem: (item: T) => React.ReactNode;
  search: string;
  onSearchChange: (v: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  loading: boolean;
}) {
  return (
    <div className="border border-navy-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-navy-700">
          {title}{" "}
          <span className="text-sm font-normal text-navy-500">
            ({selectedIds.size} đã chọn)
          </span>
        </h4>
      </div>
      {/* Search */}
      <input
        type="text"
        className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
        placeholder="Tìm kiếm..."
        value={search}
        onChange={(e) => {
          onSearchChange(e.target.value);
          onPageChange(1);
        }}
      />
      {/* Items */}
      {loading ? (
        <div className="text-center py-4 text-navy-400 text-sm">
          Đang tải...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-4 text-navy-400 text-sm">
          Không tìm thấy kết quả
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto space-y-1">
          {items.map((item) => (
            <label
              key={item.id}
              className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-navy-50 transition ${
                selectedIds.has(item.id)
                  ? "bg-navy-50 ring-1 ring-navy-300"
                  : ""
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 rounded border-navy-300 text-navy-600 focus:ring-navy-500 flex-shrink-0"
                checked={selectedIds.has(item.id)}
                onChange={() => onToggle(item.id)}
              />
              <div className="flex-1 min-w-0">{renderItem(item)}</div>
            </label>
          ))}
        </div>
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <button
            className="px-3 py-1 rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ‹ Trước
          </button>
          <span className="text-navy-500">
            {page} / {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded border border-navy-200 text-navy-600 hover:bg-navy-50 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Sau ›
          </button>
        </div>
      )}
    </div>
  );
}

/* ========== Difficulty Badge ========== */
function DiffBadge({ d }: { d: Difficulty }) {
  const cls =
    d === "EASY"
      ? "bg-green-100 text-green-700"
      : d === "MEDIUM"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";
  const lbl = d === "EASY" ? "Dễ" : d === "MEDIUM" ? "TB" : "Khó";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>
      {lbl}
    </span>
  );
}

/* ========== Main Component ========== */
export default function ExamSelection({
  onExamCreated,
}: {
  onExamCreated: () => void;
}) {
  const { accessToken, user } = useAuth();
  const canManualPick = user?.role === "LECTURER" || user?.role === "ADMIN";

  // Basic fields
  const [title, setTitle] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [topicId, setTopicId] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [includeRelated, setIncludeRelated] = useState(false);
  const [visibility, setVisibility] = useState<ExamVisibility>("PRIVATE");
  const [publishMode, setPublishMode] = useState<PublishMode>("now");
  const [publishAtLocal, setPublishAtLocal] = useState("");

  // Random mode counts
  const [questionCount, setQuestionCount] = useState(10);
  const [problemCount, setProblemCount] = useState(0);
  const [useQuestionAllocationRules, setUseQuestionAllocationRules] =
    useState(false);
  const [subjectQuestionMatrix, setSubjectQuestionMatrix] = useState<
    Record<string, SubjectDifficultyCounts>
  >({});
  const [useProblemDistribution, setUseProblemDistribution] = useState(false);
  const [problemEasyCount, setProblemEasyCount] = useState(0);
  const [problemMediumCount, setProblemMediumCount] = useState(0);
  const [problemHardCount, setProblemHardCount] = useState(0);

  // Selection mode
  const [mode, setMode] = useState<SelectionMode>("random");
  const [allocationPolicy, setAllocationPolicy] =
    useState<AllocationPolicy>("STRICT");

  // Shuffle toggles
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleChoices, setShuffleChoices] = useState(true);

  // Manual pick state — questions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [qSearch, setQSearch] = useState("");
  const [qPage, setQPage] = useState(1);
  const [qItems, setQItems] = useState<QuestionListItem[]>([]);
  const [qTotalPages, setQTotalPages] = useState(1);
  const [qLoading, setQLoading] = useState(false);

  // Manual pick state — problems
  const [selectedProblemIds, setSelectedProblemIds] = useState<Set<string>>(
    new Set(),
  );
  const [pSearch, setPSearch] = useState("");
  const [pPage, setPPage] = useState(1);
  const [pItems, setPItems] = useState<ProblemListItem[]>([]);
  const [pTotalPages, setPTotalPages] = useState(1);
  const [pLoading, setPLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch subjects
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const data = await questionsApiClient.getSubjects(
          accessToken || undefined,
        );
        setSubjects(data);
      } catch {
        // ignore
      }
    }
    fetchSubjects();
  }, [accessToken]);

  // Fetch topics when exactly one subject is selected
  useEffect(() => {
    if (subjectIds.length !== 1) {
      setTopics([]);
      setTopicId("");
      return;
    }
    async function fetchTopics() {
      try {
        const data = await questionsApiClient.getTopicsBySubject(
          subjectIds[0],
          accessToken || undefined,
        );
        setTopics(data);
      } catch {
        setTopics([]);
      }
    }
    fetchTopics();
  }, [subjectIds, accessToken]);

  useEffect(() => {
    setSubjectQuestionMatrix((prev) => {
      const next: Record<string, SubjectDifficultyCounts> = {};
      subjectIds.forEach((id) => {
        next[id] =
          prev[id] || {
            easy: 0,
            medium: 0,
            hard: 0,
          };
      });
      return next;
    });
  }, [subjectIds]);

  // Fetch questions for picker
  const fetchQuestions = useCallback(async () => {
    if (mode !== "manual") return;
    setQLoading(true);
    try {
      const res = await questionsApiClient.getQuestions(
        {
          page: qPage,
          limit: 10,
          search: qSearch || undefined,
          isPublished: true,
          subjectId: subjectIds.length === 1 ? subjectIds[0] : undefined,
          topicId: topicId || undefined,
        },
        accessToken || undefined,
      );
      setQItems(res.data);
      setQTotalPages(res.totalPages);
    } catch {
      setQItems([]);
    } finally {
      setQLoading(false);
    }
  }, [mode, qPage, qSearch, subjectIds, topicId, accessToken]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Fetch problems for picker
  const fetchProblems = useCallback(async () => {
    if (mode !== "manual") return;
    setPLoading(true);
    try {
      const res = await problemsApiClient.getProblems({
        page: pPage,
        limit: 10,
        search: pSearch || undefined,
        isPublished: true,
        subjectId: subjectIds.length === 1 ? subjectIds[0] : undefined,
        topicId: topicId || undefined,
      });
      setPItems(res.data);
      setPTotalPages(res.totalPages);
    } catch {
      setPItems([]);
    } finally {
      setPLoading(false);
    }
  }, [mode, pPage, pSearch, subjectIds, topicId]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // Toggle helpers
  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleProblem = (id: string) => {
    setSelectedProblemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubject = (id: string) => {
    setSubjectIds((prev) => {
      const exists = prev.includes(id);
      return exists ? prev.filter((v) => v !== id) : [...prev, id];
    });
    setTopicId("");
  };

  // Compute effective counts
  const effectiveQuestionCount =
    mode === "manual" ? selectedQuestionIds.size : questionCount;
  const effectiveProblemCount =
    mode === "manual" ? selectedProblemIds.size : problemCount;

  const isValid =
    effectiveQuestionCount + effectiveProblemCount > 0 && duration > 0;

  const handleCreate = async () => {
    if (!accessToken) {
      setError("Vui lòng đăng nhập để tạo đề thi.");
      return;
    }
    if (!isValid) {
      setError("Tổng số câu hỏi phải lớn hơn 0.");
      return;
    }

    if (mode === "random" && useProblemDistribution) {
      const sum = problemEasyCount + problemMediumCount + problemHardCount;
      if (sum !== problemCount) {
        setError("Tổng phân bổ độ khó bài code phải bằng số bài code.");
        return;
      }
    }

    if (mode === "random" && useQuestionAllocationRules) {
      if (subjectIds.length === 0) {
        setError("Vui lòng chọn ít nhất 1 môn khi dùng phân bổ theo môn.");
        return;
      }

      const sum = subjectIds.reduce(
        (acc, id) => {
          const row = subjectQuestionMatrix[id];
          return acc + (row?.easy || 0) + (row?.medium || 0) + (row?.hard || 0);
        },
        0,
      );
      if (sum !== questionCount) {
        setError("Tổng số câu theo từng môn phải bằng số câu trắc nghiệm.");
        return;
      }
    }

    if (visibility === "PUBLIC" && publishMode === "schedule") {
      if (!publishAtLocal) {
        setError("Vui lòng chọn thời điểm hẹn giờ đăng đề.");
        return;
      }

      const publishDate = new Date(publishAtLocal);
      if (Number.isNaN(publishDate.getTime())) {
        setError("Thời điểm đăng không hợp lệ.");
        return;
      }

      if (publishDate.getTime() <= Date.now()) {
        setError("Thời điểm hẹn giờ phải lớn hơn thời điểm hiện tại.");
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        title:
          title ||
          `Đề thi tự tạo - ${new Date().toLocaleDateString("vi-VN")}`,
        subjectId: subjectIds.length === 1 ? subjectIds[0] : undefined,
        subjectIds: subjectIds.length > 0 ? subjectIds : undefined,
        topicId: topicId || undefined,
        questionCount: mode === "manual" ? 0 : questionCount,
        problemCount: mode === "manual" ? 0 : problemCount,
        includeProblemsRelatedToQuestions: includeRelated,
        difficulty: difficulty || undefined,
        allocationPolicy: mode === "random" ? allocationPolicy : undefined,
        ...(mode === "random" && useProblemDistribution
          ? {
              problemDifficultyDistribution: {
                easy: problemEasyCount,
                medium: problemMediumCount,
                hard: problemHardCount,
              },
            }
          : {}),
        ...(mode === "random" && useQuestionAllocationRules
          ? {
              questionAllocationRules: subjectIds.reduce<
                Array<{ subjectId: string; difficulty: Difficulty; count: number }>
              >((rules, subjectId) => {
                const row = subjectQuestionMatrix[subjectId] || {
                  easy: 0,
                  medium: 0,
                  hard: 0,
                };

                if (row.easy > 0) {
                  rules.push({
                    subjectId,
                    difficulty: "EASY",
                    count: row.easy,
                  });
                }
                if (row.medium > 0) {
                  rules.push({
                    subjectId,
                    difficulty: "MEDIUM",
                    count: row.medium,
                  });
                }
                if (row.hard > 0) {
                  rules.push({
                    subjectId,
                    difficulty: "HARD",
                    count: row.hard,
                  });
                }

                return rules;
              }, []),
            }
          : {}),
        duration,
        shuffleQuestions,
        shuffleChoices,
        visibility,
        publishNow: visibility === "PUBLIC" && publishMode === "now",
        ...(visibility === "PUBLIC" && publishMode === "schedule"
          ? { publishAt: new Date(publishAtLocal).toISOString() }
          : {}),
        ...(mode === "manual" && selectedQuestionIds.size > 0
          ? { questionIds: Array.from(selectedQuestionIds) }
          : {}),
        ...(mode === "manual" && selectedProblemIds.size > 0
          ? { problemIds: Array.from(selectedProblemIds) }
          : {}),
      };

      if (mode === "manual") {
        await examsApiClient.createManualExam(payload, accessToken);
      } else {
        await examsApiClient.createRandomExam(payload, accessToken);
      }

      onExamCreated();
    } catch (err: any) {
      setError(err.message || "Không thể tạo đề thi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 mb-10 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-navy-600 mb-6 text-center">
        Tạo bộ đề thi mới
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="mb-4">
        <label className="block text-navy-700 font-semibold mb-2">
          Tên đề thi (tuỳ chọn)
        </label>
        <input
          type="text"
          className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
          placeholder="VD: Đề ôn tập Toán rời rạc"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Subject */}
      <div className="mb-4">
        <label className="block text-navy-700 font-semibold mb-2">
          Môn học (có thể chọn nhiều)
        </label>
        <div className="max-h-44 overflow-y-auto rounded-lg border border-navy-200 p-3">
          <div className="space-y-1">
            {subjects.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-navy-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-navy-300 text-navy-600 focus:ring-navy-500"
                  checked={subjectIds.includes(s.id)}
                  onChange={() => toggleSubject(s.id)}
                />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Topic */}
      {subjectIds.length === 1 && topics.length > 0 && (
        <div className="mb-4">
          <label className="block text-navy-700 font-semibold mb-2">
            Chủ đề
          </label>
          <select
            className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
          >
            <option value="">-- Tất cả --</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {subjectIds.length > 1 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Đang chọn nhiều môn, bộ lọc Chủ đề sẽ tạm tắt để tránh xung đột dữ liệu.
        </div>
      )}

      {/* Duration */}
      <div className="mb-4">
        <label className="block text-navy-700 font-semibold mb-2">
          Thời gian làm bài (phút)
        </label>
        <select
          className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        >
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d} phút
            </option>
          ))}
        </select>
      </div>

      {/* Difficulty */}
      <div className="mb-4">
        <label className="block text-navy-700 font-semibold mb-2">
          Mức độ đề thi
        </label>
        <select
          className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
        >
          <option value="">-- Không chọn --</option>
          {DIFFICULTY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Visibility & publish time */}
      <div className="mb-4 rounded-lg border border-navy-200 p-4">
        <label className="block text-navy-700 font-semibold mb-2">
          Quyền truy cập đề thi
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
              visibility === "PRIVATE"
                ? "border-navy-500 bg-navy-50 text-navy-700"
                : "border-navy-200 bg-white text-navy-600"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              className="mr-2"
              checked={visibility === "PRIVATE"}
              onChange={() => setVisibility("PRIVATE")}
            />
            Private (ẩn với sinh viên)
          </label>
          <label
            className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
              visibility === "PUBLIC"
                ? "border-navy-500 bg-navy-50 text-navy-700"
                : "border-navy-200 bg-white text-navy-600"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              className="mr-2"
              checked={visibility === "PUBLIC"}
              onChange={() => setVisibility("PUBLIC")}
            />
            Public (cho phép sinh viên thấy đề)
          </label>
        </div>

        {visibility === "PUBLIC" && (
          <div className="mt-3 space-y-3">
            <label className="block text-sm font-semibold text-navy-700">
              Thời điểm đăng
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                  publishMode === "now"
                    ? "border-navy-500 bg-navy-50 text-navy-700"
                    : "border-navy-200 bg-white text-navy-600"
                }`}
              >
                <input
                  type="radio"
                  name="publishMode"
                  className="mr-2"
                  checked={publishMode === "now"}
                  onChange={() => setPublishMode("now")}
                />
                Đăng ngay bây giờ
              </label>
              <label
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                  publishMode === "schedule"
                    ? "border-navy-500 bg-navy-50 text-navy-700"
                    : "border-navy-200 bg-white text-navy-600"
                }`}
              >
                <input
                  type="radio"
                  name="publishMode"
                  className="mr-2"
                  checked={publishMode === "schedule"}
                  onChange={() => setPublishMode("schedule")}
                />
                Hẹn giờ đăng
              </label>
            </div>

            {publishMode === "schedule" && (
              <div>
                <label className="mb-1 block text-xs text-navy-600">
                  Chọn ngày giờ đăng
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm"
                  value={publishAtLocal}
                  onChange={(e) => setPublishAtLocal(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====== Selection Mode Toggle ====== */}
      {canManualPick && (
        <div className="mb-5">
          <label className="block text-navy-700 font-semibold mb-2">
            Chế độ chọn câu hỏi
          </label>
          <div className="flex rounded-lg overflow-hidden border border-navy-200">
            <button
              type="button"
              className={`flex-1 px-4 py-2 text-sm font-medium transition ${
                mode === "random"
                  ? "bg-navy-600 text-white"
                  : "bg-white text-navy-600 hover:bg-navy-50"
              }`}
              onClick={() => setMode("random")}
            >
              Ngẫu nhiên
            </button>
            <button
              type="button"
              className={`flex-1 px-4 py-2 text-sm font-medium transition ${
                mode === "manual"
                  ? "bg-navy-600 text-white"
                  : "bg-white text-navy-600 hover:bg-navy-50"
              }`}
              onClick={() => setMode("manual")}
            >
              Chọn thủ công
            </button>
          </div>
        </div>
      )}

      {/* ====== Random Mode ====== */}
      {mode === "random" && (
        <>
          <div className="mb-4 rounded-lg border border-navy-200 p-4">
            <label className="block text-navy-700 font-semibold mb-2">
              Chính sách phân bổ
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                  allocationPolicy === "STRICT"
                    ? "border-navy-500 bg-navy-50 text-navy-700"
                    : "border-navy-200 bg-white text-navy-600"
                }`}
              >
                <input
                  type="radio"
                  name="allocationPolicy"
                  className="mr-2"
                  checked={allocationPolicy === "STRICT"}
                  onChange={() => setAllocationPolicy("STRICT")}
                />
                Strict
              </label>
              <label
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                  allocationPolicy === "FLEXIBLE"
                    ? "border-navy-500 bg-navy-50 text-navy-700"
                    : "border-navy-200 bg-white text-navy-600"
                }`}
              >
                <input
                  type="radio"
                  name="allocationPolicy"
                  className="mr-2"
                  checked={allocationPolicy === "FLEXIBLE"}
                  onChange={() => setAllocationPolicy("FLEXIBLE")}
                />
                Flexible
              </label>
            </div>
            <p className="mt-2 text-xs text-navy-500">
              Strict: thiếu dữ liệu sẽ báo lỗi. Flexible: cố gắng bù bằng mức độ khác trong cùng bộ lọc.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-navy-700 font-semibold mb-2">
              Số câu trắc nghiệm
            </label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
              value={questionCount}
              onChange={(e) =>
                setQuestionCount(Math.max(0, Number(e.target.value)))
              }
            />
          </div>

          {questionCount > 0 && (
            <div className="mb-4 rounded-lg border border-navy-200 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-navy-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-navy-300 text-navy-600 focus:ring-navy-500"
                  checked={useQuestionAllocationRules}
                  onChange={(e) => setUseQuestionAllocationRules(e.target.checked)}
                />
                <span>Phân bổ câu theo từng môn</span>
              </label>

              {useQuestionAllocationRules && (
                <>
                  {subjectIds.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Cần chọn ít nhất 1 môn để cấu hình phân bổ theo môn.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {subjectIds.map((id) => {
                        const subject = subjects.find((s) => s.id === id);
                        const row = subjectQuestionMatrix[id] || {
                          easy: 0,
                          medium: 0,
                          hard: 0,
                        };
                        return (
                          <div
                            key={id}
                            className="grid grid-cols-1 gap-2 rounded-lg border border-navy-100 p-3 sm:grid-cols-4"
                          >
                            <div className="text-sm text-navy-700 sm:col-span-1">
                              {subject?.name || id}
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-navy-600">Easy</label>
                              <input
                                type="number"
                                min={0}
                                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm"
                                value={row.easy}
                                onChange={(e) =>
                                  setSubjectQuestionMatrix((prev) => ({
                                    ...prev,
                                    [id]: {
                                      ...(prev[id] || { easy: 0, medium: 0, hard: 0 }),
                                      easy: Math.max(0, Number(e.target.value)),
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-navy-600">Medium</label>
                              <input
                                type="number"
                                min={0}
                                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm"
                                value={row.medium}
                                onChange={(e) =>
                                  setSubjectQuestionMatrix((prev) => ({
                                    ...prev,
                                    [id]: {
                                      ...(prev[id] || { easy: 0, medium: 0, hard: 0 }),
                                      medium: Math.max(0, Number(e.target.value)),
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-navy-600">Hard</label>
                              <input
                                type="number"
                                min={0}
                                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm"
                                value={row.hard}
                                onChange={(e) =>
                                  setSubjectQuestionMatrix((prev) => ({
                                    ...prev,
                                    [id]: {
                                      ...(prev[id] || { easy: 0, medium: 0, hard: 0 }),
                                      hard: Math.max(0, Number(e.target.value)),
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-navy-500">
                    Tổng hiện tại: {subjectIds.reduce((acc, id) => {
                      const row = subjectQuestionMatrix[id];
                      return acc + (row?.easy || 0) + (row?.medium || 0) + (row?.hard || 0);
                    }, 0)} / {questionCount}
                  </p>
                </>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-navy-700 font-semibold mb-2">
              Số bài code
            </label>
            <input
              type="number"
              min={0}
              max={50}
              className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
              value={problemCount}
              onChange={(e) =>
                setProblemCount(Math.max(0, Number(e.target.value)))
              }
            />
          </div>

          {problemCount > 0 && (
            <div className="mb-4 rounded-lg border border-navy-200 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-navy-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-navy-300 text-navy-600 focus:ring-navy-500"
                  checked={useProblemDistribution}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseProblemDistribution(checked);
                    if (!checked) {
                      setProblemEasyCount(0);
                      setProblemMediumCount(0);
                      setProblemHardCount(0);
                    }
                  }}
                />
                <span>Phân bổ độ khó bài code</span>
              </label>

              {useProblemDistribution && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-navy-600">Easy</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm"
                      value={problemEasyCount}
                      onChange={(e) => setProblemEasyCount(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-navy-600">Medium</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm"
                      value={problemMediumCount}
                      onChange={(e) => setProblemMediumCount(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-navy-600">Hard</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm"
                      value={problemHardCount}
                      onChange={(e) => setProblemHardCount(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                </div>
              )}

              {useProblemDistribution && (
                <p className="mt-2 text-xs text-navy-500">
                  Tổng hiện tại: {problemEasyCount + problemMediumCount + problemHardCount} / {problemCount}
                </p>
              )}
            </div>
          )}
          {problemCount > 0 && questionCount > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <input
                type="checkbox"
                id="includeRelated"
                className="w-5 h-5 rounded border-navy-300 text-navy-600 focus:ring-navy-500"
                checked={includeRelated}
                onChange={(e) => setIncludeRelated(e.target.checked)}
              />
              <label
                htmlFor="includeRelated"
                className="text-navy-700 font-medium"
              >
                Bài code liên quan đến nội dung câu hỏi
              </label>
            </div>
          )}
        </>
      )}

      {/* ====== Manual Pick Mode ====== */}
      {mode === "manual" && (
        <>
          {/* Question picker */}
          <ItemPicker<QuestionListItem>
            title="Câu trắc nghiệm"
            items={qItems}
            selectedIds={selectedQuestionIds}
            onToggle={toggleQuestion}
            search={qSearch}
            onSearchChange={setQSearch}
            page={qPage}
            totalPages={qTotalPages}
            onPageChange={setQPage}
            loading={qLoading}
            renderItem={(q) => (
              <div>
                <p className="text-sm text-navy-800 line-clamp-2">
                  {q.content}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <DiffBadge d={q.difficulty} />
                  <span className="text-xs text-navy-400">
                    {q.questionType === "SINGLE_CHOICE"
                      ? "Một đáp án"
                      : q.questionType === "MULTIPLE_CHOICE"
                        ? "Nhiều đáp án"
                        : "Tự luận"}
                  </span>
                  {q.subject && (
                    <span className="text-xs text-navy-400">
                      {q.subject.name}
                    </span>
                  )}
                </div>
              </div>
            )}
          />

          {/* Problem picker */}
          <ItemPicker<ProblemListItem>
            title="Bài code"
            items={pItems}
            selectedIds={selectedProblemIds}
            onToggle={toggleProblem}
            search={pSearch}
            onSearchChange={setPSearch}
            page={pPage}
            totalPages={pTotalPages}
            onPageChange={setPPage}
            loading={pLoading}
            renderItem={(p) => (
              <div>
                <p className="text-sm text-navy-800 font-medium">{p.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <DiffBadge d={p.difficulty} />
                  {p.subject && (
                    <span className="text-xs text-navy-400">
                      {p.subject.name}
                    </span>
                  )}
                </div>
              </div>
            )}
          />
        </>
      )}

      {/* ====== Shuffle Toggles ====== */}
      <div className="mb-6 space-y-3 pt-2 border-t border-navy-100">
        <p className="text-navy-700 font-semibold text-sm pt-3">
          Cài đặt xáo trộn
        </p>
        <Toggle
          checked={shuffleQuestions}
          onChange={setShuffleQuestions}
          label="Xáo trộn thứ tự câu hỏi (mỗi sinh viên nhận thứ tự khác nhau)"
        />
        <Toggle
          checked={shuffleChoices}
          onChange={setShuffleChoices}
          label="Xáo trộn thứ tự đáp án (mỗi sinh viên nhận thứ tự đáp án khác nhau)"
        />
      </div>

      {/* Summary */}
      <div className="mb-4 p-3 bg-navy-50 rounded-lg text-sm text-navy-700">
        Đề thi sẽ có <strong>{effectiveQuestionCount}</strong> câu trắc nghiệm
        và <strong>{effectiveProblemCount}</strong> bài code
        {mode === "manual" ? " (chọn thủ công)" : " (ngẫu nhiên)"}.
      </div>

      {/* Submit */}
      <button
        className="w-full px-6 py-3 rounded-lg font-bold text-lg border transition bg-navy-600 text-white border-navy-600 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isValid || loading}
        onClick={handleCreate}
      >
        {loading ? "Đang tạo đề..." : "Tạo đề thi"}
      </button>
    </div>
  );
}
