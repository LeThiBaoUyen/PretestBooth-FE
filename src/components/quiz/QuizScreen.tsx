"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { examsApiClient } from "@/lib/api/exams";
import { executionApi } from "@/lib/api/execution";
import { useAuth } from "@/lib/hooks";
import CodeEditor from "@/components/exam/CodeEditor";
import ProctoringOverlay from "@/components/ProctoringOverlay";
import type {
  ExecuteCodeResponse,
  LanguageInfo,
  SessionTerminatedEvent,
  SessionTimerAdjustedEvent,
  SessionResult,
  ShuffledExamSession,
  ShuffledItem,
} from "@/lib/api/types";
import { realtimeClient } from "@/lib/realtime/socketClient";

type AnswerValue = {
  selectedChoiceIds: string[];
  textAnswer: string | null;
  sourceCode?: string;
  language?: string;
  languageVersion?: string;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getDifficultyBadge(difficulty?: string) {
  if (!difficulty) return "bg-slate-100 text-slate-600";
  if (difficulty === "EASY") return "bg-emerald-100 text-emerald-700";
  if (difficulty === "MEDIUM") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

const QuizScreen = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, userLoading } = useAuth();
  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState<ShuffledExamSession | null>(null);
  const [items, setItems] = useState<ShuffledItem[]>([]);
  const [answerMap, setAnswerMap] = useState<Record<string, AnswerValue>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [runningCode, setRunningCode] = useState(false);
  const [codeOutput, setCodeOutput] = useState<ExecuteCodeResponse | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const codeSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const submittingRef = useRef(false);
  const allowUnsafeNavigationRef = useRef(false);
  const pendingExitActionRef = useRef<(() => void) | null>(null);

  const currentItem = items[currentIndex];
  const currentAnswer = currentItem ? answerMap[currentItem.id] : undefined;
  const strictExamProctoring = Boolean(
    session?.examType === "EXAM" && session?.proctoringEnabled,
  );
  const shouldGuardLeaving = Boolean(
    session &&
    session.status === "IN_PROGRESS" &&
    !showResult &&
    !submitting,
  );
  const postSessionRoute =
    result?.isPretestSession || session?.isPretestSession ? "/dashboard" : "/exams";

  const requestExitConfirmation = useCallback((action: () => void) => {
    pendingExitActionRef.current = action;
    setShowExitConfirm(true);
  }, []);

  const handleCancelExit = useCallback(() => {
    pendingExitActionRef.current = null;
    setShowExitConfirm(false);
  }, []);

  const handleConfirmExit = useCallback(() => {
    const action = pendingExitActionRef.current;
    pendingExitActionRef.current = null;
    setShowExitConfirm(false);

    if (!action) return;

    allowUnsafeNavigationRef.current = true;
    action();
    window.setTimeout(() => {
      allowUnsafeNavigationRef.current = false;
    }, 0);
  }, []);

  const answeredCount = useMemo(
    () => items.filter((item) => {
      const ans = answerMap[item.id];
      if (!ans) return false;

      if (item.question) {
        if (item.question.questionType === "SHORT_ANSWER") {
          return Boolean(ans.textAnswer && ans.textAnswer.trim().length > 0);
        }
        return (ans.selectedChoiceIds?.length || 0) > 0;
      }

      if (item.problem) {
        const language = ans.language || "";
        const starter = item.problem.starterCode?.[language] || "";
        const current = ans.sourceCode || "";
        return Boolean(current.trim().length > 0 && current.trim() !== starter.trim());
      }

      return false;
    }).length,
    [items, answerMap],
  );

  const saveAnswer = useCallback(
    (examItemId: string, value: AnswerValue, debounceMs = 500) => {
      if (!sessionId || !accessToken) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await examsApiClient.saveAnswer(
            sessionId,
            {
              examItemId,
              selectedChoiceIds: value.selectedChoiceIds,
              textAnswer: value.textAnswer,
              sourceCode: value.sourceCode,
              language: value.language,
              languageVersion: value.languageVersion,
            },
            accessToken,
          );
        } catch {
          // Keep silent to avoid interrupting quiz flow.
        }
      }, debounceMs);
    },
    [sessionId, accessToken],
  );

  const handleConfirmSubmit = useCallback(async () => {
    if (!sessionId || !accessToken || submittingRef.current) return;
    const token = accessToken;

    submittingRef.current = true;
    setSubmitting(true);
    setShowConfirm(false);

    try {
      const res = await examsApiClient.submitSession(sessionId, token);
      setResult(res);
      setShowResult(true);
    } catch (err: any) {
      setError(err?.message || "Không thể nộp bài.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [sessionId, accessToken]);

  useEffect(() => {
    const sid = sessionId ?? "";
    const token = accessToken ?? "";
    if (!sid || !token) return;

    async function fetchSession() {
      setLoading(true);
      setError("");

      try {
        const data = await examsApiClient.getSession(sid, token);
        setSession(data);

        const mergedItems = [...(data.questionItems || []), ...(data.problemItems || [])];
        setItems(mergedItems);

        const initialAnswers: Record<string, AnswerValue> = {};

        for (const ans of data.answers || []) {
          initialAnswers[ans.examItemId] = {
            selectedChoiceIds: ans.selectedChoiceIds || [],
            textAnswer: ans.textAnswer || null,
            sourceCode: ans.sourceCode || undefined,
            language: ans.language || undefined,
            languageVersion: ans.languageVersion || undefined,
          };
        }

        for (const item of mergedItems) {
          if (!item.problem) continue;

          const existing = initialAnswers[item.id];
          if (existing?.sourceCode) continue;

          const langs = Object.keys(item.problem.starterCode || {});
          const defaultLang = langs[0] || "python";
          initialAnswers[item.id] = {
            selectedChoiceIds: existing?.selectedChoiceIds || [],
            textAnswer: existing?.textAnswer || null,
            language: existing?.language || defaultLang,
            languageVersion: existing?.languageVersion || "*",
            sourceCode: item.problem.starterCode?.[defaultLang] || "",
          };
        }

        setAnswerMap(initialAnswers);

        const startedAt = new Date(data.startedAt).getTime();
        const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
        const remain = Math.max(0, data.duration * 60 - elapsedSec);
        setTimeLeft(remain);

        if (data.status !== "IN_PROGRESS") {
          try {
            const existingResult = await examsApiClient.getResults(sid, token);
            setResult(existingResult);
            setShowResult(true);
          } catch {
            // If results are not available yet, keep on quiz screen.
          }
        }
      } catch (err: any) {
        const status = err?.status;

        if (status === 409) {
          try {
            const latestResult = await examsApiClient.getResults(sid, token);
            setResult(latestResult);
            setShowResult(true);
            return;
          } catch {
            setError(err?.message || "Phiên thi không còn hợp lệ hoặc đã hết thời gian làm bài.");
            return;
          }
        }

        if (status === 401) {
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          return;
        }

        setError(err?.message || "Không thể tải phiên thi.");
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [sessionId, accessToken]);

  useEffect(() => {
    executionApi
      .getLanguages()
      .then(setLanguages)
      .catch(() => setLanguages([]));
  }, []);

  useEffect(() => {
    setCodeOutput(null);
  }, [currentIndex]);

  useEffect(() => {
    if (loading || showResult || submitting || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-submit: try backend endpoint first, fallback to client submit
          const triggerAutoSubmit = async () => {
            if (!sessionId || !accessToken || submittingRef.current) return;
            submittingRef.current = true;
            setSubmitting(true);

            try {
              // Try server-side auto-submit first (validates time on backend)
              const res = await examsApiClient.autoSubmitSession(sessionId, accessToken);
              setResult(res);
              setShowResult(true);
            } catch (err: any) {
              // Fallback: try regular submit (if auto-submit endpoint fails)
              try {
                const res = await examsApiClient.submitSession(sessionId, accessToken);
                setResult(res);
                setShowResult(true);
              } catch {
                setError(err?.message || "Không thể nộp bài tự động.");
              }
            } finally {
              submittingRef.current = false;
              setSubmitting(false);
            }
          };

          triggerAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, showResult, submitting, loading, handleConfirmSubmit]);

  useEffect(() => {
    if (!showResult || !result || result.pendingItems <= 0 || !sessionId || !accessToken) {
      return;
    }

    const pollId = setInterval(async () => {
      try {
        const latest = await examsApiClient.getResults(sessionId, accessToken);
        setResult(latest);
      } catch {
        // Ignore polling failures and keep showing latest known state.
      }
    }, 5000);

    return () => clearInterval(pollId);
  }, [showResult, result?.pendingItems, sessionId, accessToken]);

  useEffect(() => {
    if (!sessionId) return;

    const offAdjusted = realtimeClient.subscribe<SessionTimerAdjustedEvent>(
      "session.timer.adjusted",
      (payload) => {
        if (payload.sessionType !== "EXAM" || payload.sessionId !== sessionId) return;

        const remain = Math.max(
          0,
          Math.floor((new Date(payload.expiresAt).getTime() - Date.now()) / 1000),
        );
        setTimeLeft(remain);
      },
    );

    const offTerminated = realtimeClient.subscribe<SessionTerminatedEvent>(
      "session.terminated",
      async (payload) => {
        if (payload.sessionType !== "EXAM" || payload.sessionId !== sessionId) return;

        setSubmitting(false);
        submittingRef.current = false;

        if (accessToken) {
          try {
            const latest = await examsApiClient.getResults(sessionId, accessToken);
            setResult(latest);
            setShowResult(true);
            return;
          } catch {
            // If result is not available yet, keep a user-facing notice below.
          }
        }

        setError(payload.reason || "Phiên thi đã được kết thúc bởi quản trị viên/giảng viên.");
      },
    );

    return () => {
      offAdjusted();
      offTerminated();
    };
  }, [accessToken, sessionId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (codeSaveTimeoutRef.current) clearTimeout(codeSaveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!shouldGuardLeaving) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowUnsafeNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldGuardLeaving]);

  useEffect(() => {
    if (!shouldGuardLeaving) return;

    const guardState = {
      examLeaveGuard: true,
      sessionId,
      at: Date.now(),
    };
    window.history.pushState(guardState, "", window.location.href);

    const handlePopState = () => {
      if (allowUnsafeNavigationRef.current) return;

      window.history.pushState(guardState, "", window.location.href);
      requestExitConfirmation(() => {
        window.history.back();
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [shouldGuardLeaving, requestExitConfirmation, sessionId]);

  useEffect(() => {
    if (!shouldGuardLeaving) return;

    const handleAnchorNavigation = (event: MouseEvent) => {
      if (allowUnsafeNavigationRef.current || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (href === currentUrl) return;

      event.preventDefault();
      requestExitConfirmation(() => {
        router.push(href);
      });
    };

    document.addEventListener("click", handleAnchorNavigation, true);
    return () => document.removeEventListener("click", handleAnchorNavigation, true);
  }, [shouldGuardLeaving, requestExitConfirmation, router]);

  const handleChoiceSelect = (choiceId: string) => {
    if (!currentItem?.question) return;

    const prev = answerMap[currentItem.id] || {
      selectedChoiceIds: [],
      textAnswer: null,
    };

    const isMultiple = currentItem.question.questionType === "MULTIPLE_CHOICE";
    const currentlySelected = prev.selectedChoiceIds || [];
    const isSelected = currentlySelected.includes(choiceId);

    const selectedChoiceIds = isMultiple
      ? isSelected
        ? currentlySelected.filter((id) => id !== choiceId)
        : [...currentlySelected, choiceId]
      : isSelected
        ? []
        : [choiceId];

    const nextValue: AnswerValue = {
      ...prev,
      selectedChoiceIds,
      textAnswer: prev.textAnswer || null,
    };

    setAnswerMap((old) => ({ ...old, [currentItem.id]: nextValue }));
    saveAnswer(currentItem.id, nextValue);
  };

  const handleTextAnswer = (text: string) => {
    if (!currentItem?.question) return;

    const prev = answerMap[currentItem.id] || {
      selectedChoiceIds: [],
      textAnswer: null,
    };

    const nextValue: AnswerValue = {
      ...prev,
      textAnswer: text,
      selectedChoiceIds: prev.selectedChoiceIds || [],
    };

    setAnswerMap((old) => ({ ...old, [currentItem.id]: nextValue }));
    saveAnswer(currentItem.id, nextValue);
  };

  const handleCodeChange = (value: string | undefined) => {
    if (!currentItem?.problem) return;

    const prev = answerMap[currentItem.id] || {
      selectedChoiceIds: [],
      textAnswer: null,
      language: "python",
      languageVersion: "*",
    };

    const nextValue: AnswerValue = {
      ...prev,
      sourceCode: value || "",
    };

    setAnswerMap((old) => ({ ...old, [currentItem.id]: nextValue }));

    if (codeSaveTimeoutRef.current) clearTimeout(codeSaveTimeoutRef.current);
    codeSaveTimeoutRef.current = setTimeout(() => {
      saveAnswer(currentItem.id, nextValue, 0);
    }, 800);
  };

  const handleLanguageChange = (lang: string) => {
    if (!currentItem?.problem) return;

    const prev = answerMap[currentItem.id] || {
      selectedChoiceIds: [],
      textAnswer: null,
      sourceCode: "",
    };

    const normalizedLang = lang.toLowerCase();
    const matched = languages.find((l) => {
      if (l.language.toLowerCase() === normalizedLang) return true;
      if (l.runtime?.toLowerCase().includes(normalizedLang)) return true;
      return (l.aliases || []).some((alias) => alias.toLowerCase() === normalizedLang);
    });
    const version = matched?.version || "*";

    const oldLanguage = prev.language || "";
    const oldStarter = currentItem.problem.starterCode?.[oldLanguage] || "";
    const nextStarter = currentItem.problem.starterCode?.[lang] || "";
    const currentCode = prev.sourceCode || "";

    const shouldReplaceWithStarter = !currentCode || currentCode === oldStarter;

    const nextValue: AnswerValue = {
      ...prev,
      language: lang,
      languageVersion: version,
      sourceCode: shouldReplaceWithStarter ? nextStarter : currentCode,
    };

    setAnswerMap((old) => ({ ...old, [currentItem.id]: nextValue }));
    saveAnswer(currentItem.id, nextValue);
  };

  const handleRunCode = async () => {
    if (!currentItem?.problem) return;

    const answer = answerMap[currentItem.id];
    if (!answer?.sourceCode || !answer.language) return;

    setRunningCode(true);
    setCodeOutput(null);

    try {
      const output = await executionApi.executeCode(
        {
          language: answer.language,
          version: answer.languageVersion || undefined,
          source: answer.sourceCode,
          functionName: currentItem.problem.functionName || undefined,
          inputTypes: currentItem.problem.inputTypes || undefined,
        },
        accessToken || undefined,
      );

      setCodeOutput(output);
    } catch (err: any) {
      setCodeOutput({
        language: answer.language,
        version: answer.languageVersion || "",
        stdout: "",
        stderr: err?.message || "Lỗi thực thi",
        output: "",
        exitCode: 1,
        signal: null,
        isSuccess: false,
        isCompileError: false,
        executionTime: 0,
        networkTime: 0,
        totalTime: 0,
      });
    } finally {
      setRunningCode(false);
    }
  };

  const goPrev = () => setCurrentIndex((v) => Math.max(0, v - 1));
  const goNext = () => setCurrentIndex((v) => Math.min(items.length - 1, v + 1));

  if (!sessionId) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Không tìm thấy phiên thi</h2>
          <p className="mt-2 text-slate-600">Liên kết phiên thi không hợp lệ hoặc đã hết hạn.</p>
          <Link
            href="/exams"
            className="mt-6 inline-block rounded-lg bg-navy-600 px-5 py-2.5 font-semibold text-white hover:bg-navy-700"
          >
            Quay lại danh sách đề
          </Link>
        </div>
      </div>
    );
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm text-slate-600">
          Đang tải phiên thi...
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Bạn cần đăng nhập</h2>
          <p className="mt-2 text-slate-600">Hãy đăng nhập để tiếp tục làm bài thi.</p>
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

  if (error && !session) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-xl font-bold text-red-700">Không thể tải phiên thi</h2>
          <p className="mt-2 text-red-600">{error}</p>
          <Link
            href="/exams"
            className="mt-6 inline-block rounded-lg bg-navy-600 px-5 py-2.5 font-semibold text-white hover:bg-navy-700"
          >
            Quay lại danh sách đề
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {sessionId && strictExamProctoring && (
        <ProctoringOverlay sessionId={sessionId} isActive={true} enforceFullscreen={true} />
      )}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-900">Rời khỏi bài thi?</h3>
            <p className="mt-2 text-slate-600">
              Bạn chưa nộp bài. Nếu rời trang bây giờ, bài thi vẫn được lưu và bạn có thể quay lại khi còn thời gian.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCancelExit}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ở lại làm bài
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-navy-700"
              >
                Rời khỏi bài thi
              </button>
            </div>
          </div>
        </div>
      )}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-900">Xác nhận nộp bài</h3>
            <p className="mt-2 text-slate-600">Bạn đã hoàn thành {answeredCount}/{items.length} câu.</p>
            <div className="mt-4 grid grid-cols-8 gap-2">
              {items.map((item, idx) => {
                const answered = !!answerMap[item.id] && (answerMap[item.id].selectedChoiceIds.length > 0 || !!answerMap[item.id].textAnswer || !!answerMap[item.id].sourceCode);
                return (
                  <span
                    key={item.id}
                    className={`inline-flex h-8 items-center justify-center rounded-md text-sm font-bold ${answered ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                  >
                    {idx + 1}
                  </span>
                );
              })}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 rounded-lg bg-navy-600 px-4 py-2.5 font-semibold text-white hover:bg-navy-700"
              >
                Xác nhận nộp
              </button>
            </div>
          </div>
        </div>
      )}

      {showResult && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
            <h3 className="text-3xl font-bold text-slate-900">Kết quả bài thi</h3>
            <p className="mt-2 text-slate-600">{result.examTitle}</p>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Điểm số</p>
              <p className="text-4xl font-extrabold text-emerald-600">
                {result.score ?? 0}/{result.maxScore ?? 0}
              </p>
              {result.isPretestSession && result.pretestAttemptNumber !== null && (
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  Lần thi pretest: {result.pretestAttemptNumber}
                </p>
              )}
              {result.appliedPassingScoreAbsolute !== null && (
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Ngưỡng đạt áp dụng: {result.appliedPassingScoreAbsolute}
                  {result.pretestThresholdSource === "EXAM" && " (theo đề được gán)"}
                  {result.pretestThresholdSource === "PRETEST_CONFIG" && " (theo cấu hình pretest)"}
                </p>
              )}
              {result.passed !== null && (
                <p
                  className={`mt-1 text-sm font-bold ${
                    result.passed ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {result.passed ? "Kết luận: ĐẠT" : "Kết luận: CHƯA ĐẠT"}
                </p>
              )}
              <p className="mt-2 text-sm text-slate-600">
                Đúng {result.correctItems}/{result.totalItems}
                {result.pendingItems > 0 && ` • Chờ chấm: ${result.pendingItems}`}
              </p>
              {!result.canViewItemDetails && (
                <p className="mt-2 text-xs text-slate-600">
                  Đề thi này chỉ cho phép xem điểm tổng quan, không hiển thị chi tiết từng câu.
                </p>
              )}
              {result.pendingItems > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Hệ thống đang tự động cập nhật kết quả mỗi 5 giây.
                </p>
              )}
            </div>

            <button
              onClick={() => router.push(postSessionRoute)}
              className="mt-6 w-full rounded-lg bg-navy-600 px-4 py-3 font-semibold text-white hover:bg-navy-700"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-12 lg:px-6">
        <section className="lg:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Phiên thi</p>
                  <h1 className="text-xl font-bold text-slate-900">{session?.examTitle || "Làm bài thi"}</h1>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
                  Còn lại: {formatTime(timeLeft)}
                </div>
                <button
                  type="button"
                  onClick={() => requestExitConfirmation(() => router.push(postSessionRoute))}
                  className="inline-flex w-fit items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Thoát bài thi
                </button>
              </div>
            </div>

            {currentItem && (
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${currentItem.section === "QUESTION" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                    {currentItem.section === "QUESTION" ? "Trắc nghiệm" : "Bài code"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {currentItem.points} điểm
                  </span>
                  {currentItem.question?.difficulty && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getDifficultyBadge(currentItem.question.difficulty)}`}>
                      {currentItem.question.difficulty}
                    </span>
                  )}
                </div>

                {currentItem.question && (
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Câu {currentIndex + 1}: {currentItem.question.content}
                    </h2>
                    {currentItem.question.imageUrl && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <img
                          src={currentItem.question.imageUrl}
                          alt={`Ảnh minh họa câu ${currentIndex + 1}`}
                          className="max-h-80 w-full rounded-lg object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {(currentItem.question.questionType === "SINGLE_CHOICE" ||
                      currentItem.question.questionType === "MULTIPLE_CHOICE") &&
                      currentItem.question.choices && (
                        <div className="mt-4 space-y-3">
                          {currentItem.question.choices.map((choice, idx) => {
                            const selected = currentAnswer?.selectedChoiceIds?.includes(choice.id) || false;
                            return (
                              <button
                                key={choice.id}
                                type="button"
                                onClick={() => handleChoiceSelect(choice.id)}
                                className={`w-full rounded-xl border px-4 py-3 text-left transition ${selected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
                              >
                                <span className="mr-2 font-bold">{String.fromCharCode(65 + idx)}.</span>
                                {choice.content}
                              </button>
                            );
                          })}
                        </div>
                      )}

                    {currentItem.question.questionType === "SHORT_ANSWER" && (
                      <textarea
                        rows={6}
                        className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
                        placeholder="Nhập câu trả lời..."
                        value={currentAnswer?.textAnswer || ""}
                        onChange={(e) => handleTextAnswer(e.target.value)}
                      />
                    )}
                  </div>
                )}

                {currentItem.problem && (
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Câu {currentIndex + 1}: {currentItem.problem.title}
                    </h2>

                    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                        Xem đề bài và ràng buộc
                      </summary>
                      <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-700">
                        <p className="whitespace-pre-wrap leading-relaxed">{currentItem.problem.description}</p>
                        {currentItem.problem.constraints && (
                          <p className="mt-2 text-slate-600">
                            <span className="font-semibold">Ràng buộc:</span> {currentItem.problem.constraints}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">
                          Time limit: {currentItem.problem.timeLimit}ms • Memory: {currentItem.problem.memoryLimit}MB
                        </p>
                      </div>
                    </details>

                    <div className="mt-4 h-[360px]">
                      <CodeEditor
                        code={currentAnswer?.sourceCode || ""}
                        language={currentAnswer?.language || "python"}
                        onChange={handleCodeChange}
                        onLanguageChange={handleLanguageChange}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRunCode}
                        disabled={runningCode || !currentAnswer?.sourceCode}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {runningCode ? "Đang chạy..." : "Chạy thử"}
                      </button>
                      <span className="text-xs text-slate-500">Code được tự động lưu, bài code sẽ được chấm khi nộp.</span>
                    </div>

                    {codeOutput && (
                      <div className="mt-3 rounded-xl bg-[#111827] p-4 text-xs text-slate-200">
                        <p className={`mb-2 font-semibold ${codeOutput.isSuccess ? "text-emerald-400" : "text-red-400"}`}>
                          {codeOutput.isSuccess ? "Thành công" : "Lỗi thực thi"}
                          {codeOutput.executionTime > 0 && ` • ${codeOutput.executionTime}ms`}
                        </p>
                        {codeOutput.stdout && <pre className="whitespace-pre-wrap">{codeOutput.stdout}</pre>}
                        {codeOutput.stderr && <pre className="whitespace-pre-wrap text-red-300">{codeOutput.stderr}</pre>}
                        {codeOutput.compileOutput && (
                          <pre className="whitespace-pre-wrap text-amber-300">{codeOutput.compileOutput}</pre>
                        )}
                        {!codeOutput.stdout && !codeOutput.stderr && !codeOutput.compileOutput && (
                          <p className="text-slate-400">Không có output</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Câu trước
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={currentIndex === items.length - 1}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Câu tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    disabled={submitting}
                    className="sm:ml-auto rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submitting ? "Đang nộp..." : "Nộp bài"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Tiến độ</h3>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {answeredCount}/{items.length} câu đã làm
            </p>
            <div className="mt-4 grid grid-cols-6 gap-2">
              {items.map((item, idx) => {
                const active = idx === currentIndex;
                const ans = answerMap[item.id];
                const answered = !!ans && (ans.selectedChoiceIds.length > 0 || !!ans.textAnswer || !!ans.sourceCode);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-lg text-sm font-bold transition ${active ? "bg-navy-600 text-white" : answered ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default QuizScreen;
