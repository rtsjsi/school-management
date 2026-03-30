import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Display label for fee types. Defaults to a title-cased version of the raw code. */
export const FEE_TYPE_LABELS: Record<string, string> = {
  education_fee: "Education Fee",
  transport_fee: "Transport Fee",
  laboratory_fee: "Laboratory Fee",
  sports_fee: "Sports Fee",
  development_fee: "Development Fee",
  misc_fee: "Miscellaneous Fee",
  // Backward compatibility for older rows
  tuition: "Education Fee",
};

export function getFeeTypeLabel(feeType: string): string {
  return FEE_TYPE_LABELS[feeType] ?? feeType.charAt(0).toUpperCase() + feeType.slice(1).replace(/_/g, " ");
}

/**
 * Fee collection / receipt dates shown as DD/MM/YYYY (not tied to the browser or OS locale).
 * Accepts YYYY-MM-DD or an ISO datetime string.
 */
export function formatFeeCollectionDisplayDate(
  value: string | null | undefined,
  emptyDisplay: string = "—"
): string {
  if (value == null || String(value).trim() === "") return emptyDisplay;
  const ymd = String(value).trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return String(value).trim();
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}
