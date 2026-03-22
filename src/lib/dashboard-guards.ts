import { redirect } from "next/navigation";
import type { AuthUser } from "@/lib/auth";
import { isClerk, isPayrollRole } from "@/lib/auth";

/** Block clerk/payroll from academic & student modules (not their remit). */
export function guardAcademicAndStudentModules(user: AuthUser): void {
  if (isClerk(user)) redirect("/dashboard/fees");
  if (isPayrollRole(user)) redirect("/dashboard/payroll");
}
