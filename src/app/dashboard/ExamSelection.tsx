"use client";
import { useState } from "react";

const DIFFICULTY_LEVELS = ["Dễ", "Trung bình", "Khó"];
const DURATIONS = ["30 phút", "45 phút", "60 phút", "90 phút"];

export default function ExamSelection({
  onSelect,
}: {
  onSelect: (selection: any) => void;
}) {
  const [duration, setDuration] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [mode, setMode] = useState("");
  const [importedFile, setImportedFile] = useState<File | null>(null);

  const handleImport = (file: File) => {
    setImportedFile(file);
    setMode("ai");
    onSelect({ duration, difficulty, mode: "ai", file });
  };

  const handleSystemSelect = () => {
    setMode("system");
    onSelect({ duration, difficulty, mode: "system" });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 mb-10 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-navy-600 mb-6 text-center">
        Chọn đề thi
      </h2>
      <div className="mb-4">
        <label className="block text-navy-700 font-semibold mb-2">
          Thời gian làm bài
        </label>
        <select
          className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        >
          <option value="">-- Chọn thời gian --</option>
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-navy-700 font-semibold mb-2">
          Mức độ đề thi
        </label>
        <select
          className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">-- Chọn mức độ --</option>
          {DIFFICULTY_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-6">
        <label className="block text-navy-700 font-semibold mb-2">
          Cách tạo đề thi
        </label>
        <div className="flex flex-col gap-4">
          <button
            className={`w-full px-6 py-3 rounded-lg font-bold text-lg border transition ${mode === "system" ? "bg-navy-600 text-white border-navy-600" : "bg-white text-navy-600 border-navy-200 hover:bg-navy-50"}`}
            disabled={!duration || !difficulty}
            onClick={handleSystemSelect}
          >
            Chọn đề hệ thống đưa ra
          </button>
          <div className="flex flex-col gap-2">
            <label className="text-navy-700 font-semibold">
              Hoặc AI tự tạo đề bằng file của bạn
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.json"
              className="block w-full text-sm text-navy-700 border border-navy-200 rounded-lg cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-navy-400"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImport(e.target.files[0]);
                }
              }}
              disabled={!duration || !difficulty}
            />
            <p className="text-xs text-gray-500 mt-1">
              Hỗ trợ định dạng: CSV, Excel, JSON
            </p>
            {importedFile && (
              <div className="mt-2 text-green-600 text-sm text-center">
                Đã chọn file:{" "}
                <span className="font-semibold">{importedFile.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
