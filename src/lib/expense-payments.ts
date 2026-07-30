/** Shared helpers for expense bills + payments. */

export type ExpensePaymentStatus = "unpaid" | "partial" | "paid";

export function normalizeExpenseText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function computeExpensePaymentTotals(billAmount: number, paidAmount: number) {
  const bill = Number(billAmount) || 0;
  const paid = Math.max(0, Number(paidAmount) || 0);
  const balance = Math.max(0, Math.round((bill - paid) * 100) / 100);
  let status: ExpensePaymentStatus = "unpaid";
  if (paid <= 0) status = "unpaid";
  else if (balance <= 0.001) status = "paid";
  else status = "partial";
  return {
    bill,
    paid: Math.round(paid * 100) / 100,
    balance,
    status,
  };
}

export function expensePaymentStatusLabel(status: ExpensePaymentStatus): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    default:
      return "Unpaid";
  }
}
