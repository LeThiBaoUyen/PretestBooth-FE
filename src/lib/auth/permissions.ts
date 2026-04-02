import type { LecturerPermission, User } from "../api/types";

export const ALL_LECTURER_PERMISSIONS: LecturerPermission[] = [
  "CREATE_EXAM",
  "REVIEW_QUESTION",
  "MANAGE_QUESTION_BANK",
  "MANAGE_STUDENTS",
  "MANAGE_BOOTHS",
  "LECTURER_ADMIN",
];

export const LOWER_LECTURER_PERMISSIONS: LecturerPermission[] = ALL_LECTURER_PERMISSIONS.filter(
  (permission) => permission !== "LECTURER_ADMIN",
);

export function getEffectivePermissions(user?: User | null): LecturerPermission[] {
  if (!user) return [];
  if (user.role === "ADMIN") return [...ALL_LECTURER_PERMISSIONS];
  if (user.role !== "LECTURER") return [];
  return user.permissions || [];
}

export function hasPermission(
  user: User | null | undefined,
  permission: LecturerPermission,
): boolean {
  return getEffectivePermissions(user).includes(permission);
}

export function hasAnyPermission(
  user: User | null | undefined,
  permissions: LecturerPermission[],
): boolean {
  const effective = getEffectivePermissions(user);
  return permissions.some((permission) => effective.includes(permission));
}

export function canAccessAdminArea(user: User | null | undefined): boolean {
  return hasAnyPermission(user, [
    "MANAGE_STUDENTS",
    "MANAGE_BOOTHS",
    "LECTURER_ADMIN",
  ]);
}
