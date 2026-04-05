"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle,
  CircleAlert,
  CircleCheck,
  Download,
  FileSpreadsheet,
  FileDown,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { usersApi } from "@/lib/api/users";
import { getTokenManager } from "@/lib/auth/tokenManager";
import { hasPermission } from "@/lib/auth/permissions";

type PreviewRow = {
  rowNumber: number;
  studentCode: string;
  email: string;
  name: string;
  className: string;
  dateOfBirth: string;
  isValid: boolean;
  errors: string[];
};

type ImportResult = {
  total: number;
  success: number;
  failed: number;
  errors: string[];
};

type StudentForm = {
  email: string;
  studentCode: string;
  name: string;
  className: string;
  dateOfBirth: string;
};

const REQUIRED_COLUMNS = ["studentCode", "email", "name"];

function normalizeHeaderKey(header: string) {
  const normalized = header.replace(/\s+/g, "").replace(/[_-]/g, "").toLowerCase();
  if (normalized === "studentcode" || normalized === "mssv") return "studentCode";
  if (normalized === "email") return "email";
  if (normalized === "name" || normalized === "fullname" || normalized === "hoten") return "name";
  if (normalized === "classname" || normalized === "lophocphan" || normalized === "lop") return "className";
  if (normalized === "dateofbirth" || normalized === "dob" || normalized === "ngaysinh") return "dateOfBirth";
  return header;
}

function excelSerialToDate(serial: number) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return new Date(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate());
}

