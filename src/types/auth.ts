export type UserRole = "super_admin" | "admin" | "teacher";

export const ROLES: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  teacher: "Teacher",
};
