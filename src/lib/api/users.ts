import { httpClient } from "./httpClient";
import type { LecturerPermission, User } from "./types";

export interface PaginatedUsers {
  data: Partial<User>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateStudentPayload {
  email: string;
  name: string;
  role: "STUDENT";
  studentCode: string;
  className?: string;
  dateOfBirth?: string;
}

export interface CreateStudentResponse {
  id: string;
  email: string;
  name?: string | null;
  emailSent: boolean;
  message: string;
}

export interface CreateLecturerPayload {
  email: string;
  name: string;
  password: string;
}

export interface CreateLecturerResponse {
  id: string;
  email: string;
  name?: string | null;
  role: "LECTURER";
  createdAt: string;
  message: string;
}

export interface UpdateStudentPayload {
  email?: string;
  studentCode?: string;
  name?: string;
  className?: string;
  dateOfBirth?: string;
  isLocked?: boolean;
  lockedReason?: string;
}

export interface LecturerListItem {
  id: string;
  email: string;
  name?: string | null;
  role: "LECTURER";
  isLocked: boolean;
  createdAt: string;
  permissions: LecturerPermission[];
  isLecturerAdmin: boolean;
}

export interface PaginatedLecturers {
  data: LecturerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  requesterPermissions: LecturerPermission[];
  assignablePermissions: LecturerPermission[];
  canGrantAdminPackage: boolean;
}

export interface LecturerPermissionDetail {
  id: string;
  email: string;
  name?: string | null;
  role: "LECTURER";
  isLocked: boolean;
  createdAt: string;
  permissions: LecturerPermission[];
  isLecturerAdmin: boolean;
  assignments: Array<{
    permission: LecturerPermission;
    grantedAt: string;
    grantedByUser?: {
      id: string;
      email: string;
      name?: string | null;
    } | null;
  }>;
  requesterPermissions: LecturerPermission[];
  assignablePermissions: LecturerPermission[];
  canGrantAdminPackage: boolean;
}

export interface UpdateLecturerPermissionsPayload {
  permissions: LecturerPermission[];
}

export const usersApi = {
  getUsers: (params: { page?: number; limit?: number; role?: string; search?: string; className?: string; isLocked?: boolean }) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.role) query.append("role", params.role);
    if (params.search) query.append("search", params.search);
    if (params.className) query.append("className", params.className);
    if (params.isLocked !== undefined) query.append("isLocked", params.isLocked.toString());

    return httpClient.get<PaginatedUsers>(`/api/users?${query.toString()}`);
  },

  getUser: (id: string) => httpClient.get<Partial<User>>(`/api/users/${id}`),

  createUser: (data: CreateStudentPayload) =>
    httpClient.post<CreateStudentResponse>("/api/users", data),

  createLecturer: (data: CreateLecturerPayload) =>
    httpClient.post<CreateLecturerResponse>("/api/users/lecturers", data),

  updateUser: (id: string, data: UpdateStudentPayload) =>
    httpClient.patch<Partial<User>>(`/api/users/${id}`, data),

  deleteUser: (id: string) => httpClient.delete<{ message: string }>(`/api/users/${id}`),

  getLecturers: (params?: { page?: number; limit?: number; search?: string; sortOrder?: "asc" | "desc" }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.sortOrder) query.append("sortOrder", params.sortOrder);

    return httpClient.get<PaginatedLecturers>(`/api/users/lecturers?${query.toString()}`);
  },

  getLecturerPermissions: (id: string) =>
    httpClient.get<LecturerPermissionDetail>(`/api/users/lecturers/${id}/permissions`),

  updateLecturerPermissions: (id: string, data: UpdateLecturerPermissionsPayload) =>
    httpClient.put<{
      lecturerId: string;
      permissions: LecturerPermission[];
      isLecturerAdmin: boolean;
      updatedBy: string;
      canGrantAdminPackage: boolean;
    }>(`/api/users/lecturers/${id}/permissions`, data),

  // File should be mapped toFormData in the UI layer and passed via fetch directly because httpClient forces JSON
  // We'll export a generic URL that the UI can hit using native fetch + tokens
  getImportUrl: () => `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/users/import`,

  getExportUrl: (params?: {
    search?: string;
    className?: string;
    isLocked?: boolean;
    sortOrder?: "asc" | "desc";
    format?: "csv" | "xlsx";
  }) => {
    const query = new URLSearchParams();
    query.append("role", "STUDENT");
    if (params?.search) query.append("search", params.search);
    if (params?.className) query.append("className", params.className);
    if (params?.isLocked !== undefined) query.append("isLocked", params.isLocked.toString());
    if (params?.sortOrder) query.append("sortOrder", params.sortOrder);
    if (params?.format) query.append("format", params.format);

    const base = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/users/export`;
    return `${base}?${query.toString()}`;
  },
};
