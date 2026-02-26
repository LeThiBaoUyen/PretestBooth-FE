"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Mock data for demonstration
const mockQuestions = [
  {
    id: 1,
    question: "Hệ điều hành nào sau đây là mã nguồn mở?",
    options: ["Windows 10", "macOS", "Linux", "iOS"],
    answer: 2,
  },
  {
    id: 2,
    question: "HTML là viết tắt của?",
    options: [
      "Hyper Trainer Marking Language",
      "Hyper Text Markup Language",
      "Hyper Text Marketing Language",
      "Hyper Text Markup Leveler",
    ],
    answer: 1,
  },
  {
    id: 3,
    question: "Ngôn ngữ lập trình nào phổ biến cho AI?",
    options: ["Python", "HTML", "CSS", "SQL"],
    answer: 0,
  },
  {
    id: 4,
    question: "CSS dùng để làm gì?",
    options: ["Tạo cấu trúc", "Tạo nội dung", "Tạo kiểu dáng", "Tạo dữ liệu"],
    answer: 2,
  },
  {
    id: 5,
    question: "Câu lệnh nào dùng để khai báo biến trong JavaScript?",
    options: ["var", "int", "let", "float"],
    answer: 0,
  },
  {
    id: 6,
    question: "Cơ sở dữ liệu nào là NoSQL?",
    options: ["MySQL", "MongoDB", "Oracle", "SQL Server"],
    answer: 1,
  },
  {
    id: 7,
    question: "Phần mềm nào là trình duyệt web?",
    options: ["Word", "Excel", "Chrome", "Photoshop"],
    answer: 2,
  },
  {
    id: 8,
    question: "TCP/IP là gì?",
    options: ["Giao thức mạng", "Phần mềm", "Phần cứng", "Hệ điều hành"],
    answer: 0,
  },
  {
    id: 9,
    question: "RAM là gì?",
    options: [
      "Bộ nhớ chỉ đọc",
      "Bộ nhớ truy cập ngẫu nhiên",
      "Bộ xử lý",
      "Ổ cứng",
    ],
    answer: 1,
  },
  {
    id: 10,
    question: "Hệ điều hành nào của Microsoft?",
    options: ["Linux", "macOS", "Windows", "Android"],
    answer: 2,
  },
];

const TOTAL_TIME = 15 * 60; // 15 minutes in seconds

const QuizScreen = () => {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(
    Array(mockQuestions.length).fill(null),
  );
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [showResult, setShowResult] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOptionChange = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[current] = idx;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (current < mockQuestions.length - 1) setCurrent(current + 1);
  };

  const handlePrev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  const handleSubmit = () => {
    setShowConfirm(true);
  };

  const handleConfirmSubmit = () => {
    // Tính điểm
    let correct = 0;
    for (let i = 0; i < mockQuestions.length; ++i) {
      if (answers[i] === mockQuestions[i].answer) correct++;
    }
    const sc = Math.round((correct / mockQuestions.length) * 100);
    setScore(sc);
    setPassed(sc >= 50); // Đạt nếu >= 50
    setShowResult(true);
    setShowConfirm(false);
  };

  const handleCancelSubmit = () => {
    setShowConfirm(false);
  };

  const handleFinish = () => {
    // Lưu trạng thái đã làm và điểm vào localStorage (hoặc có thể gọi API nếu có backend)
    // Giả sử mỗi đề có id là 'pretest-1', lưu vào localStorage dạng: { done: true, score: ... }
    const quizKey = "pretest-1";
    const quizResult = { done: true, score };
    try {
      localStorage.setItem(quizKey, JSON.stringify(quizResult));
    } catch (e) {}
    // Chuyển về dashboard
    router.push("/dashboard");
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

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
                {mockQuestions.map((q, idx) => (
                  <span
                    key={q.id}
                    style={{
                      display: "inline-block",
                      minWidth: 32,
                      height: 32,
                      borderRadius: 8,
                      background: answers[idx] !== null ? "#43a047" : "#e53935",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: "32px",
                      textAlign: "center",
                      boxShadow:
                        answers[idx] !== null
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
        {/* Modal kết quả Pretest */}
        {showResult && (
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
                  Kết quả Pretest
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
                  {score}/100
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
                Kết quả:{" "}
                <span
                  style={{ color: "#43a047", fontWeight: 900, fontSize: 24 }}
                >
                  {passed ? "ĐẠT" : "KHÔNG ĐẠT"}
                </span>
              </div>
              <div
                style={{ color: "#444", fontSize: 17, margin: "12px 0 8px 0" }}
              >
                Chúc mừng bạn đã hoàn thành bài Pretest!
              </div>
              <div style={{ color: "#444", fontSize: 16, marginBottom: 24 }}>
                Kết quả đã được lưu cho{" "}
                <span style={{ color: "#1565c0", fontWeight: 700 }}>
                  Khoa Công nghệ Thông tin
                </span>
                .
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
          {/* Left: Question */}
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
                  Làm bài Pretest
                </h2>
              </div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: "36px 72px 28px 72px",
                  margin: "32px auto 0 auto",
                  boxShadow: "0 2px 16px #0002",
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
                      style={{ fontWeight: 600, color: "#222", fontSize: 22 }}
                    >
                      {mockQuestions[current].question}
                    </span>
                  </div>
                  <div>
                    {mockQuestions[current].options.map((opt, idx) => (
                      <div key={idx} style={{ marginBottom: 14 }}>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                            background:
                              answers[current] === idx
                                ? "#e3f2fd"
                                : "transparent",
                            borderRadius: 12,
                            padding: "12px 24px",
                            fontWeight: answers[current] === idx ? 900 : 700,
                            color:
                              answers[current] === idx ? "#1976d2" : "#222",
                            border:
                              answers[current] === idx
                                ? "2.5px solid #1976d2"
                                : "1.5px solid #e0e0e0",
                            boxShadow:
                              answers[current] === idx
                                ? "0 2px 8px #1976d233"
                                : "none",
                            fontSize: 22,
                            minHeight: 38,
                            transition: "all 0.15s",
                          }}
                        >
                          <input
                            type="radio"
                            name={`q${current}`}
                            checked={answers[current] === idx}
                            onChange={() => handleOptionChange(idx)}
                            style={{
                              marginRight: 16,
                              accentColor: "#1976d2",
                              width: 26,
                              height: 26,
                            }}
                          />
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
                          {opt}
                        </label>
                      </div>
                    ))}
                  </div>
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
                    disabled={current === mockQuestions.length - 1}
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
                    NỘP BÀI
                  </button>
                </div>
              </div>
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
              <span style={{ color: "#ffb300", fontWeight: 900 }}>
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
                {mockQuestions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrent(idx)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      border:
                        current === idx
                          ? "3.5px solid #1976d2"
                          : "2.5px solid #90caf9",
                      background:
                        answers[idx] !== null
                          ? current === idx
                            ? "#1976d2"
                            : "#fffde7"
                          : "#fff",
                      color:
                        current === idx
                          ? "#fff"
                          : answers[idx] !== null
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
