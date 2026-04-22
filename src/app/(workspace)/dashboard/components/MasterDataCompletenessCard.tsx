import type { LucideIcon } from "lucide-react";
import type { AggregatedCompleteness } from "@/lib/master-data-completeness";

export function MasterDataCompletenessCard({
  title,
  Icon,
  summary,
  footer,
}: {
  title: string;
  Icon: LucideIcon;
  summary: AggregatedCompleteness;
  footer: string;
}) {
  if (summary.total === 0) return null;
  const pct = summary.averagePercent;
  const colorText =
    pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-destructive";
  const colorIconWrap =
    pct >= 80 ? "bg-green-500/10" : pct >= 50 ? "bg-amber-500/10" : "bg-destructive/10";
  const colorIcon = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-destructive";
  const colorBar = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">{title}</p>
          <p className={`text-2xl font-bold tracking-tight sm:text-3xl ${colorText}`}>{pct}%</p>
        </div>
        <div className={`rounded-xl p-2 sm:p-2.5 ${colorIconWrap}`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${colorIcon}`} />
        </div>
      </div>
      <div className="mt-2 space-y-1.5 sm:mt-3">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden sm:h-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorBar}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground sm:text-xs">{footer}</p>
      </div>
    </div>
  );
}
