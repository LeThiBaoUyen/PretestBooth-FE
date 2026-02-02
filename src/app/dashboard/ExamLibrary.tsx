"use client";
import React, { useState, useEffect } from "react";

const SUBJECTS = [
  "Tất cả",
  "Toán rời rạc",
  "Cấu trúc dữ liệu",
  "Lập trình Web",
  "Hệ điều hành",
  "Tiếng Anh THPTQG",
  "Vật lý THPTQG",
  "Hóa học THPTQG",
  "Sinh học THPTQG",
];

const EXAM_SETS = [
  {
    id: 1,
    subject: "Toán rời rạc",
    title: "Bộ đề Toán rời rạc 1",
    duration: "60 phút",
    views: 1200,
    questions: 40,
    parts: 4,
    tags: ["Toán rời rạc"],
  },
  {
    id: 2,
    subject: "Cấu trúc dữ liệu",
    title: "Bộ đề Cấu trúc dữ liệu 1",
    duration: "50 phút",
    views: 950,
    questions: 35,
    parts: 3,
    tags: ["Cấu trúc dữ liệu"],
  },
  {
    id: 3,
    subject: "Lập trình Web",
    title: "Bộ đề Lập trình Web 1",
    duration: "45 phút",
    views: 800,
    questions: 30,
    parts: 2,
    tags: ["Lập trình Web"],
  },
  {
    id: 4,
    subject: "Hệ điều hành",
    title: "Bộ đề Hệ điều hành 1",
    duration: "60 phút",
    views: 700,
    questions: 40,
    parts: 4,
    tags: ["Hệ điều hành"],
  },
  {
    id: 5,
    subject: "Toán rời rạc",
    title: "Bộ đề Toán rời rạc 2",
    duration: "60 phút",
    views: 600,
    questions: 40,
    parts: 4,
    tags: ["Toán rời rạc"],
  },
  {
    id: 6,
    subject: "Cấu trúc dữ liệu",
    title: "Bộ đề Cấu trúc dữ liệu 2",
    duration: "50 phút",
    views: 500,
    questions: 35,
    parts: 3,
    tags: ["Cấu trúc dữ liệu"],
  },
  {
    id: 7,
    subject: "Lập trình Web",
    title: "Bộ đề Lập trình Web 2",
    duration: "45 phút",
    views: 400,
    questions: 30,
    parts: 2,
    tags: ["Lập trình Web"],
  },
  {
    id: 8,
    subject: "Hệ điều hành",
    title: "Bộ đề Hệ điều hành 2",
    duration: "60 phút",
    views: 350,
    questions: 40,
    parts: 4,
    tags: ["Hệ điều hành"],
  },
];

import ExamSelection from "./ExamSelection";
import ExamDetailModal from "./ExamDetailModal";

export default function ExamLibrary() {
  const [showDetail, setShowDetail] = useState(false);
  const [detailExam, setDetailExam] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [pretest1Result, setPretest1Result] = useState<{
    done: boolean;
    score: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const data = localStorage.getItem("pretest-1");
        if (data) {
          setPretest1Result(JSON.parse(data));
        }
      } catch (e) {}
    }
  }, []);

  function getExamDetail(exam: any) {
    return {
      ...exam,
      multipleChoice: Math.floor(exam.questions * 0.5),
      essay: Math.floor(exam.questions * 0.3),
      leetcode:
        exam.questions -
        Math.floor(exam.questions * 0.5) -
        Math.floor(exam.questions * 0.3),
    };
  }
  const filteredExams = EXAM_SETS.filter(
    (exam) =>
      (selectedSubject === "Tất cả" || exam.subject === selectedSubject) &&
      (search === "" ||
        exam.title.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-navy-600 mb-6">Thư viện đề thi</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {SUBJECTS.map((subject) => (
          <button
            key={subject}
            className={`px-4 py-2 rounded-full font-medium border transition text-sm ${
              selectedSubject === subject
                ? "bg-navy-600 text-white border-navy-600"
                : "bg-white text-navy-600 border-navy-200 hover:bg-navy-50"
            }`}
            onClick={() => setSelectedSubject(subject)}
          >
            {subject}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-8">
        <input
          type="text"
          placeholder="Nhập từ khóa bạn muốn tìm kiếm: tên đề, dạng câu hỏi ..."
          className="flex-1 px-4 py-2 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="px-6 py-2 bg-navy-600 text-white rounded-lg font-bold hover:bg-navy-700 transition">
          Tìm kiếm
        </button>
        {/* getExamDetail đã được đặt ra ngoài component */}
      </div>
      {/* Tabs */}
      <div className="flex gap-6 border-b border-navy-100 mb-8">
        <button
          className={`pb-2 font-semibold text-lg border-b-2 transition ${activeTab === "all" ? "border-navy-600 text-navy-600" : "border-transparent text-gray-500"}`}
          onClick={() => setActiveTab("all")}
        >
          Tất cả
        </button>
        <button
          className={`pb-2 font-semibold text-lg border-b-2 transition ${activeTab === "compact" ? "border-navy-600 text-navy-600" : "border-transparent text-gray-500"}`}
          onClick={() => setActiveTab("compact")}
        >
          Đề rút gọn
        </button>
        <button
          className={`pb-2 font-semibold text-lg border-b-2 transition ${activeTab === "custom" ? "border-navy-600 text-navy-600" : "border-transparent text-gray-500"}`}
          onClick={() => setActiveTab("custom")}
        >
          Sinh viên tự tạo bộ đề
        </button>
      </div>
      {/* Tab content */}
      {activeTab === "custom" ? (
        <ExamSelection onSelect={console.log} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredExams.map((exam) => {
            // Đánh dấu đã làm và điểm cho bộ đề Toán rời rạc 1 (id:1)
            const isPretest1 = exam.id === 1;
            const done = isPretest1 && pretest1Result?.done;
            const score = isPretest1 && pretest1Result?.score;
            return (
              <div
                key={exam.id}
                className="bg-white rounded-xl shadow-md p-5 flex flex-col justify-between border border-navy-100 relative"
              >
                <div>
                  <h2 className="text-lg font-bold text-navy-700 mb-2 line-clamp-2">
                    {exam.title}
                  </h2>
                  <div className="flex items-center text-gray-500 text-sm mb-2 gap-3">
                    <span>⏰ {exam.duration}</span>
                    <span>👁️ {exam.views}</span>
                    <span>
                      📝 {exam.parts} phần thi | {exam.questions} câu hỏi
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {exam.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-navy-50 text-navy-600 px-2 py-1 rounded text-xs font-semibold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {done && (
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold">
                        Đã làm
                      </span>
                      <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold">
                        Điểm: {score}/100
                      </span>
                    </div>
                  )}
                </div>
                <button
                  className="mt-2 w-full bg-navy-600 text-white py-2 rounded-lg font-bold hover:bg-navy-700 transition"
                  onClick={() => {
                    setDetailExam(getExamDetail(exam));
                    setShowDetail(true);
                  }}
                >
                  Chi tiết
                </button>
              </div>
            );
          })}
          {filteredExams.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-10">
              Không tìm thấy bộ đề phù hợp.
            </div>
          )}
        </div>
      )}
      {/* Hiển thị modal ngoài block tab content */}
      {showDetail && detailExam && (
        <ExamDetailModal
          exam={detailExam}
          onClose={() => setShowDetail(false)}
          onStart={() => {
            setShowDetail(false);
            window.location.href = "/quiz";
          }}
        />
      )}
    </div>
  );
}
