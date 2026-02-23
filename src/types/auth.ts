export type UserRole = "principal" | "admin" | "teacher" | "auditor";

export const ROLES: Record<UserRole, string> = {
  principal: "Principal",
  admin: "Admin",
  teacher: "Teacher",
  auditor: "Auditor",
};
