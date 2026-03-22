export type UserRole = "principal" | "admin" | "teacher" | "auditor" | "clerk" | "payroll";

export const ROLES: Record<UserRole, string> = {
  principal: "Principal",
  admin: "Admin",
  teacher: "Teacher",
  auditor: "Auditor",
  clerk: "Clerk",
  payroll: "Payroll",
};
