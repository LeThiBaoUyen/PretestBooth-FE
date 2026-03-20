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
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [difficulty, setDifficulty] = useState<Difficulty | "">("MEDIUM");
  const [includeRelated, setIncludeRelated] = useState(false);

  // Random mode counts
  const [questionCount, setQuestionCount] = useState(10);
  const [problemCount, setProblemCount] = useState(0);

  // Selection mode
  const [mode, setMode] = useState<SelectionMode>("random");

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

  // Fetch topics when subject changes
  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      setTopicId("");
      return;
    }
    async function fetchTopics() {
      try {
        const data = await questionsApiClient.getTopicsBySubject(
          subjectId,
          accessToken || undefined,
        );
        setTopics(data);
      } catch {
        setTopics([]);
      }
    }
    fetchTopics();
  }, [subjectId, accessToken]);

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
          subjectId: subjectId || undefined,
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
  }, [mode, qPage, qSearch, subjectId, topicId, accessToken]);

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
        subjectId: subjectId || undefined,
        topicId: topicId || undefined,
      });
      setPItems(res.data);
      setPTotalPages(res.totalPages);
    } catch {
      setPItems([]);
    } finally {
      setPLoading(false);
    }
  }, [mode, pPage, pSearch, subjectId, topicId]);

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
    setLoading(true);
    setError("");
    try {
      await examsApiClient.createExam(
        {
          title:
            title ||
            `Đề thi tự tạo - ${new Date().toLocaleDateString("vi-VN")}`,
          subjectId: subjectId || undefined,
          topicId: topicId || undefined,
          questionCount: mode === "manual" ? 0 : questionCount,
          problemCount: mode === "manual" ? 0 : problemCount,
          includeProblemsRelatedToQuestions: includeRelated,
          difficulty: difficulty || undefined,
          duration,
          shuffleQuestions,
          shuffleChoices,
          ...(mode === "manual" && selectedQuestionIds.size > 0
            ? { questionIds: Array.from(selectedQuestionIds) }
            : {}),
          ...(mode === "manual" && selectedProblemIds.size > 0
            ? { problemIds: Array.from(selectedProblemIds) }
            : {}),
        },
        accessToken,
      );
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
          Môn học
        </label>
        <select
          className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
        >
          <option value="">-- Tất cả --</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Topic */}
      {subjectId && topics.length > 0 && (
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
