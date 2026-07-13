"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Briefcase,
  GraduationCap,
  Landmark,
  MapPin,
  Hash,
} from "lucide-react";
import type { StaffTableEmployee } from "@/components/EmployeesTable";
import { computeEmployeeCompleteness, completenessBadgeClassNames } from "@/lib/master-data-completeness";
import { EMPLOYEE_ROLES, EMPLOYEE_TYPES } from "@/lib/lov";
import { formatTimeShort } from "@/lib/employee-shift";
import { EmployeePayrollInfo } from "./EmployeePayrollInfo";

interface EmployeeViewDialogProps {
  employee: StaffTableEmployee;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function fmtDate(val?: string | null): string {
  if (!val) return "—";
  const d = new Date(val + "T12:00:00");
  if (isNaN(d.getTime())) return val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function cap(str?: string | null): string {
  if (!str) return "—";
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value || value === "—") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-3 gap-y-0.5 py-1.5">
        <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
        <span className="text-xs text-muted-foreground/40">—</span>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-3 gap-y-0.5 py-1.5">
      <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm text-foreground min-w-0 break-words ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className={`rounded-md p-1.5 ${accent ?? "bg-primary/10"}`}>
          <Icon className={`h-3.5 w-3.5 ${accent ? "text-white" : "text-primary"}`} />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="pl-1">{children}</div>
    </div>
  );
}

export function EmployeeViewDialog({ employee, open, onOpenChange }: EmployeeViewDialogProps) {
  const completeness = computeEmployeeCompleteness(employee as unknown as Record<string, unknown>);
  const roleLabel = EMPLOYEE_ROLES.includes(employee.role as (typeof EMPLOYEE_ROLES)[number])
    ? cap(employee.role)
    : cap(employee.role);
  const typeLabel = EMPLOYEE_TYPES.includes(employee.employee_type as (typeof EMPLOYEE_TYPES)[number])
    ? cap(employee.employee_type)
    : cap(employee.employee_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0 [&>button]:text-white/80 [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-4">
        <div className="relative shrink-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-5 py-6 sm:px-7 sm:py-7 pr-14 text-white">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="sr-only">Employee Profile — {employee.full_name}</DialogTitle>
            <DialogDescription className="sr-only">Detailed profile for {employee.full_name}</DialogDescription>
          </DialogHeader>
          <h2 className="text-lg sm:text-xl font-bold text-white leading-snug break-words">
            {employee.full_name}
          </h2>
          <p className="text-white/70 text-sm mt-1">Employee profile</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-white/15 text-white border-white/20 hover:bg-white/20 gap-1">
              <Hash className="h-3 w-3 shrink-0" />
              ID {employee.employee_id ?? "—"}
            </Badge>
            <Badge
              variant="secondary"
              className={
                employee.status === "active"
                  ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/30"
                  : "bg-white/15 text-white border-white/20"
              }
            >
              {cap(employee.status ?? "active")}
            </Badge>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${completenessBadgeClassNames(completeness.percent)}`}
            >
              {completeness.percent}% complete
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 space-y-6">
          <Section icon={User} title="Personal Information">
            <div className="space-y-0">
              <InfoRow label="Employee ID" value={employee.employee_id ?? "—"} mono />
              <InfoRow label="Full Name" value={employee.full_name} />
              <InfoRow label="Email" value={employee.email ?? "—"} />
              <InfoRow label="Phone" value={employee.phone_number ?? "—"} />
              <InfoRow label="Aadhaar" value={employee.aadhaar ?? "—"} mono />
              <InfoRow label="PAN" value={employee.pan ?? "—"} mono />
            </div>
            {employee.address && (
              <div className="mt-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm leading-relaxed">{employee.address}</p>
                </div>
              </div>
            )}
          </Section>

          <hr className="border-border/40" />

          <Section icon={Briefcase} title="Employment Details" accent="bg-blue-500">
            <div className="space-y-0">
              <InfoRow label="Role" value={roleLabel} />
              <InfoRow label="Employee Type" value={typeLabel} />
              <InfoRow label="Joining Date" value={fmtDate(employee.joining_date)} />
              <InfoRow label="Shift Start Time" value={formatTimeShort(employee.shift_start_time) || "—"} />
              <InfoRow label="Shift End Time" value={formatTimeShort(employee.shift_end_time) || "—"} />
              <InfoRow
                label="Monthly Salary"
                value={employee.monthly_salary != null ? `₹${employee.monthly_salary.toLocaleString("en-IN")}` : "—"}
              />
              <InfoRow label="Biometric Enroll No" value={employee.biometric_enroll_no ?? "—"} mono />
            </div>
          </Section>

          <hr className="border-border/40" />

          <Section icon={GraduationCap} title="Qualification">
            <div className="space-y-0">
              <InfoRow label="Degree" value={employee.degree ?? "—"} />
              <InfoRow label="Institution" value={employee.institution ?? "—"} />
              <InfoRow
                label="Year Passed"
                value={employee.year_passed != null ? String(employee.year_passed) : "—"}
              />
            </div>
          </Section>

          {(employee.bank_name || employee.account_number) && (
            <>
              <hr className="border-border/40" />
              <Section icon={Landmark} title="Bank Account (Salary)" accent="bg-violet-500">
                <div className="space-y-0">
                  <InfoRow label="Account Holder" value={employee.account_holder_name ?? "—"} />
                  <InfoRow label="Bank Name" value={employee.bank_name ?? "—"} />
                  <InfoRow label="Account Number" value={employee.account_number ?? "—"} mono />
                  <InfoRow label="IFSC Code" value={employee.ifsc_code ?? "—"} mono />
                </div>
              </Section>
            </>
          )}

          <hr className="border-border/40" />
          <EmployeePayrollInfo employeeId={employee.id} />
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
