export type UserRole = "principal" | "admin" | "teacher" | "auditor" | "accounts" | "payroll";

export const ROLES: Record<UserRole, string> = {
  principal: "Principal",
  admin: "Admin",
  teacher: "Teacher",
  auditor: "Auditor",
  accounts: "Accounts",
  payroll: "Payroll",
};
