import { IndianRupee, Receipt, TrendingUp, TrendingDown } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

interface FinanceSectionProps {
  showFinanceSection: boolean;
  showAccountsFeeCard: boolean;
  monthLabel: string;
  feeCollected: number;
  expensesThisMonth: number;
  netThisMonth: number;
}

export function FinanceSection({
  showFinanceSection,
  showAccountsFeeCard,
  monthLabel,
  feeCollected,
  expensesThisMonth,
  netThisMonth,
}: FinanceSectionProps) {
  if (!showFinanceSection && !showAccountsFeeCard) return null;

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <IndianRupee className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:text-sm">
          Finance
        </h2>
        <span className="ml-auto text-[10px] text-muted-foreground sm:text-xs">{monthLabel}</span>
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 sm:gap-4">
        {/* Fee Collected */}
        <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover col-span-2 sm:col-span-1 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Fee Collected</p>
              <p className="text-2xl font-bold tracking-tight text-green-600 sm:text-3xl">{fmt(feeCollected)}</p>
            </div>
            <div className="rounded-xl bg-green-500/10 p-2 sm:p-2.5">
              <IndianRupee className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">Collections this month</p>
        </div>

        {showFinanceSection && (
          <>
            {/* Expenses */}
            <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Expenses</p>
                  <p className="text-2xl font-bold tracking-tight sm:text-3xl">{fmt(expensesThisMonth)}</p>
                </div>
                <div className="rounded-xl bg-orange-500/10 p-2 sm:p-2.5">
                  <Receipt className="h-4 w-4 text-orange-600 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">Approved expenses this month</p>
            </div>

            {/* Net */}
            <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Net Income</p>
                  <p className={`text-2xl font-bold tracking-tight sm:text-3xl ${netThisMonth >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {fmt(netThisMonth)}
                  </p>
                </div>
                <div className={`rounded-xl p-2 sm:p-2.5 ${netThisMonth >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
                  {netThisMonth >= 0
                    ? <TrendingUp className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
                    : <TrendingDown className="h-4 w-4 text-destructive sm:h-5 sm:w-5" />
                  }
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">Collections − expenses</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
