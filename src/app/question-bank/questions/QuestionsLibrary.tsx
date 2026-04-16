"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import * as XLSX from "xlsx";
import type {
  Difficulty,
  QuestionType,
} from "@/lib/api/types";
import { questionsApiClient } from "@/lib/api/questions";
import { useAuth } from "@/lib/hooks/useAuth";
import { getTokenManager } from "@/lib/auth/tokenManager";
import {
  CircleAlert,
  CircleCheck,
  Download,
  FileSpreadsheet,
  Upload,
} from "lucide-react";

type QuestionImportPreviewRow = {
  rowNumber: number;
  content: string;
  image: string;
  questionType: string;
  classification: string;
  difficulty: string;
  subjectId: string;
  topicId: string;
  correctAnswer: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  isValid: boolean;
  errors: string[];
};

type ImportResult = {
  total: number;
  success: number;
  failed: number;
  errors: string[];
};

const QUESTION_REQUIRED_COLUMNS = ["content", "questionType", "difficulty"];

function normalizeHeaderKey(header: string) {
  const normalized = header.replace(/\s+/g, "").replace(/[_-]/g, "").toLowerCase();
  if (normalized === "questiontype" || normalized === "type") return "questionType";
  if (
    normalized === "classification" ||
    normalized === "questionclassification" ||
    normalized === "examtype"
  )
    return "classification";
  if (normalized === "subjectref") return "subjectRef";
  if (normalized === "subject" || normalized === "subjectid") return "subjectId";
  if (normalized === "topicref") return "topicRef";
  if (normalized === "topic" || normalized === "topicid") return "topicId";
  if (
    normalized === "correct" ||
    normalized === "correctanswer" ||
    normalized === "correctans"
  )
    return "correctAnswer";
  if (normalized === "isa" || normalized === "ispublished" || normalized === "publish") return "isPublished";
  return header;
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current.trim());
  return result;
}

