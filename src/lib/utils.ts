import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Display label for fee types (e.g. tuition -> Education Fees) */
export const FEE_TYPE_LABELS: Record<string, string> = {
  tuition: "Education Fees",
};

export function getFeeTypeLabel(feeType: string): string {
  return FEE_TYPE_LABELS[feeType] ?? feeType.charAt(0).toUpperCase() + feeType.slice(1).replace(/_/g, " ");
}
