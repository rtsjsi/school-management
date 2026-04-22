import { Users, BadgeCheck } from "lucide-react";
import { MasterDataCompletenessCard } from "./MasterDataCompletenessCard";
import type { AggregatedCompleteness } from "@/lib/master-data-completeness";

function fmtNum(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

interface PayrollSectionProps {
  showPayrollCard: boolean;
  showAcademicSection: boolean;
  employeesCount: number;
  staffCompleteness: AggregatedCompleteness;
}

export function PayrollSection({
  showPayrollCard,
  showAcademicSection,
  employeesCount,
  staffCompleteness,
}: PayrollSectionProps) {
  if (!showPayrollCard || showAcademicSection) return null;

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:text-sm">Payroll</h2>
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 sm:gap-4">
        <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover col-span-2 sm:col-span-1 sm:p-5">
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
        <MasterDataCompletenessCard
          title="Staff records"
          Icon={BadgeCheck}
          summary={staffCompleteness}
          footer={`${fmtNum(staffCompleteness.fullyComplete)} of ${fmtNum(staffCompleteness.total)} staff fully complete`}
        />
      </div>
    </section>
  );
}
