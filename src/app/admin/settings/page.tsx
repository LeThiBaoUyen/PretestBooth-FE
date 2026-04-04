"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { bookingDurationsApi } from "@/lib/api/bookingDurations";
import { checkinApi } from "@/lib/api/checkin";
import { examsApiClient } from "@/lib/api/exams";
import type {
  ExamListItem,
  BookingDurationOption,
  BookingType,
  CheckinThresholdConfig,
  PretestAssignmentMode,
  PretestConfig,
  UpsertPretestConfigRequest,
} from "@/lib/api/types";
import { useAuth } from "@/lib/hooks";
import { hasPermission } from "@/lib/auth/permissions";

const BOOKING_TYPE_OPTIONS: BookingType[] = ["PRACTICE", "EXAM"];
const PRETEST_POOL_PAGE_SIZE = 100;

interface DurationFormData {
  type: BookingType;
  durationMinutes: string;
  displayOrder: string;
  isActive: boolean;
}

const emptyDurationForm: DurationFormData = {
  type: "PRACTICE",
  durationMinutes: "30",
  displayOrder: "",
  isActive: true,
};

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSettingsPage() {
  const { user, userLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const [durationOptions, setDurationOptions] = useState<BookingDurationOption[]>([]);
  const [durationLoading, setDurationLoading] = useState(true);
  const [durationSubmitting, setDurationSubmitting] = useState(false);
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [durationForm, setDurationForm] = useState<DurationFormData>(emptyDurationForm);
  const [durationFilter, setDurationFilter] = useState<BookingType | "ALL">("ALL");

  const [thresholdConfig, setThresholdConfig] = useState<CheckinThresholdConfig | null>(null);
  const [thresholdInput, setThresholdInput] = useState("0.6");
  const [thresholdLoading, setThresholdLoading] = useState(true);
  const [thresholdSubmitting, setThresholdSubmitting] = useState(false);

  const [pretestConfig, setPretestConfig] = useState<PretestConfig | null>(null);
  const [pretestLoading, setPretestLoading] = useState(true);
  const [pretestSubmitting, setPretestSubmitting] = useState(false);
  const [pretestExamPoolCandidates, setPretestExamPoolCandidates] = useState<ExamListItem[]>([]);
  const [pretestEnabled, setPretestEnabled] = useState(false);
  const [pretestMode, setPretestMode] = useState<PretestAssignmentMode>("OFFICIAL_EXAM_POOL");
  const [pretestMaxAttempts, setPretestMaxAttempts] = useState("3");
  const [pretestLockAfterPass, setPretestLockAfterPass] = useState(true);
  const [pretestQuestionCount, setPretestQuestionCount] = useState("20");
  const [pretestProblemCount, setPretestProblemCount] = useState("0");
  const [pretestDuration, setPretestDuration] = useState("60");
  const [pretestPassThreshold, setPretestPassThreshold] = useState("12");
  const [pretestTitlePrefix, setPretestTitlePrefix] = useState("Pretest Auto");
  const [pretestPoolExamIds, setPretestPoolExamIds] = useState<string[]>([]);

  const canManageGeneralSettings = user?.role === "ADMIN";
  const canManagePretestSettings =
    user?.role === "ADMIN" || hasPermission(user, "CREATE_EXAM");
  const randomQuestionCountNumber = Number(pretestQuestionCount);
  const randomProblemCountNumber = Number(pretestProblemCount);
  const randomPretestMaxScore =
    (Number.isFinite(randomQuestionCountNumber) ? randomQuestionCountNumber : 0) +
    (Number.isFinite(randomProblemCountNumber) ? randomProblemCountNumber : 0);

  const filteredDurationOptions = useMemo(
    () =>
      durationFilter === "ALL"
        ? durationOptions
        : durationOptions.filter((option) => option.type === durationFilter),
    [durationOptions, durationFilter],
  );

  const resetDurationForm = () => {
    setEditingDurationId(null);
    setDurationForm(emptyDurationForm);
  };

  const loadCheckinThreshold = async () => {
    try {
      setThresholdLoading(true);
      const threshold = await checkinApi.getThreshold();
      setThresholdConfig(threshold);
      setThresholdInput(String(threshold.threshold));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải ngưỡng xác thực khuôn mặt");
      setThresholdConfig(null);
    } finally {
      setThresholdLoading(false);
    }
  };

  const hydratePretestForm = (config: PretestConfig) => {
    setPretestEnabled(config.isEnabled);
    setPretestMode(config.assignmentMode);
    setPretestMaxAttempts(String(config.maxAttempts));
    setPretestLockAfterPass(config.lockAfterPass);

    const randomConfig = config.questionBankRandom;
    setPretestQuestionCount(String(randomConfig?.questionCount ?? 20));
    setPretestProblemCount(String(randomConfig?.problemCount ?? 0));
    setPretestDuration(String(randomConfig?.duration ?? 60));
    setPretestPassThreshold(String(randomConfig?.passThresholdAbsolute ?? 12));
    setPretestTitlePrefix(randomConfig?.titlePrefix || "Pretest Auto");

    setPretestPoolExamIds(config.officialExamPool?.examIds || []);
  };

  const loadPretestConfig = async () => {
    try {
      setPretestLoading(true);
      const config = await examsApiClient.getPretestConfig();
      setPretestConfig(config);
      hydratePretestForm(config);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải cấu hình pretest");
      setPretestConfig(null);
    } finally {
      setPretestLoading(false);
    }
  };

  const loadPretestPoolCandidates = async () => {
    try {
      const firstPage = await examsApiClient.listExams({
        page: 1,
        limit: PRETEST_POOL_PAGE_SIZE,
        isPublished: true,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      const totalPages =
        firstPage.totalPages && firstPage.totalPages > 0
          ? firstPage.totalPages
          : Math.max(
              1,
              Math.ceil((firstPage.total || firstPage.data?.length || 0) / PRETEST_POOL_PAGE_SIZE),
            );

      let source: ExamListItem[] = Array.isArray(firstPage.data) ? [...firstPage.data] : [];

      for (let page = 2; page <= totalPages; page++) {
        const nextPage = await examsApiClient.listExams({
          page,
          limit: PRETEST_POOL_PAGE_SIZE,
          isPublished: true,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (Array.isArray(nextPage.data) && nextPage.data.length > 0) {
          source = source.concat(nextPage.data);
        }
      }

      const uniqueSource = Array.from(new Map(source.map((exam) => [exam.id, exam])).values());

      const candidates = uniqueSource.filter(
        (exam) =>
          exam.type === "EXAM" &&
          exam.visibility === "PUBLIC" &&
          exam.passingScoreAbsolute !== null &&
          exam.passingScoreAbsolute !== undefined,
      );

      setPretestExamPoolCandidates(candidates);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách đề cho pool pretest");
      setPretestExamPoolCandidates([]);
    }
  };

  const loadDurationOptions = async () => {
    try {
      setDurationLoading(true);
      const items = await bookingDurationsApi.getDurationOptions();
      setDurationOptions(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải cấu hình thời lượng");
      setDurationOptions([]);
    } finally {
      setDurationLoading(false);
    }
  };

  useEffect(() => {
    if (!canManageGeneralSettings && !canManagePretestSettings) {
      return;
    }

    if (canManageGeneralSettings) {
      void loadDurationOptions();
      void loadCheckinThreshold();
    }

    if (canManagePretestSettings) {
      void loadPretestConfig();
      void loadPretestPoolCandidates();
    }
  }, [canManageGeneralSettings, canManagePretestSettings]);

  const handleDurationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManageGeneralSettings) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const durationMinutes = Number(durationForm.durationMinutes);
    const displayOrder =
      durationForm.displayOrder.trim() === "" ? undefined : Number(durationForm.displayOrder);

    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      setError("Thời lượng phải là số nguyên dương");
      return;
    }

    if (displayOrder !== undefined && (!Number.isInteger(displayOrder) || displayOrder < 0)) {
      setError("Thứ tự hiển thị phải là số nguyên >= 0");
      return;
    }

    try {
      setDurationSubmitting(true);
      setError(null);

      if (editingDurationId) {
        await bookingDurationsApi.updateDurationOption(editingDurationId, {
          type: durationForm.type,
          durationMinutes,
          displayOrder: displayOrder ?? null,
          isActive: durationForm.isActive,
        });
      } else {
        await bookingDurationsApi.createDurationOption({
          type: durationForm.type,
          durationMinutes,
          displayOrder,
          isActive: durationForm.isActive,
        });
      }

      await loadDurationOptions();
      resetDurationForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể lưu cấu hình thời lượng");
    } finally {
      setDurationSubmitting(false);
    }
  };

  const editDurationOption = (item: BookingDurationOption) => {
    setEditingDurationId(item.id);
    setDurationForm({
      type: item.type,
      durationMinutes: String(item.durationMinutes),
      displayOrder: item.displayOrder === null ? "" : String(item.displayOrder),
      isActive: item.isActive,
    });
  };

  const deleteDurationOption = async (item: BookingDurationOption) => {
    if (!canManageGeneralSettings) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const confirmed = window.confirm(
      `Xóa mốc ${item.durationMinutes} phút (${item.type})? Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    try {
      setError(null);
      await bookingDurationsApi.deleteDurationOption(item.id);
      await loadDurationOptions();
      if (editingDurationId === item.id) {
        resetDurationForm();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể xóa cấu hình thời lượng");
    }
  };

  const saveCheckinThreshold = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManageGeneralSettings) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const threshold = Number(thresholdInput);
    if (!Number.isFinite(threshold) || threshold < 0.5 || threshold > 0.99) {
      setError("Ngưỡng xác thực phải nằm trong khoảng 0.5 - 0.99");
      return;
    }

    try {
      setThresholdSubmitting(true);
      setError(null);
      const saved = await checkinApi.updateThreshold({ threshold });
      setThresholdConfig(saved);
      setThresholdInput(String(saved.threshold));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật ngưỡng xác thực khuôn mặt");
    } finally {
      setThresholdSubmitting(false);
    }
  };

  const togglePretestPoolExam = (examId: string) => {
    setPretestPoolExamIds((prev) =>
      prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId],
    );
  };

  const savePretestConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canManagePretestSettings) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    const maxAttempts = Number(pretestMaxAttempts);
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
      setError("Số lần thi tối đa mỗi ngày phải nằm trong khoảng 1 - 20");
      return;
    }

    const payload: UpsertPretestConfigRequest = {
      isEnabled: pretestEnabled,
      assignmentMode: pretestMode,
      maxAttempts,
      lockAfterPass: pretestLockAfterPass,
    };

    if (pretestMode === "QUESTION_BANK_RANDOM") {
      const questionCount = Number(pretestQuestionCount);
      const problemCount = Number(pretestProblemCount);
      const duration = Number(pretestDuration);
      const passThresholdAbsolute = Number(pretestPassThreshold);

      if (!Number.isInteger(questionCount) || questionCount < 0) {
        setError("Số câu trắc nghiệm phải là số nguyên >= 0");
        return;
      }

      if (!Number.isInteger(problemCount) || problemCount < 0) {
        setError("Số bài code phải là số nguyên >= 0");
        return;
      }

      if (questionCount + problemCount <= 0) {
        setError("Cần ít nhất 1 câu hỏi hoặc 1 bài code");
        return;
      }

      if (!Number.isInteger(duration) || duration < 5 || duration > 240) {
        setError("Thời lượng pretest phải nằm trong khoảng 5 - 240 phút");
        return;
      }

      if (!Number.isFinite(passThresholdAbsolute) || passThresholdAbsolute <= 0) {
        setError("Ngưỡng đạt pretest phải lớn hơn 0");
        return;
      }

      if (passThresholdAbsolute > questionCount + problemCount) {
        setError(
          `Ngưỡng đạt không được vượt quá tổng điểm tối đa (${questionCount + problemCount})`,
        );
        return;
      }

      payload.questionBankRandom = {
        titlePrefix: pretestTitlePrefix.trim() || null,
        questionCount,
        problemCount,
        duration,
        passThresholdAbsolute,
        subjectIds: [],
        topicId: null,
        shuffleQuestions: true,
        shuffleChoices: true,
      };
      payload.officialExamPool = null;
    } else {
      if (pretestEnabled && pretestPoolExamIds.length === 0) {
        setError("Vui lòng chọn ít nhất 1 đề cho pool pretest chính thức");
        return;
      }

      payload.questionBankRandom = null;
      payload.officialExamPool = {
        examIds: pretestPoolExamIds,
      };
    }

    try {
      setPretestSubmitting(true);
      setError(null);
      const savedConfig = await examsApiClient.updatePretestConfig(payload);
      setPretestConfig(savedConfig);
      hydratePretestForm(savedConfig);
      await loadPretestPoolCandidates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật cấu hình pretest");
    } finally {
      setPretestSubmitting(false);
    }
  };

  if (userLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
          <p className="mt-3 text-sm text-gray-600">Đang tải thông tin cài đặt...</p>
        </div>
      </main>
    );
  }

  if (!canManageGeneralSettings && !canManagePretestSettings) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
          Bạn không có quyền truy cập trang cài đặt hệ thống.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="ui-page-header">
          <div>
            <h1 className="ui-page-title">Cài đặt hệ thống</h1>
            <p className="ui-page-subtitle">
              Quản trị ngưỡng xác thực khuôn mặt và các mốc thời lượng đặt booth.
            </p>
          </div>
        </div>

        <nav className="-mt-2 flex flex-wrap items-center gap-2" aria-label="Admin settings navigation">
          <Link
            href="/admin/booths"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Quản lý Booth
          </Link>
          <Link
            href="/admin/booths/schedule"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Lịch trình Booth
          </Link>
          <Link
            href="/admin/settings"
            className="inline-flex items-center rounded-full bg-navy-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            Cài đặt hệ thống
          </Link>
        </nav>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {canManageGeneralSettings && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ngưỡng xác thực khuôn mặt</h2>
              <p className="text-sm text-gray-600">
                Áp dụng cho toàn bộ luồng check-in booth. Giá trị thấp hơn sẽ dễ pass hơn.
              </p>
            </div>
            <button
              type="button"
              onClick={loadCheckinThreshold}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm mới ngưỡng
            </button>
          </div>

          {thresholdLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải ngưỡng xác thực...
            </div>
          ) : (
            <form onSubmit={saveCheckinThreshold} className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <input
                type="number"
                min={0.5}
                max={0.99}
                step={0.01}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                disabled={thresholdSubmitting}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100"
                placeholder="0.6"
              />

              <div className="md:col-span-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                <p>
                  Giá trị hiện tại: <span className="font-semibold">{thresholdConfig?.threshold ?? "-"}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Nguồn cấu hình: {thresholdConfig?.source ?? "-"} • Cập nhật lúc:{" "}
                  {thresholdConfig?.updatedAt ? formatDateTime(thresholdConfig.updatedAt) : "-"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={thresholdSubmitting}
                  className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
                >
                  {thresholdSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu ngưỡng
                </button>
              </div>
            </form>
          )}
          </div>
        )}

        {canManagePretestSettings && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cấu hình Pretest</h2>
              <p className="text-sm text-gray-600">
                Thiết lập mode gán đề, ngưỡng đạt và số lần thi cho luồng EXAM sau check-in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadPretestConfig();
                void loadPretestPoolCandidates();
              }}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm mới pretest
            </button>
          </div>

          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">Luồng áp dụng cho Student EXAM</p>
            <p className="mt-1">
              Sau khi student check-in EXAM, hệ thống gán đề tự động và vào bài ngay, không cho chọn đề thủ công.
            </p>
            <p className="mt-1">
              Nếu tắt pretest, luồng EXAM sẽ không thể bắt đầu. Hãy bật pretest trước khi vận hành ca thi.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 md:grid-cols-2">
            <p>
              <span className="font-semibold">Mode OFFICIAL_EXAM_POOL:</span> gán ngẫu nhiên 1 đề từ pool.
              Ngưỡng đạt lấy theo chính đề được gán.
            </p>
            <p>
              <span className="font-semibold">Mode QUESTION_BANK_RANDOM:</span> tạo đề ngẫu nhiên từ question bank.
              Ngưỡng đạt lấy từ cấu hình pretest.
            </p>
          </div>

          {pretestLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải cấu hình pretest...
            </div>
          ) : (
            <form onSubmit={savePretestConfig} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={pretestEnabled}
                    onChange={(e) => setPretestEnabled(e.target.checked)}
                  />
                  Bật pretest
                </label>

                <select
                  value={pretestMode}
                  onChange={(e) => setPretestMode(e.target.value as PretestAssignmentMode)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="OFFICIAL_EXAM_POOL">Pool đề thi chính thức</option>
                  <option value="QUESTION_BANK_RANDOM">Random từ question bank</option>
                </select>

                <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={pretestMaxAttempts}
                  onChange={(e) => setPretestMaxAttempts(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="Số lần tối đa / ngày (1-20)"
                />

                <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={pretestLockAfterPass}
                    onChange={(e) => setPretestLockAfterPass(e.target.checked)}
                  />
                  Khóa sau khi đạt
                </label>
              </div>

              <p className="-mt-1 text-xs text-gray-500">
                Số lần thi tối đa được tính theo từng ngày (múi giờ Việt Nam). Khi bật "Khóa sau khi đạt", student đạt
                ngưỡng sẽ không được thi lại.
              </p>

              {pretestMode === "QUESTION_BANK_RANDOM" && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-3 text-sm font-semibold text-gray-800">Cấu hình QUESTION_BANK_RANDOM</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-gray-600">Tiền tố tên đề</span>
                      <input
                        type="text"
                        value={pretestTitlePrefix}
                        onChange={(e) => setPretestTitlePrefix(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="Pretest Auto"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-gray-600">Số câu trắc nghiệm</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={pretestQuestionCount}
                        onChange={(e) => setPretestQuestionCount(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="0"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-gray-600">Số bài code</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={pretestProblemCount}
                        onChange={(e) => setPretestProblemCount(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="0"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-gray-600">Thời lượng (phút)</span>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        step={1}
                        value={pretestDuration}
                        onChange={(e) => setPretestDuration(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="60"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-gray-600">Ngưỡng đạt tuyệt đối</span>
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={pretestPassThreshold}
                        onChange={(e) => setPretestPassThreshold(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="12"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Tổng điểm tối đa hiện tại: <span className="font-semibold">{randomPretestMaxScore}</span>. Ngưỡng đạt
                    không được vượt quá giá trị này. Random hiện đang lấy từ toàn bộ ngân hàng câu hỏi EXAM đã publish.
                  </p>
                </div>
              )}

              {pretestMode === "OFFICIAL_EXAM_POOL" && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 text-sm font-semibold text-gray-800">
                    Chọn đề EXAM PUBLIC có ngưỡng đạt để đưa vào pool
                  </p>
                  <p className="mb-2 text-xs text-gray-500">
                    Đã chọn <span className="font-semibold">{pretestPoolExamIds.length}</span> đề • Khả dụng{" "}
                    <span className="font-semibold">{pretestExamPoolCandidates.length}</span> đề đạt điều kiện.
                  </p>
                  {pretestExamPoolCandidates.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Chưa có đề nào đủ điều kiện (EXAM PUBLIC + có ngưỡng đạt).
                    </p>
                  ) : (
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {pretestExamPoolCandidates.map((exam) => (
                        <label
                          key={exam.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                        >
                          <span className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={pretestPoolExamIds.includes(exam.id)}
                              onChange={() => togglePretestPoolExam(exam.id)}
                            />
                            {exam.title}
                          </span>
                          <span className="text-xs font-semibold text-emerald-700">
                            Ngưỡng: {exam.passingScoreAbsolute}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  Cập nhật gần nhất: {pretestConfig?.updatedAt ? formatDateTime(pretestConfig.updatedAt) : "-"}
                </p>
                <button
                  type="submit"
                  disabled={pretestSubmitting}
                  className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
                >
                  {pretestSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu cấu hình pretest
                </button>
              </div>
            </form>
          )}
          </div>
        )}

        {canManageGeneralSettings && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cấu hình thời lượng đặt booth</h2>
              <p className="text-sm text-gray-600">
                Admin có thể thêm, chỉnh sửa hoặc xóa các mốc thời gian khả dụng cho sinh viên.
              </p>
            </div>
            <button
              type="button"
              onClick={loadDurationOptions}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm mới danh sách
            </button>
          </div>

          <form onSubmit={handleDurationSubmit} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            <select
              value={durationForm.type}
              onChange={(e) => setDurationForm((prev) => ({ ...prev, type: e.target.value as BookingType }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {BOOKING_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type === "PRACTICE" ? "Luyện tập" : "Kiểm tra"}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={5}
              max={240}
              step={1}
              value={durationForm.durationMinutes}
              onChange={(e) => setDurationForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Thời lượng (phút)"
            />

            <input
              type="number"
              min={0}
              step={1}
              value={durationForm.displayOrder}
              onChange={(e) => setDurationForm((prev) => ({ ...prev, displayOrder: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Thứ tự hiển thị"
            />

            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={durationForm.isActive}
                onChange={(e) => setDurationForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Đang hoạt động
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={durationSubmitting}
                className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-navy-300"
              >
                {durationSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDurationId ? "Lưu" : "Thêm"}
              </button>
              {editingDurationId && (
                <button
                  type="button"
                  onClick={resetDurationForm}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </form>

          <div className="mb-4 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              Lọc theo loại:
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value as BookingType | "ALL")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">Tất cả</option>
                <option value="PRACTICE">Luyện tập</option>
                <option value="EXAM">Kiểm tra</option>
              </select>
            </label>
            <span className="text-sm text-gray-500">
              ({filteredDurationOptions.length} / {durationOptions.length} mốc)
            </span>
          </div>

          {durationLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải cấu hình thời lượng...
            </div>
          ) : durationOptions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
              Chưa có mốc thời lượng nào.
            </p>
          ) : filteredDurationOptions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
              Không có mốc thời lượng nào phù hợp với bộ lọc.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredDurationOptions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <div className="text-sm text-gray-800">
                    <span className="font-semibold">{item.durationMinutes} phút</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span>{item.type === "PRACTICE" ? "Luyện tập" : "Kiểm tra"}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span>Thứ tự: {item.displayOrder ?? "-"}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span className={item.isActive ? "text-emerald-700" : "text-slate-500"}>
                      {item.isActive ? "Đang hoạt động" : "Ngưng sử dụng"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => editDurationOption(item)}
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDurationOption(item)}
                      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        )}
      </div>
    </main>
  );
}
