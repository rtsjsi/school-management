import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Display label for fee types. Defaults to a title-cased version of the raw code. */
export const FEE_TYPE_LABELS: Record<string, string> = {
  education_fee: "Education Fee",
  // Backward compatibility for older rows
  tuition: "Education Fee",
};

export function getFeeTypeLabel(feeType: string): string {
  return FEE_TYPE_LABELS[feeType] ?? feeType.charAt(0).toUpperCase() + feeType.slice(1).replace(/_/g, " ");
}
