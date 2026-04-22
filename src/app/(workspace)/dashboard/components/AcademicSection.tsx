import { BookOpen, GraduationCap, UserPlus, Users, ClipboardCheck, LayoutGrid, BookMarked, BadgeCheck } from "lucide-react";
import { MasterDataCompletenessCard } from "./MasterDataCompletenessCard";
import type { AggregatedCompleteness } from "@/lib/master-data-completeness";
import type { AuthUser } from "@/lib/auth";
import { canAccessPayroll } from "@/lib/auth";

function fmtNum(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

interface AcademicSectionProps {
  showAcademicSection: boolean;
  activeYearName: string | null;
  activeStudentsCount: number;
  studentsCount: number;
  rteStudentsCount: number;
  newAdmissionsCount: number;
  showFinanceSection: boolean;
  showPayrollCard: boolean;
  employeesCount: number;
  dataCompleteness: AggregatedCompleteness;
  standardsCompleteness: AggregatedCompleteness;
  subjectsCompleteness: AggregatedCompleteness;
  staffCompleteness: AggregatedCompleteness;
  user: AuthUser;
}

export function AcademicSection({
  showAcademicSection,
  activeYearName,
  activeStudentsCount,
  studentsCount,
  rteStudentsCount,
  newAdmissionsCount,
  showFinanceSection,
  showPayrollCard,
  employeesCount,
  dataCompleteness,
  standardsCompleteness,
  subjectsCompleteness,
  staffCompleteness,
  user,
}: AcademicSectionProps) {
  if (!showAcademicSection) return null;

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:text-sm">Academics</h2>
        {activeYearName && (
          <span className="ml-auto text-[10px] text-muted-foreground sm:text-xs">{activeYearName}</span>
        )}
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 sm:gap-4">
        {/* Active Students — hero card */}
        <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover col-span-2 sm:col-span-1 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Active Students</p>
              <p className="text-2xl font-bold tracking-tight sm:text-3xl">{fmtNum(activeStudentsCount)}</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-2 sm:p-2.5">
              <GraduationCap className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground sm:mt-3 sm:gap-3 sm:text-xs">
            <span>{fmtNum(studentsCount)} total enrolled</span>
            {rteStudentsCount > 0 && (
              <>
                <span className="text-border">|</span>
                <span>{fmtNum(rteStudentsCount)} RTE quota</span>
              </>
            )}
          </div>
        </div>

        {/* New Admissions */}
        <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">New Admissions</p>
              <p className="text-2xl font-bold tracking-tight sm:text-3xl">{fmtNum(newAdmissionsCount)}</p>
            </div>
            <div className="rounded-xl bg-green-500/10 p-2 sm:p-2.5">
              <UserPlus className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">
            {activeYearName ?? "Set active academic year"}
          </p>
        </div>

        {/* Employees — if visible */}
        {(showFinanceSection || showPayrollCard) && (
          <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Total Employees</p>
                <p className="text-2xl font-bold tracking-tight sm:text-3xl">{fmtNum(employeesCount)}</p>
              </div>
              <div className="rounded-xl bg-violet-500/10 p-2 sm:p-2.5">
                <Users className="h-4 w-4 text-violet-600 sm:h-5 sm:w-5" />
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">Staff & teachers</p>
          </div>
        )}

        {/* Data Completeness */}
        {dataCompleteness.total > 0 && (
          <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Student records</p>
                <p className={`text-2xl font-bold tracking-tight sm:text-3xl ${
                  dataCompleteness.averagePercent >= 80
                    ? "text-green-600"
                    : dataCompleteness.averagePercent >= 50
                      ? "text-amber-600"
                      : "text-destructive"
                }`}>
                  {dataCompleteness.averagePercent}%
                </p>
              </div>
              <div className={`rounded-xl p-2 sm:p-2.5 ${
                dataCompleteness.averagePercent >= 80
                  ? "bg-green-500/10"
                  : dataCompleteness.averagePercent >= 50
                    ? "bg-amber-500/10"
                    : "bg-destructive/10"
              }`}>
                <ClipboardCheck className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  dataCompleteness.averagePercent >= 80
                    ? "text-green-600"
                    : dataCompleteness.averagePercent >= 50
                      ? "text-amber-600"
                      : "text-destructive"
                }`} />
              </div>
            </div>
            <div className="mt-2 space-y-1.5 sm:mt-3">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden sm:h-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    dataCompleteness.averagePercent >= 80
                      ? "bg-green-500"
                      : dataCompleteness.averagePercent >= 50
                        ? "bg-amber-500"
                        : "bg-destructive"
                  }`}
                  style={{ width: `${Math.min(dataCompleteness.averagePercent, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                {fmtNum(dataCompleteness.fullyComplete)} of {fmtNum(dataCompleteness.total)} students fully complete
              </p>
            </div>
          </div>
        )}

        <MasterDataCompletenessCard
          title="Standards setup"
          Icon={LayoutGrid}
          summary={standardsCompleteness}
          footer={`${fmtNum(standardsCompleteness.fullyComplete)} of ${fmtNum(standardsCompleteness.total)} standards fully complete`}
        />
        <MasterDataCompletenessCard
          title="Subjects setup"
          Icon={BookMarked}
          summary={subjectsCompleteness}
          footer={`${fmtNum(subjectsCompleteness.fullyComplete)} of ${fmtNum(subjectsCompleteness.total)} subjects fully complete`}
        />
        {canAccessPayroll(user) && (
          <MasterDataCompletenessCard
            title="Staff records"
            Icon={BadgeCheck}
            summary={staffCompleteness}
            footer={`${fmtNum(staffCompleteness.fullyComplete)} of ${fmtNum(staffCompleteness.total)} staff fully complete`}
          />
        )}
      </div>
    </section>
  );
}
