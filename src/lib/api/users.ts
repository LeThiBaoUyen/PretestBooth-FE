import { httpClient } from "./httpClient";
import type { LecturerPermission, User } from "./types";

const MAX_LECTURER_ROLE_PAGE_LIMIT = 100;

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
  name?: string;
  role: "LECTURER";
  isLocked?: boolean;
  lockedAt?: string | null;
  lockedReason?: string | null;
  createdAt?: string;
  permissions: LecturerPermission[];
  individualPermissions?: LecturerPermission[];
  rolePermissions?: LecturerPermission[];
  lecturerRole?: LecturerRoleSummaryItem | null;
  isLecturerAdmin: boolean;
}

export interface LecturerRoleSummaryItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  priority: number;
  isActive: boolean;
  isSystemLocked: boolean;
}

export interface LecturerRoleItem extends LecturerRoleSummaryItem {
  permissions: LecturerPermission[];
  memberCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedLecturers {
  data: LecturerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  requesterPermissions?: LecturerPermission[];
  assignablePermissions?: LecturerPermission[];
  assignableRoles?: LecturerRoleItem[];
  canGrantAdminPackage?: boolean;
}

export interface PaginatedLecturerRoles {
  data: LecturerRoleItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  requesterPermissions?: LecturerPermission[];
  canManageRoleCatalog?: boolean;
}

export interface CreateLecturerPayload {
  email: string;
  name: string;
  password: string;
}

export interface UpdateLecturerPayload {
  email?: string;
  name?: string;
  password?: string;
  isLocked?: boolean;
  lockedReason?: string;
}

export interface UpdateLecturerPermissionsPayload {
  permissions: LecturerPermission[];
}

export interface AssignLecturerRolePayload {
  roleId: string | null;
}

export interface QueryLecturerRolesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortOrder?: "asc" | "desc";
}

export interface CreateLecturerRolePayload {
  code: string;
  name: string;
  description?: string;
  priority: number;
  isActive?: boolean;
  isSystemLocked?: boolean;
  permissions: LecturerPermission[];
}

export interface UpdateLecturerRolePayload {
  code?: string;
  name?: string;
  description?: string | null;
  priority?: number;
  isActive?: boolean;
  permissions?: LecturerPermission[];
}

export const usersApi = {
  getUsers: (params: { page?: number; limit?: number; role?: string; search?: string; className?: string; cohort?: number; isLocked?: boolean }) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.role) query.append("role", params.role);
    if (params.search) query.append("search", params.search);
    if (params.className) query.append("className", params.className);
    if (params.cohort !== undefined) query.append("cohort", params.cohort.toString());
    if (params.isLocked !== undefined) query.append("isLocked", params.isLocked.toString());

    return httpClient.get<PaginatedUsers>(`/api/users?${query.toString()}`);
  },

  getLecturers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    if (params?.sortOrder) query.append("sortOrder", params.sortOrder);

    return httpClient.get<PaginatedLecturers>(`/api/users/lecturers?${query.toString()}`);
  },

  createLecturer: (data: CreateLecturerPayload) =>
    httpClient.post<{ id: string; email: string; name: string; role: "LECTURER"; createdAt: string; message: string }>(
      "/api/users/lecturers",
      data,
    ),

  updateLecturer: (id: string, data: UpdateLecturerPayload) =>
    httpClient.patch<{
      id: string;
      email: string;
      name: string | null;
      isLocked: boolean;
      lockedAt: string | null;
      lockedReason: string | null;
      createdAt: string;
      message: string;
    }>(`/api/users/lecturers/${id}`, data),

  updateLecturerPermissions: (id: string, data: UpdateLecturerPermissionsPayload) =>
    httpClient.put<{
      lecturerId: string;
      permissions: LecturerPermission[];
      individualPermissions: LecturerPermission[];
      rolePermissions: LecturerPermission[];
      lecturerRole: LecturerRoleSummaryItem | null;
      isLecturerAdmin: boolean;
      updatedBy: string;
      canGrantAdminPackage: boolean;
    }>(`/api/users/lecturers/${id}/permissions`, data),

  assignLecturerRole: (id: string, data: AssignLecturerRolePayload) =>
    httpClient.put<{
      lecturerId: string;
      lecturerRole: LecturerRoleSummaryItem | null;
      permissions: LecturerPermission[];
      individualPermissions: LecturerPermission[];
      rolePermissions: LecturerPermission[];
      isLecturerAdmin: boolean;
      updatedBy: string;
    }>(`/api/users/lecturers/${id}/role`, data),

  getLecturerRoles: (params?: QueryLecturerRolesParams) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) {
      query.append(
        "limit",
        String(Math.max(1, Math.min(params.limit, MAX_LECTURER_ROLE_PAGE_LIMIT))),
      );
    }
    if (params?.search) query.append("search", params.search);
    if (params?.isActive !== undefined) query.append("isActive", String(params.isActive));
    if (params?.sortOrder) query.append("sortOrder", params.sortOrder);
    const queryString = query.toString();

    return httpClient.get<PaginatedLecturerRoles>(
      `/api/users/lecturer-roles${queryString ? `?${queryString}` : ""}`,
    );
  },

  getLecturerRole: (id: string) =>
    httpClient.get<LecturerRoleItem & {
      requesterPermissions?: LecturerPermission[];
      canManageRoleCatalog?: boolean;
    }>(`/api/users/lecturer-roles/${id}`),

  createLecturerRole: (data: CreateLecturerRolePayload) =>
    httpClient.post<LecturerRoleItem & { message: string }>("/api/users/lecturer-roles", data),

  updateLecturerRole: (id: string, data: UpdateLecturerRolePayload) =>
    httpClient.patch<LecturerRoleItem & { message: string }>(`/api/users/lecturer-roles/${id}`, data),

  deleteLecturerRole: (id: string) =>
    httpClient.delete<{ message: string; roleId: string }>(`/api/users/lecturer-roles/${id}`),

  getUser: (id: string) => httpClient.get<Partial<User>>(`/api/users/${id}`),

  createUser: (data: CreateStudentPayload) =>
    httpClient.post<{ message: string; id: string }>("/api/users", data),

  updateUser: (id: string, data: UpdateStudentPayload) =>
    httpClient.patch<Partial<User>>(`/api/users/${id}`, data),

  deleteUser: (id: string) => httpClient.delete<{ message: string }>(`/api/users/${id}`),

  // File should be mapped toFormData in the UI layer and passed via fetch directly because httpClient forces JSON
  // We'll export a generic URL that the UI can hit using native fetch + tokens
  getImportUrl: () => `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/users/import`,

  getExportUrl: (params?: {
    search?: string;
    className?: string;
    cohort?: number;
    isLocked?: boolean;
    sortOrder?: "asc" | "desc";
    format?: "csv" | "xlsx";
  }) => {
    const query = new URLSearchParams();
    query.append("role", "STUDENT");
    if (params?.search) query.append("search", params.search);
    if (params?.className) query.append("className", params.className);
    if (params?.cohort !== undefined) query.append("cohort", params.cohort.toString());
    if (params?.isLocked !== undefined) query.append("isLocked", params.isLocked.toString());
    if (params?.sortOrder) query.append("sortOrder", params.sortOrder);
    if (params?.format) query.append("format", params.format);

    const base = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/users/export`;
    return `${base}?${query.toString()}`;
  },
};