function parseCsvContent(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [] as string[], rows: [] as Record<string, unknown>[] };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => normalizeHeaderKey(h));
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      row[header] = cells[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

function normalizeRefLabel(rawValue: unknown) {
  return String(rawValue || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

function validateQuestionPreviewRow(row: QuestionImportPreviewRow) {
  const errors: string[] = [];
  const type = row.questionType.toUpperCase();
  const classification = row.classification.toUpperCase();
  const difficulty = row.difficulty.toUpperCase();
  const correctTokens = row.correctAnswer
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  if (!row.content) errors.push("Thiếu content");
  if (!row.subjectId) errors.push("Thiếu subjectRef/subjectId/subjectName");
  if (!["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SHORT_ANSWER"].includes(type)) {
    errors.push("questionType không hợp lệ");
  }
  if (classification && !["PRACTICE", "EXAM"].includes(classification)) {
    errors.push("classification không hợp lệ (PRACTICE hoặc EXAM)");
  }
  if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
    errors.push("difficulty không hợp lệ");
  }

  if (type === "SHORT_ANSWER" && !row.correctAnswer) {
    errors.push("SHORT_ANSWER cần correctAnswer");
  }

  if (type === "SINGLE_CHOICE" && correctTokens.length !== 1) {
    errors.push("SINGLE_CHOICE cần đúng 1 đáp án đúng (ví dụ: A)");
  }

  if (type === "MULTIPLE_CHOICE" && correctTokens.length < 2) {
    errors.push("MULTIPLE_CHOICE cần ít nhất 2 đáp án đúng (ví dụ: A,C)");
  }

  if ((type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") && (!row.optionA || !row.optionB)) {
    errors.push("Câu hỏi trắc nghiệm cần ít nhất optionA và optionB");
  }

  return {
    ...row,
    isValid: errors.length === 0,
    errors,
  };
}

export default function QuestionsLibrary() {
  const { user, accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty | "ALL">("ALL");
  const [questionType, setQuestionType] = useState<QuestionType | "ALL">("ALL");
  const [subjectId, setSubjectId] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isZipImportMode, setIsZipImportMode] = useState(false);
  const [previewRows, setPreviewRows] = useState<QuestionImportPreviewRow[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const limit = 20;

  const isAuthorized = user && ["LECTURER", "ADMIN"].includes(user.role);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => questionsApiClient.getSubjects(accessToken || undefined),
  });

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["questions", page, difficulty, questionType, subjectId, search],
    queryFn: () =>
      questionsApiClient.getQuestions(
        {
          page,
          limit,
          difficulty: difficulty === "ALL" ? undefined : difficulty,
          questionType: questionType === "ALL" ? undefined : questionType,
          subjectId: subjectId === "ALL" ? undefined : subjectId,
          search: search || undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        accessToken || undefined,
      ),
  });

  const validCount = previewRows.filter((row) => row.isValid).length;
  const invalidCount = previewRows.length - validCount;
  const isCsvSelected = !!selectedFile && selectedFile.name.toLowerCase().endsWith(".csv");
  const isExcelSelected =
    !!selectedFile &&
    (selectedFile.name.toLowerCase().endsWith(".xlsx") || selectedFile.name.toLowerCase().endsWith(".xls"));
  const hasEmbeddedPictureMarker = previewRows.some((row) => /^picture(\s*\d+)?$/i.test(row.image || ""));
  const hasImageFileReferences = previewRows.some(
    (row) => !!row.image && !/^picture(\s*\d+)?$/i.test(row.image || ""),
  );
  const isCsvMissingRequiredImages = isCsvSelected && hasImageFileReferences && selectedImages.length === 0;

  const parseRowsForPreview = (rows: Record<string, unknown>[]) => {
    return rows.map((row, index) =>
      validateQuestionPreviewRow({
        rowNumber: index + 2,
        content: String(row.content || "").trim(),
        image: String(row.image || row.imageFile || row.imageName || "").trim(),
        questionType: String(row.questionType || "").trim().toUpperCase(),
        classification: String(row.classification || "EXAM").trim().toUpperCase(),
        difficulty: String(row.difficulty || "").trim().toUpperCase(),
        subjectId: String(row.subjectId || row.subjectRef || row.subjectName || row.subject || "").trim(),
        topicId: String(row.topicId || row.topicRef || row.topicName || row.topic || "").trim(),
        correctAnswer: String(row.correctAnswer || "").trim(),
        optionA: String(row.optionA || "").trim(),
        optionB: String(row.optionB || "").trim(),
        optionC: String(row.optionC || "").trim(),
        optionD: String(row.optionD || "").trim(),
        isValid: true,
        errors: [],
      }),
    );
  };

  const parseFileForPreview = async (file: File) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      const parsed = parseCsvContent(text);
      return { headers: parsed.headers, rows: parseRowsForPreview(parsed.rows) };
    }

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        return { headers: [] as string[], rows: [] as QuestionImportPreviewRow[] };
      }

      const sheet = workbook.Sheets[firstSheet];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const headerSet = new Set<string>();
      const normalizedRows = rawRows.map((row) => {
        const normalized: Record<string, unknown> = {};
        Object.entries(row).forEach(([key, value]) => {
          const normalizedKey = normalizeHeaderKey(String(key));
          normalized[normalizedKey] = value;
          headerSet.add(normalizedKey);
        });
        return normalized;
      });

      return { headers: Array.from(headerSet), rows: parseRowsForPreview(normalizedRows) };
    }

    throw new Error("Định dạng không hỗ trợ. Chỉ nhận .csv, .xlsx, .xls");
  };

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isZip = file.name.toLowerCase().endsWith(".zip");
    if (isZip) {
      setSelectedFile(file);
      setSelectedImages([]);
      setIsZipImportMode(true);
      setPreviewRows([]);
      setPreviewError(null);
      setImportResult(null);
      setIsParsingFile(false);
      return;
    }

    setSelectedFile(file);
    setIsZipImportMode(false);
    setPreviewRows([]);
    setPreviewError(null);
    setImportResult(null);
    setIsParsingFile(true);

    try {
      const parsed = await parseFileForPreview(file);
      if (parsed.rows.length === 0) {
        setPreviewError("File không có dữ liệu.");
        return;
      }

      const isCsvFile = file.name.toLowerCase().endsWith(".csv");
      const containsExcelPicturePlaceholder = parsed.rows.some((row) =>
        /^picture(\s*\d+)?$/i.test(row.image || ""),
      );
      if (isCsvFile && containsExcelPicturePlaceholder) {
        setPreviewError(
          "File CSV không chứa được ảnh nhúng. Hãy lưu file dạng .xlsx (Excel Workbook) rồi import lại.",
        );
        return;
      }

      if (parsed.headers.includes("imageUrl") && !parsed.headers.includes("image")) {
        setPreviewError("Không dùng cột imageUrl nữa. Hãy đổi sang cột image (chứa tên file ảnh) và chọn ảnh ở nút 'Chọn ảnh import'.");
        return;
      }

      const missing = QUESTION_REQUIRED_COLUMNS.filter((col) => !parsed.headers.includes(col));
      if (missing.length > 0) {
        setPreviewError(`Thiếu cột bắt buộc: ${missing.join(", ")}`);
        return;
      }

      const hasSubjectReference = parsed.headers.some((h) =>
        ["subjectId", "subjectRef", "subjectName", "subject"].includes(h),
      );
      if (!hasSubjectReference) {
        setPreviewError("Thiếu cột subject tham chiếu: subjectId hoặc subjectRef hoặc subjectName hoặc subject");
        return;
      }

      const existingSubjects = (subjects || []).map((s) => ({
        id: String(s.id),
        idNorm: normalizeRefLabel(s.id),
        nameNorm: normalizeRefLabel(s.name),
      }));

      const rowsWithSubjectValidation = parsed.rows.map((row) => {
        const ref = row.subjectId;
        const refNorm = normalizeRefLabel(ref);
        const found = existingSubjects.some(
          (s) => s.idNorm === refNorm || s.nameNorm === refNorm,
        );

        if (!found) {
          const errors = [...row.errors, `Không tìm thấy môn học '${ref}' trong hệ thống`];
          return {
            ...row,
            isValid: false,
            errors,
          };
        }

        return row;
      });

      setPreviewRows(rowsWithSubjectValidation);
    } catch (err: any) {
      setPreviewError(err.message || "Không thể đọc file xem trước.");
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    if (isCsvMissingRequiredImages) {
      alert("File CSV có cột image theo tên file nên bắt buộc chọn ảnh ở nút 'Chọn ảnh import' trước khi import.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    selectedImages.forEach((image) => {
      formData.append("images", image);
    });

    setIsUploading(true);
    setImportResult(null);

    try {
      const token = getTokenManager().getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/questions/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const raw = await res.json();
      if (!res.ok) {
        throw new Error(raw?.message || "Import thất bại");
      }

      const payload = raw?.data ?? raw;
      const messageText = String(payload?.message || "");
      const matchedSuccess = messageText.match(/(\d+)\s*\/\s*(\d+)/) || messageText.match(/thành công\s*(\d+)/i);
      const fallbackSuccess = matchedSuccess
        ? Number(matchedSuccess[2] ? matchedSuccess[1] : matchedSuccess[1])
        : 0;
      const fallbackTotal = matchedSuccess
        ? Number(matchedSuccess[2] || previewRows.length)
        : previewRows.length;

      const success = Number(payload?.success ?? fallbackSuccess);
      const total = Number(payload?.total ?? fallbackTotal);
      const failed = Number(payload?.failed ?? Math.max(total - success, 0));

      setImportResult({
        total,
        success,
        failed,
        errors: Array.isArray(payload?.errors) ? payload.errors : [],
      });

      refetch();
    } catch (err: any) {
      alert(err.message || "Lỗi khi import câu hỏi");
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetImport = () => {
    setSelectedFile(null);
    setSelectedImages([]);
    setIsZipImportMode(false);
    setPreviewRows([]);
    setPreviewError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handlePickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(files);
    setImportResult(null);
  };

  const handleDownloadTemplate = () => {
    const csv = [
      "content,image,subjectRef,topicRef,questionType,classification,difficulty,correctAnswer,optionA,optionB,optionC,optionD,isPublished,explanation",
      '"2 + 2 bằng mấy?",math-q1.png,Cấu trúc dữ liệu,,SINGLE_CHOICE,EXAM,EASY,A,A,B,C,,true,"Câu hỏi mẫu single"',
      '"Chọn số nguyên tố",prime-q2.jpg,Cấu trúc dữ liệu,Đệ quy,MULTIPLE_CHOICE,PRACTICE,MEDIUM,"A,C",2,3,4,5,false,"Câu hỏi mẫu multiple"',
      '"Nêu định nghĩa biến",,Cấu trúc dữ liệu,,SHORT_ANSWER,PRACTICE,EASY,"Biến là vùng nhớ",,,,,true,"Câu hỏi mẫu short"',
    ].join("\r\n");

    const csvWithBom = `\uFEFF${csv}`;

    const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "question-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case "EASY":
        return "text-green-600 bg-green-50 border-green-200";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "HARD":
        return "text-red-600 bg-red-50 border-red-200";
    }
  };

  const getDifficultyText = (diff: Difficulty) => {
    switch (diff) {
      case "EASY":
        return "Dễ";
      case "MEDIUM":
        return "Trung bình";
      case "HARD":
        return "Khó";
    }
  };

  const getTypeColor = (type: QuestionType) => {
    switch (type) {
      case "SINGLE_CHOICE":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "MULTIPLE_CHOICE":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "SHORT_ANSWER":
        return "text-orange-600 bg-orange-50 border-orange-200";
    }
  };

  const getTypeText = (type: QuestionType) => {
    switch (type) {
      case "SINGLE_CHOICE":
        return "Một đáp án";
      case "MULTIPLE_CHOICE":
        return "Nhiều đáp án";
      case "SHORT_ANSWER":
        return "Tự luận ngắn";
    }
  };

  const getTypeIcon = (type: QuestionType) => {
    switch (type) {
      case "SINGLE_CHOICE":
        return "🔘";
      case "MULTIPLE_CHOICE":
        return "☑️";
      case "SHORT_ANSWER":
        return "✏️";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-navy-600 mb-2">Ngân hàng Câu hỏi</h1>
          <p className="text-gray-600">Quản lý câu hỏi trắc nghiệm, nhiều đáp án và tự luận ngắn</p>
        </div>
        {isAuthorized && (
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex w-32 min-h-[34px] items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[12px] font-medium leading-none text-slate-700 shadow-sm transition hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Tải mẫu CSV
            </button>
            <Link
              href="/question-bank/categories"
              className="inline-flex w-32 min-h-[34px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[12px] font-medium leading-none text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
            >
              Subject/Topic
            </Link>
            <Link
              href="/question-bank/review"
              className="inline-flex w-32 min-h-[34px] items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-center text-[12px] font-medium leading-none text-amber-700 transition hover:bg-amber-100 whitespace-nowrap"
            >
              Review theo quý
            </Link>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv,.xlsx,.xls,.zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/zip"
              onChange={handlePickFile}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isParsingFile}
              className="inline-flex w-32 min-h-[34px] items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-center text-[12px] font-medium leading-none text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
            >
              {isParsingFile ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Import file
            </button>
            <input
              type="file"
              ref={imageInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handlePickImages}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading || isParsingFile}
              className="inline-flex w-32 min-h-[34px] items-center justify-center gap-1 rounded-lg bg-sky-600 px-2 py-1 text-center text-[12px] font-medium leading-none text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50 whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              Chọn ảnh import
            </button>
            <Link
              href="/question-bank/questions/create"
              className="inline-flex w-32 min-h-[34px] items-center justify-center gap-1 rounded-lg bg-navy-600 px-2 py-1 text-center text-[12px] font-medium leading-none text-white shadow-sm transition hover:bg-navy-700 whitespace-nowrap"
            >
              + Tạo câu hỏi
            </Link>
          </div>
        )}
      </div>

      {isAuthorized && (selectedFile || previewError || importResult) && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900">Xem trước import câu hỏi</h2>
          {selectedFile && <p className="text-sm text-slate-600 mt-1">File: {selectedFile.name}</p>}

          {isZipImportMode && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              ZIP mode: Hệ thống sẽ tự lấy file bảng (.csv/.xlsx/.xls) và ảnh bên trong file .zip để import.
            </div>
          )}

          <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
            Cột mẫu: content, image (tùy chọn - nhập tên file ảnh), subjectRef, topicRef, questionType, classification, difficulty, correctAnswer, optionA, optionB, optionC, optionD, isPublished, explanation
          </div>
          <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
            Nếu dùng ảnh nhúng trong Excel: bắt buộc lưu file .xlsx. Nếu dùng cột image là tên file (vd: math-q1.png): bấm "Chọn ảnh import" để tải các file ảnh lên cùng lúc import.
          </div>

          {isCsvMissingRequiredImages && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              File .csv đang dùng cột image theo tên file, nên bắt buộc chọn ảnh ở nút "Chọn ảnh import" trước khi bấm xác nhận.
            </div>
          )}

          {isExcelSelected && hasEmbeddedPictureMarker && (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              Đã phát hiện ảnh nhúng trong file Excel. Bạn có thể bấm "Xác nhận import" ngay, không cần chọn ảnh import.
            </div>
          )}

          {selectedImages.length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">Ảnh đã chọn: {selectedImages.length}</p>
              <p className="mt-1 text-xs text-slate-600 break-all">{selectedImages.map((f) => f.name).join(", ")}</p>
            </div>
          )}

          {previewError && <p className="mt-3 text-sm text-red-600">{previewError}</p>}

          {previewRows.length > 0 && (
            <>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">Tổng: {previewRows.length}</span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                  <CircleCheck className="h-3.5 w-3.5 mr-1" /> Hợp lệ: {validCount}
                </span>
                <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">
                  <CircleAlert className="h-3.5 w-3.5 mr-1" /> Lỗi: {invalidCount}
                </span>
              </div>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2">Dòng</th>
                      <th className="px-3 py-2">Nội dung</th>
                      <th className="px-3 py-2">Hình ảnh</th>
                      <th className="px-3 py-2">Loại</th>
                      <th className="px-3 py-2">Phân loại</th>
                      <th className="px-3 py-2">Độ khó</th>
                      <th className="px-3 py-2">SubjectRef</th>
                      <th className="px-3 py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.slice(0, 20).map((row) => (
                      <tr key={row.rowNumber} className={row.isValid ? "" : "bg-red-50/50"}>
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2 max-w-md truncate">{row.content || "--"}</td>
                        <td className="px-3 py-2 max-w-48 truncate">{row.image || "--"}</td>
                        <td className="px-3 py-2">{row.questionType || "--"}</td>
                        <td className="px-3 py-2">
                          {row.classification === "PRACTICE"
                            ? "Luyện tập"
                            : row.classification === "EXAM"
                              ? "Thi"
                              : row.classification || "--"}
                        </td>
                        <td className="px-3 py-2">{row.difficulty || "--"}</td>
                        <td className="px-3 py-2">{row.subjectId || "--"}</td>
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <span className="font-semibold text-emerald-700">Hợp lệ</span>
                          ) : (
                            <span className="font-semibold text-red-700">{row.errors.join("; ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleResetImport}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Chọn lại file
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={
                isUploading ||
                (!isZipImportMode && previewRows.length === 0) ||
                isCsvMissingRequiredImages
              }
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Đang import...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Xác nhận import
                </>
              )}
            </button>
          </div>

          {importResult && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <p className="font-semibold text-emerald-800">Kết quả import</p>
              <p className="text-emerald-900 mt-1">
                Tổng: {importResult.total} | Thành công: {importResult.success} | Thất bại: {importResult.failed}
              </p>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-amber-800 text-xs">
                  {importResult.errors.slice(0, 8).map((item, idx) => (
                    <li key={`${item}-${idx}`}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
            <input
              type="text"
              placeholder="Nhập nội dung câu hỏi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại câu hỏi</label>
            <select
              value={questionType}
              onChange={(e) => {
                setQuestionType(e.target.value as QuestionType | "ALL");
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              <option value="SINGLE_CHOICE">Một đáp án</option>
              <option value="MULTIPLE_CHOICE">Nhiều đáp án</option>
              <option value="SHORT_ANSWER">Tự luận ngắn</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Độ khó</label>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value as Difficulty | "ALL");
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              <option value="EASY">Dễ</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HARD">Khó</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Môn học</label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Không thể tải danh sách câu hỏi. Vui lòng thử lại sau.</p>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-600 text-lg">Không tìm thấy câu hỏi nào</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-navy-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">#</th>
                    <th className="px-6 py-4 text-left font-semibold">Nội dung</th>
                    <th className="px-6 py-4 text-center font-semibold">Loại</th>
                    <th className="px-6 py-4 text-center font-semibold">Độ khó</th>
                    <th className="px-6 py-4 text-center font-semibold">Môn học</th>
                    {isAuthorized && <th className="px-6 py-4 text-center font-semibold">Trạng thái</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.data.map((question, index) => (
                    <tr key={question.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-gray-600">{(page - 1) * limit + index + 1}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/question-bank/questions/${question.id}`}
                          className="text-navy-600 hover:text-navy-700 font-medium hover:underline line-clamp-2"
                        >
                          {question.content}
                        </Link>
                        {question.topic && <p className="text-xs text-gray-400 mt-1">{question.topic.name}</p>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(question.questionType)}`}>
                          {getTypeIcon(question.questionType)} {getTypeText(question.questionType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(question.difficulty)}`}>
                          {getDifficultyText(question.difficulty)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 text-sm">{question.subject?.name || "—"}</td>
                      {isAuthorized && (
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            question.isPublished
                              ? "bg-green-50 text-green-600 border border-green-200"
                              : "bg-gray-50 text-gray-500 border border-gray-200"
                          }`}>
                            {question.isPublished ? "Đã xuất bản" : "Bản nháp"}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Trước
              </button>
              <div className="flex gap-2">
                {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === data.totalPages || Math.abs(p - page) <= 2)
                  .map((p, i, arr) => (
                    <span key={p} className="flex items-center gap-2">
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2 py-2">...</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-4 py-2 rounded-lg transition ${
                          page === p ? "bg-navy-600 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
