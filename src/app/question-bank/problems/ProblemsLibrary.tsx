"use client";

import { useRef, useState } from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import type { Difficulty } from "@/lib/api/types";
import { problemsApiClient } from "@/lib/api/problems";
import { questionsApiClient } from "@/lib/api/questions";
import { useAuth } from "@/lib/hooks/useAuth";
import { getTokenManager } from "@/lib/auth/tokenManager";
import { downloadImportTemplate } from "@/lib/importTemplates";
import { ImportTemplateActions } from "@/components/import/ImportTemplateActions";
import { CircleAlert, CircleCheck, FileSpreadsheet, Upload } from "lucide-react";
import { buildQueryString } from "@/lib/navigation/listQueryPersistence";
import { useListQuerySync } from "@/lib/hooks/useListQuerySync";

type ProblemImportPreviewRow = {
  rowNumber: number;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  functionName: string;
  outputType: string;
  timeLimit: string;
  memoryLimit: string;
  subjectId: string;
  topicId: string;
  isValid: boolean;
  errors: string[];
};

type ImportResult = {
  total: number;
  success: number;
  failed: number;
  errors: string[];
};

const PROBLEM_REQUIRED_COLUMNS = ["title", "slug", "description", "difficulty"];

function normalizeHeaderKey(header: string) {
  const normalized = header.replace(/\s+/g, "").replace(/[_-]/g, "").toLowerCase();
  if (normalized === "subject" || normalized === "subjectid") return "subjectId";
  if (normalized === "topic" || normalized === "topicid") return "topicId";
  if (normalized === "function" || normalized === "functionname") return "functionName";
  if (normalized === "timelimit") return "timeLimit";
  if (normalized === "memorylimit") return "memoryLimit";
  if (normalized === "output" || normalized === "outputtype") return "outputType";
  if (normalized === "publish" || normalized === "ispublished") return "isPublished";
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

function validateProblemPreviewRow(row: ProblemImportPreviewRow) {
  const errors: string[] = [];
  const difficulty = row.difficulty.toUpperCase();

  if (!row.title) errors.push("Thiếu title");
  if (!row.slug) errors.push("Thiếu slug");
  if (!row.description) errors.push("Thiếu description");
  if (!/^[a-z0-9-]+$/.test(row.slug)) errors.push("slug chỉ gồm chữ thường, số, dấu gạch ngang");
  if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) errors.push("difficulty không hợp lệ");

  if (row.timeLimit && (!Number.isInteger(Number(row.timeLimit)) || Number(row.timeLimit) <= 0)) {
    errors.push("timeLimit phải là số nguyên dương");
  }

  if (row.memoryLimit && (!Number.isInteger(Number(row.memoryLimit)) || Number(row.memoryLimit) <= 0)) {
    errors.push("memoryLimit phải là số nguyên dương");
  }

  return {
    ...row,
    isValid: errors.length === 0,
    errors,
  };
}

