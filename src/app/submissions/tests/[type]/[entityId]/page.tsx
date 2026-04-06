"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { submissionsApi } from "@/lib/api/execution";
import { useAuth } from "@/lib/hooks";

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: "bg-green-100 text-green-800",
  WRONG_ANSWER: "bg-red-100 text-red-800",
  COMPILE_ERROR: "bg-orange-100 text-orange-800",
  RUNTIME_ERROR: "bg-purple-100 text-purple-800",
  TIME_LIMIT_EXCEEDED: "bg-yellow-100 text-yellow-800",
  MEMORY_LIMIT_EXCEEDED: "bg-yellow-100 text-yellow-800",
  PENDING: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-indigo-100 text-indigo-800",
  GRADED: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: "Đạt",
  WRONG_ANSWER: "Sai",
  COMPILE_ERROR: "Lỗi biên dịch",
  RUNTIME_ERROR: "Lỗi runtime",
  TIME_LIMIT_EXCEEDED: "Quá thời gian",
  MEMORY_LIMIT_EXCEEDED: "Quá bộ nhớ",
  PENDING: "Đang chạy",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  GRADED: "Đã chấm",
};

export default function SubmissionTestDetailPage() {
  const params = useParams();
  const { accessToken, user, userLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFilter, setResultFilter] = useState<"ALL" | "PASSED" | "FAILED">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");

  const type = String(params.type || "").toUpperCase();
  const entityId = String(params.entityId || "");

  const normalizedType = type === "PROBLEM" || type === "EXAM" ? type : "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["submission-test-detail", normalizedType, entityId, !!accessToken],
    queryFn: () =>
      submissionsApi.getSubmissionTestMembers(
        normalizedType as "PROBLEM" | "EXAM",
        entityId,
        {
          page: 1,
          limit: 100,
          sortOrder: "desc",
        },
        accessToken || undefined,
      ),
    enabled: !!normalizedType && !!entityId,
    retry: 1,
  });

  if (userLoading) {
    return <div className="p-10 text-center text-gray-500">Đang kiểm tra phiên đăng nhập...</div>;
  }

  if (!user || !accessToken) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-700">Bạn cần đăng nhập để xem chi tiết nộp bài.</p>
        <Link href="/login" className="mt-4 inline-block rounded-lg bg-navy-600 px-4 py-2 font-semibold text-white">
          Đi tới đăng nhập
        </Link>
      </div>
    );
  }

  if (!normalizedType || !entityId) {
    return <div className="p-10 text-center text-red-500">Đường dẫn không hợp lệ.</div>;
  }

  const members = data?.data || [];
  const availableStatuses = useMemo(() => {
    const values = new Set<string>();
    members.forEach((item) => values.add(item.status));
    return Array.from(values);
  }, [members]);

  const filteredMembers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const matched = members.filter((member) => {
      const displayName = (member.userName || member.userEmail || "").toLowerCase();
      const studentCode = (member.studentCode || "").toLowerCase();

      if (keyword && !displayName.includes(keyword) && !studentCode.includes(keyword)) {
        return false;
      }

      if (resultFilter === "PASSED" && member.passed !== true) {
        return false;
      }

      if (resultFilter === "FAILED" && member.passed !== false) {
        return false;
      }

      if (statusFilter !== "ALL" && member.status !== statusFilter) {
        return false;
      }

      return true;
    });

    matched.sort((a, b) => {
      const aTime = new Date(a.submittedAt).getTime();
      const bTime = new Date(b.submittedAt).getTime();
      return dateSort === "desc" ? bTime - aTime : aTime - bTime;
    });

    return matched;
  }, [members, searchTerm, resultFilter, statusFilter, dateSort]);

  const passedCount = filteredMembers.filter((m) => m.passed === true).length;
  const failedCount = filteredMembers.filter((m) => m.passed === false).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            {isLoading ? "Đang tải bài test..." : `Chi tiết nộp bài: ${data?.test.title || "Không xác định"}`}
          </h1>
          {!isLoading && data?.test && (
            <p className="mt-2 text-sm text-slate-600">
              Loại: {data.test.type === "PROBLEM" ? "Bài tập code" : "Bài thi"}
              {data.test.type === "EXAM" ? ` - ${data.test.questionCount || 0} câu hỏi, ${data.test.problemCount || 0} bài code` : ""}
            </p>
          )}
        </div>

        {!isLoading && !isError && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tìm theo tên hoặc MSSV
                </label>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nhập tên hoặc MSSV"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-navy-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Kết quả đạt
                </label>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value as "ALL" | "PASSED" | "FAILED")}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-navy-500"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="PASSED">Đạt</option>
                  <option value="FAILED">Không đạt</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Trạng thái chấm
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-navy-500"
                >
                  <option value="ALL">Tất cả</option>
                  {availableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status] || status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sắp xếp ngày nộp
                </label>
                <select
                  value={dateSort}
                  onChange={(e) => setDateSort(e.target.value as "desc" | "asc")}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-navy-500"
                >
                  <option value="desc">Mới nhất</option>
                  <option value="asc">Cũ nhất</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                Tổng: {filteredMembers.length}
              </span>
              <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-800">
                Đạt: {passedCount}
              </span>
              <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-800">
                Không đạt: {failedCount}
              </span>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          {isLoading ? (
            <div className="p-10 text-center text-gray-500">Đang tải danh sách người nộp...</div>
          ) : isError ? (
            <div className="p-10 text-center text-red-500">{(error as Error)?.message || "Không thể tải dữ liệu."}</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-10 text-center text-gray-500">Chưa có người nộp cho bài test này.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sinh viên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Kết quả</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Kết quả đạt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ngày nộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-semibold">{member.userName || member.userEmail || "Không rõ"}</div>
                        <div className="text-xs text-gray-500">{member.studentCode || "N/A"}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[member.status] || "bg-gray-100 text-gray-800"}`}>
                          {STATUS_LABELS[member.status] || member.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {normalizedType === "PROBLEM"
                          ? `${member.passedTestCases ?? 0}/${member.totalTestCases ?? 0}`
                          : member.score !== null && member.maxScore !== null
                            ? `${member.score}/${member.maxScore}`
                            : "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {member.passed === true ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">Đạt</span>
                        ) : member.passed === false ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">Không đạt</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(member.submittedAt).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