function formatDateForDisplay(raw: unknown) {
  if (raw === null || raw === undefined || raw === "") return "";

  if (typeof raw === "number") {
    const date = excelSerialToDate(raw);
    if (Number.isNaN(date.getTime())) return "";
    const dd = date.getDate().toString().padStart(2, "0");
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${dd}/${mm}/${date.getFullYear()}`;
  }

  const text = String(raw).trim();
  return text;
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

function validatePreviewRow(row: PreviewRow) {
  const errors: string[] = [];

  if (!row.studentCode) errors.push("Thiếu MSSV");
  if (!row.email) errors.push("Thiếu email");
  if (!row.name) errors.push("Thiếu tên");
  if (row.email && !row.email.endsWith("@student.iuh.edu.vn")) {
    errors.push("Email phải có đuôi @student.iuh.edu.vn");
  }

  return {
    ...row,
    isValid: errors.length === 0,
    errors,
  };
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

export default function AdminUsersPage() {
  const { user } = useAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [lockFilter, setLockFilter] = useState<"ALL" | "LOCKED" | "ACTIVE">("ALL");
  const [loading, setLoading] = useState(true);
  const [savingForm, setSavingForm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState<StudentForm>({
    email: "",
    studentCode: "",
    name: "",
    className: "",
    dateOfBirth: "",
  });

  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const studentFormRef = useRef<HTMLFormElement>(null);

  const validRowsCount = previewRows.filter((row) => row.isValid).length;
  const invalidRowsCount = previewRows.length - validRowsCount;

  const scrollToStudentForm = () => {
    setTimeout(() => {
      const el = studentFormRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const balancedOffset = Math.max(90, (window.innerHeight - rect.height) / 2);
      const targetTop = window.scrollY + rect.top - balancedOffset;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }, 60);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getUsers({
        page,
        limit: 12,
        search: search || undefined,
        className: classFilter || undefined,
        isLocked: lockFilter === "ALL" ? undefined : lockFilter === "LOCKED",
        role: "STUDENT",
      });
      if (Array.isArray(res)) {
        setUsers(res);
        setTotal(res.length);
      } else {
        setUsers(Array.isArray((res as any)?.data) ? (res as any).data : []);
        setTotal(Number((res as any)?.total ?? 0));
      }
    } catch (e) {
      console.error(e);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission(user, "MANAGE_STUDENTS")) {
      fetchUsers();
    }
  }, [user, page, search, classFilter, lockFilter]);

  const handleToggleLock = async (id: string, currentlyLocked: boolean) => {
    if (!confirm(currentlyLocked ? "Mở khóa tài khoản này?" : "Khóa tài khoản này?")) return;

    try {
      await usersApi.updateUser(id, {
        isLocked: !currentlyLocked,
        lockedReason: !currentlyLocked ? "Quản trị viên khóa" : undefined,
      });
      fetchUsers();
    } catch (e: any) {
      alert(e.message || "Có lỗi xảy ra");
    }
  };

  const resetStudentForm = () => {
    setStudentForm({
      email: "",
      studentCode: "",
      name: "",
      className: "",
      dateOfBirth: "",
    });
    setEditingStudentId(null);
    setShowForm(false);
  };

  const handleCreateStudent = () => {
    setEditingStudentId(null);
    setStudentForm({
      email: "",
      studentCode: "",
      name: "",
      className: "",
      dateOfBirth: "",
    });
    setShowForm(true);
    scrollToStudentForm();
  };

  const handleEditStudent = (student: any) => {
    setEditingStudentId(student.id);
    setStudentForm({
      email: student.email || "",
      studentCode: student.studentCode || "",
      name: student.name || "",
      className: student.className || "",
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : "",
    });
    setShowForm(true);
    scrollToStudentForm();
  };

  const handleSubmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentForm.email.trim() || !studentForm.studentCode.trim() || !studentForm.name.trim()) {
      alert("Vui lòng nhập đầy đủ Email, MSSV và Họ tên");
      return;
    }

    setSavingForm(true);
    try {
      if (editingStudentId) {
        await usersApi.updateUser(editingStudentId, {
          email: studentForm.email.trim().toLowerCase(),
          studentCode: studentForm.studentCode.trim(),
          name: studentForm.name.trim(),
          className: studentForm.className.trim() || undefined,
          dateOfBirth: studentForm.dateOfBirth || undefined,
        });
        alert("Cập nhật sinh viên thành công");
      } else {
        const response = await usersApi.createUser({
          email: studentForm.email.trim().toLowerCase(),
          studentCode: studentForm.studentCode.trim(),
          name: studentForm.name.trim(),
          className: studentForm.className.trim() || undefined,
          dateOfBirth: studentForm.dateOfBirth || undefined,
          role: "STUDENT",
        });

        const successMessage =
          response?.message ||
          "Tài khoản sinh viên đã tạo thành công và thông tin đăng nhập đã được gửi qua email.";
        alert(successMessage);
      }

      resetStudentForm();
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Không thể lưu sinh viên");
    } finally {
      setSavingForm(false);
    }
  };

  const handleDeleteStudent = async (student: any) => {
    if (!confirm(`Xóa sinh viên ${student.name || student.email}?`)) return;

    try {
      await usersApi.deleteUser(student.id);
      if (editingStudentId === student.id) {
        resetStudentForm();
      }
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Không thể xóa sinh viên");
    }
  };

  const toPreviewRows = (rows: Record<string, unknown>[]) => {
    return rows.map((row, index) => {
      const previewRow: PreviewRow = {
        rowNumber: index + 2,
        studentCode: String(row.studentCode ?? "").trim(),
        email: String(row.email ?? "").trim().toLowerCase(),
        name: String(row.name ?? "").trim(),
        className: String(row.className ?? "").trim(),
        dateOfBirth: formatDateForDisplay(row.dateOfBirth),
        isValid: true,
        errors: [],
      };

      return validatePreviewRow(previewRow);
    });
  };

  const parseFileForPreview = async (file: File) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      const parsed = parseCsvContent(text);
      return {
        headers: parsed.headers,
        rows: toPreviewRows(parsed.rows),
      };
    }

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        return { headers: [] as string[], rows: [] as PreviewRow[] };
      }

      const sheet = workbook.Sheets[firstSheet];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

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

      return {
        headers: Array.from(headerSet),
        rows: toPreviewRows(normalizedRows),
      };
    }

    throw new Error("Định dạng không hỗ trợ. Chỉ nhận .csv, .xlsx, .xls");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const missingColumns = REQUIRED_COLUMNS.filter((col) => !parsed.headers.includes(col));
      if (missingColumns.length > 0) {
        setPreviewError(`Thiếu cột bắt buộc: ${missingColumns.join(", ")}`);
        return;
      }

      setPreviewRows(parsed.rows);
    } catch (err: any) {
      setPreviewError(err.message || "Không thể đọc file để xem trước.");
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
      const res = await fetch(usersApi.getImportUrl(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Import thất bại");
      }

      const payload = data?.data ?? data;
      const total = Number(payload?.total ?? payload?.totalProcessed ?? 0);
      const success = Number(payload?.success ?? payload?.successCount ?? 0);
      const failed = Number(payload?.failed ?? payload?.failedCount ?? 0);
      const errors = Array.isArray(payload?.errors)
        ? payload.errors
        : Array.isArray(payload?.failedRows)
          ? payload.failedRows
          : [];

      setImportResult({
        total,
        success,
        failed,
        errors,
      });

      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Lỗi khi import file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetImport = () => {
    setSelectedFile(null);
    setPreviewRows([]);
    setPreviewError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const csv = [
      "studentCode,email,name,className,dateOfBirth",
      "21000001,21000001@student.iuh.edu.vn,Nguyen Van A,DHKTPM17ATT,2003-08-15",
      "21000002,21000002@student.iuh.edu.vn,Tran Thi B,DHKTPM17BTT,15/09/2003",
    ].join("\r\n");

    const csvWithBom = `\uFEFF${csv}`;

    const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportStudents = async () => {
    setIsExporting(true);
    try {
      const token = getTokenManager().getAccessToken();
      const exportUrl = usersApi.getExportUrl({
        search: search || undefined,
        className: classFilter || undefined,
        isLocked: lockFilter === "ALL" ? undefined : lockFilter === "LOCKED",
        sortOrder: "desc",
        format: "xlsx",
      });

      const response = await fetch(exportUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Xuất danh sách thất bại");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const fileNameMatch = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = fileNameMatch?.[1] || "students_export.xlsx";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Không thể xuất danh sách sinh viên");
    } finally {
      setIsExporting(false);
    }
  };

  if (!hasPermission(user, "MANAGE_STUDENTS")) return null;

  const safeUsers = Array.isArray(users) ? users : [];
  const canManageLecturers = hasPermission(user, "LECTURER_ADMIN");

  return (
    <div className="pb-8">
      <div className="ui-page-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="ui-page-title">Quản lý Sinh viên</h1>
            <p className="ui-page-subtitle">
              Quản lý tài khoản sinh viên và nhập danh sách với bước xem trước trước khi xác nhận.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href="/admin/users"
                className="inline-flex items-center rounded-full bg-navy-600 px-3 py-1.5 text-xs font-bold text-white"
              >
                Quản lý sinh viên
              </Link>

              {canManageLecturers && (
                <Link
                  href="/admin/lecturers"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Quản lý giảng viên
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
          <button
            onClick={handleCreateStudent}
            className="inline-flex items-center px-4 py-2 bg-navy-600 text-white text-sm font-semibold rounded-lg hover:bg-navy-700 transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Tạo sinh viên
          </button>
          <button
            onClick={handleExportStudents}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition disabled:opacity-60"
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            {isExporting ? "Đang xuất..." : "Xuất file"}
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Tải mẫu CSV
          </button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileUpload}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsingFile || isUploading}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition disabled:bg-gray-400"
          >
            {isParsingFile ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1.5" />
            )}
            Import file
          </button>
        </div>
      </div>
      </div>

      {showForm && (
        <form ref={studentFormRef} onSubmit={handleSubmitStudent} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {editingStudentId ? "Cập nhật sinh viên" : "Tạo sinh viên mới"}
            </h2>
            <button
              type="button"
              onClick={resetStudentForm}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              value={studentForm.email}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email sinh viên"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={studentForm.studentCode}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, studentCode: e.target.value }))}
              placeholder="MSSV"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={studentForm.name}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Họ tên"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={studentForm.className}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, className: e.target.value }))}
              placeholder="Lớp học phần"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={studentForm.dateOfBirth}
              onChange={(e) => setStudentForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetStudentForm}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingForm}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Save className="mr-1 h-4 w-4" />
              {savingForm ? "Đang lưu..." : editingStudentId ? "Cập nhật" : "Tạo mới"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Cấu trúc file import</h2>
        <p className="mt-1 text-sm text-slate-600">
          Cột bắt buộc: <span className="font-semibold">studentCode</span>, <span className="font-semibold">email</span>, <span className="font-semibold">name</span>. Cột <span className="font-semibold">className</span> và <span className="font-semibold">dateOfBirth</span> là tùy chọn.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700">Cột</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Bắt buộc</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Định dạng</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-3 py-2 font-medium">studentCode</td>
                <td className="px-3 py-2">Có</td>
                <td className="px-3 py-2">Chuỗi</td>
                <td className="px-3 py-2">MSSV duy nhất</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">email</td>
                <td className="px-3 py-2">Có</td>
                <td className="px-3 py-2">user@student.iuh.edu.vn</td>
                <td className="px-3 py-2">Bắt buộc đúng đuôi @student.iuh.edu.vn</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">name</td>
                <td className="px-3 py-2">Có</td>
                <td className="px-3 py-2">Chuỗi</td>
                <td className="px-3 py-2">Họ tên sinh viên</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">className</td>
                <td className="px-3 py-2">Không</td>
                <td className="px-3 py-2">Chuỗi</td>
                <td className="px-3 py-2">Lớp học phần</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">dateOfBirth</td>
                <td className="px-3 py-2">Không</td>
                <td className="px-3 py-2">YYYY-MM-DD hoặc DD/MM/YYYY</td>
                <td className="px-3 py-2">Nếu hợp lệ, mật khẩu mặc định sẽ là DDMM</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {(selectedFile || previewError) && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Xem trước dữ liệu import</h2>
              {selectedFile && (
                <p className="mt-1 text-sm text-slate-600">
                  File: <span className="font-semibold">{selectedFile.name}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleResetImport}
                disabled={isUploading}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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
          </div>

          {previewError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {previewError}
            </div>
          )}

          {previewRows.length > 0 && (
            <>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  Tổng dòng: {previewRows.length}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                  <CircleCheck className="mr-1 h-4 w-4" /> Hợp lệ: {validRowsCount}
                </span>
                <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">
                  <CircleAlert className="mr-1 h-4 w-4" /> Lỗi: {invalidRowsCount}
                </span>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">Dòng</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">MSSV</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Email</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Tên</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Lớp học phần</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Ngày sinh</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.slice(0, 20).map((row) => (
                      <tr key={row.rowNumber} className={row.isValid ? "" : "bg-red-50/50"}>
                        <td className="px-3 py-2 font-medium">{row.rowNumber}</td>
                        <td className="px-3 py-2">{row.studentCode || "--"}</td>
                        <td className="px-3 py-2">{row.email || "--"}</td>
                        <td className="px-3 py-2">{row.name || "--"}</td>
                        <td className="px-3 py-2">{row.className || "--"}</td>
                        <td className="px-3 py-2">{row.dateOfBirth || "--"}</td>
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

              {previewRows.length > 20 && (
                <p className="mt-2 text-xs text-slate-500">Hiển thị 20 dòng đầu tiên để kiểm tra nhanh.</p>
              )}
            </>
          )}
        </div>
      )}

      {importResult && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-emerald-800">Kết quả import</h3>
          <p className="mt-2 text-sm text-emerald-900">
            Tổng dòng: {importResult.total} | Thành công: {importResult.success} | Thất bại: {importResult.failed}
          </p>
          {importResult.errors.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">Chi tiết lỗi:</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">
                {importResult.errors.slice(0, 8).map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ul>
              {importResult.errors.length > 8 && (
                <p className="mt-1 text-xs text-amber-700">...và {importResult.errors.length - 8} lỗi khác.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center bg-gray-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm theo MSSV, Tên hoặc Email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-navy-500 focus:border-navy-500 text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <input
            type="text"
            placeholder="Lọc theo lớp học phần"
            className="ml-3 w-52 px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy-500 focus:border-navy-500 text-sm"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="ml-3 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            value={lockFilter}
            onChange={(e) => {
              setLockFilter(e.target.value as "ALL" | "LOCKED" | "ACTIVE");
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>
          <div className="ml-4 text-sm text-gray-500 font-medium">Tổng cộng: {total} sinh viên</div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
        ) : safeUsers.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white">Không tìm thấy sinh viên nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b-2 border-gray-100">
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm">Sinh viên</th>
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm">MSSV</th>
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm">Lớp học phần</th>
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm">Điểm tích lũy</th>
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm">Trạng thái</th>
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {safeUsers.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900">{student.name || "Chưa cập nhật"}</div>
                      <div className="text-xs text-gray-500">{student.email}</div>
                    </td>
                    <td className="py-4 px-6 font-medium text-navy-700">{student.studentCode || "--"}</td>
                    <td className="py-4 px-6 text-gray-700">{student.className || "--"}</td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-yellow-600">{student.totalPoints || 0}</span>
                    </td>
                    <td className="py-4 px-6">
                      {student.isLocked ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Đã khóa
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Hoạt động
                        </span>
                      )}
                      {student.isLocked && student.lockedReason && (
                        <p className="text-[10px] text-red-500 mt-1">{student.lockedReason}</p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleEditStudent(student)}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleToggleLock(student.id, student.isLocked)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            student.isLocked
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          }`}
                        >
                          {student.isLocked ? (
                            <>
                              <UserCheck className="w-4 h-4 mr-1" />
                              Mở khóa
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4 mr-1" />
                              Khóa
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student)}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 12 && (
          <div className="p-4 border-t border-gray-100 flex justify-center gap-2 bg-gray-50">
            {Array.from({ length: Math.ceil(total / 12) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`px-3 py-1 rounded font-bold text-sm ${
                  p === page
                    ? "bg-navy-600 text-white"
                    : "bg-white text-navy-600 border border-navy-200 hover:bg-navy-50"
                }`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
