"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { examsApiClient } from "@/lib/api/exams";
import { useAuth } from "@/lib/hooks";
import type {
  ShuffledExamSession,
  ShuffledItem,
  SessionResult,
} from "@/lib/api/types";

const QuizScreen = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { accessToken } = useAuth();

  // Session data
  const [session, setSession] = useState<ShuffledExamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // All items combined (questions first, then problems)
  const [allItems, setAllItems] = useState<ShuffledItem[]>([]);
  // Map: examItemId -> { selectedChoiceIds, textAnswer }
  const [answerMap, setAnswerMap] = useState<
    Record<string, { selectedChoiceIds: string[]; textAnswer: string | null }>
  >({});

  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Save debounce ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch session
  useEffect(() => {
    if (!sessionId || !accessToken) return;
    async function fetchSession() {
      setLoading(true);
      try {
        const data = await examsApiClient.getSession(sessionId!, accessToken!);
        setSession(data);
        const items = [
          ...(data.questionItems || []),
          ...(data.problemItems || []),
        ];
        setAllItems(items);

        // Restore previously saved answers
        const map: Record<
          string,
          { selectedChoiceIds: string[]; textAnswer: string | null }
        > = {};
        for (const ans of data.answers || []) {
          map[ans.examItemId] = {
            selectedChoiceIds: ans.selectedChoiceIds || [],
            textAnswer: ans.textAnswer || null,
          };
        }
        setAnswerMap(map);

        // Calculate remaining time
        const startedAt = new Date(data.startedAt).getTime();
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const totalSeconds = data.duration * 60;
        setTimeLeft(Math.max(0, totalSeconds - elapsed));
      } catch (err: any) {
        setError(err.message || "Không thể tải phiên thi.");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId, accessToken]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || showResult) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time runs out
          handleConfirmSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft > 0, showResult]);

  // Save answer to API (debounced)
  const saveAnswer = useCallback(
    (
      examItemId: string,
      selectedChoiceIds: string[],
      textAnswer: string | null,
    ) => {
      if (!sessionId || !accessToken) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await examsApiClient.saveAnswer(
            sessionId,
            { examItemId, selectedChoiceIds, textAnswer },
            accessToken,
          );
        } catch {
          // silently ignore save errors
        }
      }, 500);
    },
    [sessionId, accessToken],
  );

  const handleChoiceSelect = (choiceId: string) => {
    const item = allItems[current];
    if (!item) return;
    const prev = answerMap[item.id]?.selectedChoiceIds || [];
    // For multiple-choice, toggle; for single-answer questions, we do single select
    // Since we don't know if multi-select, use single-select for MULTIPLE_CHOICE
    const isSelected = prev.includes(choiceId);
    let newSelected: string[];
    if (item.question?.questionType === "MULTIPLE_CHOICE") {
      newSelected = isSelected
        ? prev.filter((id) => id !== choiceId)
        : [...prev, choiceId];
    } else {
      newSelected = isSelected ? [] : [choiceId];
    }
    const newMap = {
      ...answerMap,
      [item.id]: {
        selectedChoiceIds: newSelected,
        textAnswer: answerMap[item.id]?.textAnswer || null,
      },
    };
    setAnswerMap(newMap);
    saveAnswer(item.id, newSelected, newMap[item.id].textAnswer);
  };

  const handleTextAnswer = (text: string) => {
    const item = allItems[current];
    if (!item) return;
    const newMap = {
      ...answerMap,
      [item.id]: {
        selectedChoiceIds: answerMap[item.id]?.selectedChoiceIds || [],
        textAnswer: text,
      },
    };
    setAnswerMap(newMap);
    saveAnswer(item.id, newMap[item.id].selectedChoiceIds, text);
  };

  const handleNext = () => {
    if (current < allItems.length - 1) setCurrent(current + 1);
  };

  const handlePrev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  const handleSubmit = () => {
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!sessionId || !accessToken) return;
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const res = await examsApiClient.submitSession(sessionId, accessToken);
      setResult(res);
      setShowResult(true);
    } catch (err: any) {
      alert(err.message || "Không thể nộp bài.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = () => {
    setShowConfirm(false);
  };

  const handleFinish = () => {
    router.push("/dashboard");
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isAnswered = (item: ShuffledItem) => {
    const ans = answerMap[item.id];
    if (!ans) return false;
    return ans.selectedChoiceIds?.length > 0 || !!ans.textAnswer;
  };

  // Loading & error states
  if (!sessionId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4faff",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#0d47a1",
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          Không tìm thấy phiên thi.{" "}
          <a href="/dashboard" style={{ color: "#1976d2" }}>
            Quay lại
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4faff",
        }}
      >
        <div style={{ color: "#0d47a1", fontWeight: 700, fontSize: 20 }}>
          Đang tải phiên thi...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4faff",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#e53935",
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {error} <br />
          <a href="/dashboard" style={{ color: "#1976d2" }}>
            Quay lại
          </a>
        </div>
      </div>
    );
  }

  const currentItem = allItems[current];
  const currentAnswer = currentItem ? answerMap[currentItem.id] : null;

  return (
    <div
      style={{
        background: "linear-gradient(90deg, #0d47a1 0%, #1976d2 100%)",
        minHeight: "100vh",
        width: "100vw",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 0,
        overflow: "auto",
      }}
    >
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "stretch",
        }}
      >
        {/* Modal xác nhận nộp bài */}
        {showConfirm && (
          <div
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.18)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                boxShadow: "0 2px 24px #0003",
                minWidth: 420,
                maxWidth: 480,
                width: "100%",
                padding: "32px 28px 28px 28px",
                border: "2.5px solid #e3f2fd",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 24,
                  color: "#0d47a1",
                  marginBottom: 18,
                }}
              >
                Xác nhận nộp bài
              </div>
              <div style={{ color: "#333", fontSize: 17, marginBottom: 18 }}>
                Bạn đã trả lời các câu sau:
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                {allItems.map((item, idx) => (
                  <span
                    key={item.id}
                    style={{
                      display: "inline-block",
                      minWidth: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isAnswered(item) ? "#43a047" : "#e53935",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: "32px",
                      textAlign: "center",
                      boxShadow: isAnswered(item)
                        ? "0 1px 4px #43a04733"
                        : "0 1px 4px #e5393533",
                    }}
                  >
                    {idx + 1}
                  </span>
                ))}
              </div>
              <div style={{ color: "#888", fontSize: 15, marginBottom: 18 }}>
                <span style={{ color: "#43a047", fontWeight: 700 }}>Xanh</span>:
                Đã làm &nbsp;|&nbsp;{" "}
                <span style={{ color: "#e53935", fontWeight: 700 }}>Đỏ</span>:
                Chưa làm
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 18,
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={handleCancelSubmit}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: 10,
                    border: "none",
                    background: "#fff",
                    color: "#1976d2",
                    fontWeight: 900,
                    fontSize: 17,
                    boxShadow: "0 1px 4px #0001",
                    borderLeft: "6px solid #1976d2",
                    minWidth: 0,
                    transition: "all 0.15s",
                    marginRight: 8,
                    borderBottom: "3px solid #1976d2",
                    cursor: "pointer",
                  }}
                >
                  Huỷ
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: 10,
                    border: "none",
                    background:
                      "linear-gradient(90deg, #1976d2 0%, #2196f3 100%)",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 17,
                    minWidth: 0,
                    boxShadow: "0 1px 4px #0001",
                    transition: "all 0.15s",
                    marginLeft: 8,
                    borderBottom: "3px solid #1976d2",
                    cursor: "pointer",
                  }}
                >
                  Xác nhận nộp bài
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal kết quả */}
        {showResult && result && (
          <div
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.18)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(180deg, #fafdff 80%, #e3f2fd 100%)",
                borderRadius: 18,
                boxShadow: "0 2px 24px #0003",
                minWidth: 420,
                maxWidth: 480,
                width: "100%",
                padding: "36px 32px 32px 32px",
                border: "2.5px solid #e3f2fd",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <img
                  src="/assets/iuhcm-logo.png"
                  alt="logo"
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: "contain",
                    borderRadius: 12,
                    background: "#fff",
                  }}
                />
                <span
                  style={{
                    color: "#0d47a1",
                    fontWeight: 900,
                    fontSize: 28,
                    textShadow: "0 2px 8px #0001",
                    letterSpacing: 0.5,
                  }}
                >
                  Kết quả bài thi
                </span>
              </div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: "#0d47a1",
                  margin: "18px 0 8px 0",
                }}
              >
                Điểm số của bạn:{" "}
                <span
                  style={{ color: "#43a047", fontWeight: 900, fontSize: 28 }}
                >
                  {result.score ?? "?"}/{result.maxScore ?? "?"}
                </span>
              </div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: "#0d47a1",
                  margin: "8px 0 18px 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <span style={{ color: "#43a047", fontSize: 26 }}>✔</span>
                Đúng: {result.correctItems}/{result.totalItems}
                {result.pendingItems > 0 && (
                  <span
                    style={{ color: "#ff9800", fontSize: 16, fontWeight: 600 }}
                  >
                    {" "}
                    (chờ chấm: {result.pendingItems})
                  </span>
                )}
              </div>
              <div
                style={{ color: "#444", fontSize: 17, margin: "12px 0 8px 0" }}
              >
                Chúc mừng bạn đã hoàn thành bài thi!
              </div>
              <div style={{ color: "#444", fontSize: 16, marginBottom: 24 }}>
                {result.examTitle}
              </div>
              <button
                onClick={handleFinish}
                style={{
                  marginTop: 8,
                  padding: "14px 0",
                  width: "100%",
                  borderRadius: 10,
                  border: "none",
                  background:
                    "linear-gradient(90deg, #1976d2 0%, #2196f3 100%)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 20,
                  boxShadow: "0 1px 8px #0001",
                  letterSpacing: 0.5,
                  transition: "all 0.15s",
                  cursor: "pointer",
                }}
              >
                Hoàn tất
              </button>
            </div>
          </div>
        )}
        <div
          style={{
            width: "100vw",
            maxWidth: "100vw",
            minHeight: "100vh",
            background: "#f4faff",
            borderRadius: 0,
            boxShadow: "none",
            display: "flex",
            padding: 0,
            overflow: "hidden",
          }}
        >
          {/* Left: Question / Problem */}
          <div
            style={{
              flex: 2.2,
              padding: "48px 40px 40px 0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minWidth: 0,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 32,
                  justifyContent: "center",
                  minHeight: 90,
                }}
              >
                <img
                  src="/assets/iuhcm-logo.png"
                  alt="logo"
                  style={{
                    width: 72,
                    height: 72,
                    marginRight: 18,
                    objectFit: "contain",
                  }}
                />
                <h2
                  style={{
                    color: "#0d47a1",
                    fontWeight: 900,
                    fontSize: 32,
                    textShadow: "0 2px 8px #0001",
                    letterSpacing: 0.5,
                    lineHeight: 1.1,
                  }}
                >
                  {session?.examTitle || "Làm bài thi"}
                </h2>
              </div>
              {currentItem && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                    padding: "36px 72px 28px 72px",
                    margin: "32px auto 0 auto",
                    maxWidth: 900,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    minHeight: 0,
                    border: "2.5px solid #e0e0e0",
                    boxShadow: "0 2px 16px #0003",
                    backgroundClip: "padding-box",
                  }}
                >
                  <div
                    style={{
                      flex: "unset",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-start",
                    }}
                  >
                    {/* Section badge */}
                    <div style={{ marginBottom: 12 }}>
                      <span
                        style={{
                          background:
                            currentItem.section === "QUESTION"
                              ? "#e3f2fd"
                              : "#fff3e0",
                          color:
                            currentItem.section === "QUESTION"
                              ? "#1976d2"
                              : "#e65100",
                          padding: "4px 12px",
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {currentItem.section === "QUESTION"
                          ? "Trắc nghiệm"
                          : "Bài code"}{" "}
                        • {currentItem.points} điểm
                      </span>
                    </div>

                    {/* Question content */}
                    {currentItem.question && (
                      <>
                        <div
                          style={{
                            fontWeight: 900,
                            marginBottom: 22,
                            fontSize: 22,
                            color: "#0d47a1",
                            lineHeight: 1.3,
                            wordBreak: "break-word",
                          }}
                        >
                          <span
                            style={{
                              color: "#0d47a1",
                              fontWeight: 900,
                              fontSize: 24,
                            }}
                          >
                            Câu {current + 1}:
                          </span>{" "}
                          <span
                            style={{
                              fontWeight: 600,
                              color: "#222",
                              fontSize: 22,
                            }}
                          >
                            {currentItem.question.content}
                          </span>
                        </div>
                        {currentItem.question.choices && (
                          <div>
                            {currentItem.question.choices.map((choice, idx) => {
                              const isSelected =
                                currentAnswer?.selectedChoiceIds?.includes(
                                  choice.id,
                                ) ?? false;
                              return (
                                <div
                                  key={choice.id}
                                  style={{ marginBottom: 14 }}
                                >
                                  <label
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      cursor: "pointer",
                                      background: isSelected
                                        ? "#e3f2fd"
                                        : "transparent",
                                      borderRadius: 12,
                                      padding: "12px 24px",
                                      fontWeight: isSelected ? 900 : 700,
                                      color: isSelected ? "#1976d2" : "#222",
                                      border: isSelected
                                        ? "2.5px solid #1976d2"
                                        : "1.5px solid #e0e0e0",
                                      boxShadow: isSelected
                                        ? "0 2px 8px #1976d233"
                                        : "none",
                                      fontSize: 22,
                                      minHeight: 38,
                                      transition: "all 0.15s",
                                    }}
                                    onClick={() =>
                                      handleChoiceSelect(choice.id)
                                    }
                                  >
                                    <span
                                      style={{
                                        fontWeight: 900,
                                        width: 38,
                                        display: "inline-block",
                                        color: "#1976d2",
                                        fontSize: 22,
                                      }}
                                    >
                                      {String.fromCharCode(65 + idx)}.
                                    </span>{" "}
                                    {choice.content}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Short answer (TEXT type) */}
                        {currentItem.question.questionType ===
                          "SHORT_ANSWER" && (
                          <textarea
                            rows={4}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: 12,
                              border: "1.5px solid #e0e0e0",
                              fontSize: 18,
                              resize: "vertical",
                            }}
                            placeholder="Nhập câu trả lời..."
                            value={currentAnswer?.textAnswer || ""}
                            onChange={(e) => handleTextAnswer(e.target.value)}
                          />
                        )}
                      </>
                    )}

                    {/* Problem content */}
                    {currentItem.problem && (
                      <div>
                        <div
                          style={{
                            fontWeight: 900,
                            marginBottom: 16,
                            fontSize: 22,
                            color: "#0d47a1",
                            lineHeight: 1.3,
                          }}
                        >
                          <span
                            style={{
                              color: "#0d47a1",
                              fontWeight: 900,
                              fontSize: 24,
                            }}
                          >
                            Câu {current + 1}:
                          </span>{" "}
                          <span
                            style={{
                              fontWeight: 600,
                              color: "#222",
                              fontSize: 22,
                            }}
                          >
                            {currentItem.problem.title}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            color: "#444",
                            marginBottom: 16,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: currentItem.problem.description,
                          }}
                        />
                        {currentItem.problem.constraints && (
                          <div
                            style={{
                              fontSize: 14,
                              color: "#666",
                              marginBottom: 12,
                            }}
                          >
                            <strong>Ràng buộc:</strong>{" "}
                            {currentItem.problem.constraints}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 13,
                            color: "#888",
                            marginBottom: 8,
                          }}
                        >
                          ⏱ Time limit: {currentItem.problem.timeLimit}ms | 💾
                          Memory: {currentItem.problem.memoryLimit}MB
                        </div>
                        <div
                          style={{
                            background: "#fffde7",
                            borderRadius: 10,
                            padding: 16,
                            fontSize: 14,
                            color: "#666",
                            border: "1px solid #fff9c4",
                          }}
                        >
                          💡 Bài code cần được giải trên trang{" "}
                          <strong>/exam</strong>. Bạn có thể ghi chú ở đây hoặc
                          bấm nộp bài cuối cùng.
                        </div>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginTop: 18,
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <button
                      onClick={handlePrev}
                      disabled={current === 0}
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        borderRadius: 10,
                        border: "none",
                        background: "#fff",
                        color: "#1976d2",
                        fontWeight: 900,
                        fontSize: 17,
                        boxShadow: "0 1px 4px #0001",
                        borderLeft: "6px solid #1976d2",
                        minWidth: 0,
                        transition: "all 0.15s",
                        marginRight: 8,
                        borderBottom: "3px solid #1976d2",
                      }}
                    >
                      ◀ Quay lại
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={current === allItems.length - 1}
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        borderRadius: 10,
                        border: "none",
                        background: "#fff",
                        color: "#1976d2",
                        fontWeight: 900,
                        fontSize: 17,
                        boxShadow: "0 1px 4px #0001",
                        borderLeft: "6px solid #1976d2",
                        minWidth: 0,
                        transition: "all 0.15s",
                        marginRight: 8,
                        marginLeft: 8,
                        borderBottom: "3px solid #1976d2",
                      }}
                    >
                      Câu tiếp theo
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        borderRadius: 10,
                        border: "none",
                        background: "#43a047",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: 17,
                        minWidth: 0,
                        boxShadow: "0 1px 4px #0001",
                        transition: "all 0.15s",
                        marginLeft: 8,
                        borderBottom: "3px solid #388e3c",
                      }}
                    >
                      {submitting ? "ĐANG NỘP..." : "NỘP BÀI"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Right: Sidebar */}
          <div
            style={{
              flex: 1,
              background: "transparent",
              minWidth: 320,
              maxWidth: 340,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderLeft: "2.5px solid #e3f2fd",
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontWeight: 900,
                color: "#0d47a1",
                marginBottom: 32,
                fontSize: 26,
                textShadow: "0 2px 8px #0001",
                letterSpacing: 0.5,
              }}
            >
              Thời gian còn lại:{" "}
              <span
                style={{
                  color: timeLeft < 60 ? "#e53935" : "#ffb300",
                  fontWeight: 900,
                }}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
            <div
              style={{
                background:
                  "linear-gradient(180deg, #e3f2fd 60%, #bbdefb 100%)",
                borderRadius: 22,
                padding: 32,
                boxShadow: "0 1px 8px #0001",
                width: "100%",
                maxWidth: 260,
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  marginBottom: 18,
                  color: "#1976d2",
                  fontSize: 20,
                  textAlign: "center",
                }}
              >
                Câu hỏi
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  justifyContent: "center",
                }}
              >
                {allItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrent(idx)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      border:
                        current === idx
                          ? "3.5px solid #1976d2"
                          : "2.5px solid #90caf9",
                      background: isAnswered(item)
                        ? current === idx
                          ? "#1976d2"
                          : "#fffde7"
                        : "#fff",
                      color:
                        current === idx
                          ? "#fff"
                          : isAnswered(item)
                            ? "#1976d2"
                            : "#1976d2",
                      fontWeight: 900,
                      fontSize: 20,
                      boxShadow:
                        current === idx ? "0 2px 8px #1976d233" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizScreen;