export default function ProblemsLibrary() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page") || 1)));
  const [difficulty, setDifficulty] = useState<Difficulty | "ALL">(
    () => (searchParams.get("difficulty") as Difficulty | "ALL") || "ALL",
  );
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [subjectId, setSubjectId] = useState<string>(() => searchParams.get("subjectId") || "");
  const [topicId, setTopicId] = useState<string>(() => searchParams.get("topicId") || "");

  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<ProblemImportPreviewRow[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 20;

  const queryString = useMemo(
    () =>
      buildQueryString({
        page: page > 1 ? page : undefined,
        difficulty: difficulty === "ALL" ? undefined : difficulty,
        search: search.trim() || undefined,
        subjectId: subjectId || undefined,
        topicId: topicId || undefined,
      }),
    [page, difficulty, search, subjectId, topicId],
  );

  useListQuerySync("/question-bank/problems", queryString);

  const isAuthorized = user && ["LECTURER", "ADMIN"].includes(user.role);
  const isStudent = user?.role === "STUDENT";

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["problems", page, difficulty, search, subjectId, topicId],
    queryFn: () =>
      problemsApiClient.getProblems({
        page,
        limit,
        difficulty: difficulty === "ALL" ? undefined : difficulty,
        search: search || undefined,
        subjectId: subjectId || undefined,
        topicId: topicId || undefined,
        isPublished: isStudent ? true : undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => questionsApiClient.getSubjects(accessToken || undefined),
  });

  const { data: topics } = useQuery({
    queryKey: ["topics", subjectId],
    queryFn: () => questionsApiClient.getTopicsBySubject(subjectId, accessToken || undefined),
    enabled: !!subjectId,
  });

  const validCount = previewRows.filter((row) => row.isValid).length;
  const invalidCount = previewRows.length - validCount;

  const parseRowsForPreview = (rows: Record<string, unknown>[]) => {
    return rows.map((row, index) =>
      validateProblemPreviewRow({
        rowNumber: index + 2,
        title: String(row.title || "").trim(),
        slug: String(row.slug || "").trim().toLowerCase(),
        description: String(row.description || "").trim(),
        difficulty: String(row.difficulty || "").trim().toUpperCase(),
        functionName: String(row.functionName || "").trim(),
        outputType: String(row.outputType || "").trim(),
        timeLimit: String(row.timeLimit || "").trim(),
        memoryLimit: String(row.memoryLimit || "").trim(),
        subjectId: String(row.subjectId || "").trim(),
        topicId: String(row.topicId || "").trim(),
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
      if (!firstSheet) return { headers: [] as string[], rows: [] as ProblemImportPreviewRow[] };

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

    setSelectedFile(file);
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

      const missing = PROBLEM_REQUIRED_COLUMNS.filter((col) => !parsed.headers.includes(col));
      if (missing.length > 0) {
        setPreviewError(`Thiếu cột bắt buộc: ${missing.join(", ")}`);
        return;
      }

      setPreviewRows(parsed.rows);
    } catch (err: any) {
      setPreviewError(err.message || "Không thể đọc file xem trước.");
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true);
    setImportResult(null);

    try {
      const token = getTokenManager().getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/problems/import`, {
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
      setImportResult({
        total: Number(payload?.total ?? 0),
        success: Number(payload?.success ?? 0),
        failed: Number(payload?.failed ?? 0),
        errors: Array.isArray(payload?.errors) ? payload.errors : [],
      });

      refetch();
    } catch (err: any) {
      alert(err.message || "Lỗi khi import bài tập");
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetImport = () => {
    setSelectedFile(null);
    setPreviewRows([]);
    setPreviewError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    const csv = [
      "title,slug,description,difficulty,functionName,outputType,timeLimit,memoryLimit,inputTypes,argNames,hints,isPublished,subjectRef,topicRef,constraints",
      '"Tổng hai số","sum-two","Viết hàm trả về tổng hai số",EASY,solve,number,1000,256,"number,number","a,b","Dùng toán tử +",true,Cấu trúc dữ liệu,,"0 <= a,b <= 10^9"',
      '"Kiểm tra nguyên tố","check-prime","Viết hàm kiểm tra số nguyên tố",MEDIUM,solve,boolean,1000,256,"number","n","Duyệt từ 2 tới sqrt(n)",false,Cấu trúc dữ liệu,Đệ quy,"n > 0"',
    ].join("\r\n");

    const csvWithBom = `\uFEFF${csv}`;

    const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "problem-import-template.csv";
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

  const getAcceptanceColor = (rate: number) => {
    if (rate >= 70) return "text-green-600";
    if (rate >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-navy-600 mb-2">Thư viện Bài tập</h1>
          <p className="text-gray-600">Rèn luyện kỹ năng lập trình với các bài tập từ dễ đến khó</p>
        </div>
        {isAuthorized && (
          <div className="flex w-full flex-wrap items-center gap-2 xl:max-w-none xl:justify-end">
            <ImportTemplateActions
              onDownloadXlsx={handleDownloadTemplate}
              onDownloadCsv={() => downloadImportTemplate("problemCsv", "problem-import-template.csv")}
              className="shrink-0"
            />
              <Link
                href="/question-bank/categories"
                className="inline-flex min-h-[38px] shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Subject/Topic
              </Link>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handlePickFile}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isParsingFile}
                className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-600 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {isParsingFile ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Import file
              </button>
              <Link
                href="/question-bank/problems/create"
                className="inline-flex min-h-[38px] shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-navy-600 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-navy-700"
              >
                + Tạo bài tập
              </Link>
          </div>
        )}
      </div>

      {isAuthorized && (selectedFile || previewError || importResult) && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900">Xem trước import bài tập</h2>
          {selectedFile && <p className="text-sm text-slate-600 mt-1">File: {selectedFile.name}</p>}
          <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
            Cột mẫu: title, slug, description, difficulty, functionName, outputType, timeLimit, memoryLimit, inputTypes, argNames, hints, isPublished, subjectRef, topicRef, constraints
          </div>

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
                      <th className="px-3 py-2">Tiêu đề</th>
                      <th className="px-3 py-2">Slug</th>
                      <th className="px-3 py-2">Độ khó</th>
                      <th className="px-3 py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.slice(0, 20).map((row) => (
                      <tr key={row.rowNumber} className={row.isValid ? "" : "bg-red-50/50"}>
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2 max-w-md truncate">{row.title || "--"}</td>
                        <td className="px-3 py-2">{row.slug || "--"}</td>
                        <td className="px-3 py-2">{row.difficulty || "--"}</td>
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
              disabled={isUploading || previewRows.length === 0}
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
              placeholder="Nhập tên bài tập..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
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
                setTopicId("");
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="">Tất cả</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chủ đề</label>
            <select
              value={topicId}
              onChange={(e) => {
                setTopicId(e.target.value);
                setPage(1);
              }}
              disabled={!subjectId}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Tất cả</option>
              {topics?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
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
          <p className="text-red-600">Không thể tải danh sách bài tập. Vui lòng thử lại sau.</p>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-600 text-lg">Không tìm thấy bài tập nào</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-navy-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">#</th>
                    <th className="px-6 py-4 text-left font-semibold">Tiêu đề</th>
                    <th className="px-6 py-4 text-center font-semibold">Môn học</th>
                    <th className="px-6 py-4 text-center font-semibold">Chủ đề</th>
                    <th className="px-6 py-4 text-center font-semibold">Độ khó</th>
                    <th className="px-6 py-4 text-center font-semibold">Tỷ lệ AC</th>
                    <th className="px-6 py-4 text-center font-semibold">Lượt nộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.data.map((problem, index) => (
                    <tr
                      key={problem.id}
                      className="group cursor-pointer transition-all hover:bg-navy-50/50 hover:shadow-sm"
                      onClick={() => router.push(isStudent ? `/problems/${problem.slug}` : `/question-bank/problems/${problem.slug}`)}
                    >
                      <td className="px-6 py-4 text-gray-600">{(page - 1) * limit + index + 1}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={isStudent ? `/problems/${problem.slug}` : `/question-bank/problems/${problem.slug}`}
                          className="font-medium text-navy-600 transition-colors group-hover:text-navy-800 group-hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {problem.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {problem.subject ? (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {problem.subject.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {problem.topic ? (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            {problem.topic.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(problem.difficulty)}`}>
                          {getDifficultyText(problem.difficulty)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-semibold ${getAcceptanceColor(problem.acceptanceRate)}`}>
                          {problem.acceptanceRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">{problem.totalSubmissions}</td>
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
