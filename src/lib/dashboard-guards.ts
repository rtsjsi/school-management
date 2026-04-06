import { redirect } from "next/navigation";
import type { AuthUser } from "@/lib/auth";
import { isAccounts, isPayrollRole } from "@/lib/auth";

/** Block accounts/payroll from academic & student modules (not their remit). */
export function guardAcademicAndStudentModules(user: AuthUser): void {
  if (isAccounts(user)) redirect("/welcome");
  if (isPayrollRole(user)) redirect("/welcome");
}
