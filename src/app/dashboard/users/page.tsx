"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Search, 
  UserX, 
  UserCheck, 
  AlertCircle,
  FileSpreadsheet,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { usersApi } from "@/lib/api/users";
import { getTokenManager } from "@/lib/auth/tokenManager";

export default function AdminUsersPage() {
  const { user } = useAuth();
  
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getUsers({ page, limit: 12, search: search || undefined, role: "STUDENT" });
      setUsers(res.data);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchUsers();
    }
  }, [user, page, search]);

  const handleToggleLock = async (id: string, currentlyLocked: boolean) => {
    if (!confirm(currentlyLocked ? "Mở khóa tài khoản này?" : "Khóa tài khoản này?")) return;
    try {
      await usersApi.updateUser(id, { 
        isLocked: !currentlyLocked, 
        lockedReason: !currentlyLocked ? "Quản trị viên khóa" : undefined 
      });
      fetchUsers();
    } catch (e: any) {
      alert(e.message || "Có lỗi xảy ra");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const token = getTokenManager().getAccessToken();
      const res = await fetch(usersApi.getImportUrl(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Import failed");

      alert(`Import thành công! Đã xử lý ${data.totalProcessed} dòng. Thành công: ${data.successCount}, Thất bại: ${data.failedCount}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Lỗi khi upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-600">Quản lý Sinh viên</h1>
          <p className="text-gray-600 mt-2">Tìm kiếm, khóa tài khoản, hoặc import danh sách sinh viên mới từ Excel/CSV.</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition disabled:bg-gray-400"
          >
            {isUploading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            ) : (
              <FileSpreadsheet className="w-5 h-5 mr-2" />
            )}
            Import Excel/CSV
          </button>
        </div>
      </div>

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
          <div className="ml-4 text-sm text-gray-500 font-medium">
            Tổng cộng: {total} sinh viên
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white">Không tìm thấy sinh viên nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b-2 border-gray-100">
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm">Sinh viên</th>
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm">MSSV</th>
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm">Điểm tích lũy</th>
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm">Trạng thái</th>
                  <th className="py-3 px-6 font-semibold text-gray-500 text-sm text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {users.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900">{student.name || "Chưa cập nhật"}</div>
                      <div className="text-xs text-gray-500">{student.email}</div>
                    </td>
                    <td className="py-4 px-6 font-medium text-navy-700">
                      {student.studentCode || "--"}
                    </td>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
