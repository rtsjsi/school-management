export type UserRole = "principal" | "admin" | "teacher";

export const ROLES: Record<UserRole, string> = {
  principal: "Principal",
  admin: "Admin",
  teacher: "Teacher",
};
