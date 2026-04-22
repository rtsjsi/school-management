import { Wallet } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

interface OutstandingFeesSectionProps {
  showOutstandingSection: boolean;
  activeYearName: string | null;
  outstandingCurrentYear: number;
  totalFeesCurrentYear: number;
  totalPaidCurrentYear: number;
  collectionPct: number;
  outstandingByQuarter: Record<number, number>;
  collectionsByQuarter: Record<number, number>;
}

export function OutstandingFeesSection({
  showOutstandingSection,
  activeYearName,
  outstandingCurrentYear,
  totalFeesCurrentYear,
  totalPaidCurrentYear,
  collectionPct,
  outstandingByQuarter,
  collectionsByQuarter,
}: OutstandingFeesSectionProps) {
  if (!showOutstandingSection || !activeYearName) return null;

  const quarterLabels = ["Apr–Jun", "Jul–Sep", "Oct–Dec", "Jan–Mar"];

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-destructive" />
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:text-sm">
          Outstanding Fees
        </h2>
        <span className="ml-auto text-[10px] text-muted-foreground sm:text-xs">{activeYearName}</span>
      </div>

      {/* Total outstanding — featured card with progress */}
      <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0 sm:gap-4">
            <div className="rounded-xl bg-destructive/10 p-2.5 shrink-0 sm:p-3">
              <Wallet className="h-5 w-5 text-destructive sm:h-6 sm:w-6" />
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Total Outstanding</p>
              <p className="text-2xl font-bold tracking-tight text-destructive sm:text-3xl">{fmt(outstandingCurrentYear)}</p>
            </div>
          </div>
          {totalFeesCurrentYear > 0 && (
            <div className="flex flex-col gap-1.5 sm:items-end sm:min-w-[180px]">
              <div className="flex items-center justify-between gap-4 text-[10px] text-muted-foreground w-full sm:justify-end sm:text-xs">
                <span>Collected: {fmt(totalPaidCurrentYear)}</span>
                <span className="font-semibold text-foreground">{collectionPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden sm:h-2">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(collectionPct, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                of {fmt(totalFeesCurrentYear)} total fees
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quarter breakdown — outstanding */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {([1, 2, 3, 4] as const).map((q) => {
          const qOutstanding = outstandingByQuarter[q];
          return (
            <div
              key={q}
              className="rounded-card border border-border bg-gradient-to-b from-card to-muted/20 p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-4"
            >
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Q{q} <span className="text-muted-foreground/70">({quarterLabels[q - 1]})</span></p>
              <p className={`text-base font-bold tracking-tight mt-1 sm:text-lg ${qOutstanding > 0 ? "text-destructive" : "text-green-600"}`}>
                {fmt(qOutstanding)}
              </p>
              {qOutstanding === 0 && (
                <p className="text-[10px] text-green-600 mt-0.5">All clear</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Total collection for active year */}
      <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0 sm:gap-4">
            <div className="rounded-xl bg-green-500/10 p-2.5 shrink-0 sm:p-3">
              <Wallet className="h-5 w-5 text-green-600 sm:h-6 sm:w-6" />
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Total Collection</p>
              <p className="text-2xl font-bold tracking-tight text-green-600 sm:text-3xl">{fmt(totalPaidCurrentYear)}</p>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground sm:text-xs sm:text-right">
            Current academic year
          </div>
        </div>
      </div>

      {/* Quarter-wise total collection */}
      <div className="space-y-2 pt-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
          Total Collection by Quarter
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {([1, 2, 3, 4] as const).map((q) => {
            const qCollection = collectionsByQuarter[q];
            return (
              <div
                key={`collection-${q}`}
                className="rounded-card border border-border bg-gradient-to-b from-card to-muted/20 p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-4"
              >
                <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                  Q{q} <span className="text-muted-foreground/70">({quarterLabels[q - 1]})</span>
                </p>
                <p className="text-base font-bold tracking-tight mt-1 text-green-600 sm:text-lg">
                  {fmt(qCollection)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
