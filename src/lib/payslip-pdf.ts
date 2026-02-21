import { jsPDF } from "jspdf";
import { amountInWords } from "./receipt-pdf";
import { PDF_LAYOUT } from "./pdf-utils";

export interface PayslipData {
  employee_code: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  joining_date: string | null;
  month_year: string;
  working_days: number;
  present_days: number;
  gross_amount: number;
  allowances?: number;
  allowance_items?: { type: string; amount: number; label: string }[];
  deduction_items?: { type: string; amount: number; label: string }[];
  deductions: number;
  net_amount: number;
  bank?: {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
  };
  schoolName?: string;
  schoolAddress?: string;
}

function formatMonthYear(monthYear: string): string {
  const [y, m] = monthYear.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const month = monthNames[parseInt(m, 10) - 1] ?? m;
  return `${month} ${y}`;
}

export function generatePayslipPDF(data: PayslipData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = PDF_LAYOUT.margin;
  const lh = PDF_LAYOUT.lineHeight;
  const blockGap = PDF_LAYOUT.blockGap;
  let y = 18;

  const schoolName = data.schoolName ?? "SCHOOL NAME";
  const schoolAddress = data.schoolAddress ?? "Address";

  // Title: Payslip
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Payslip", w / 2, y, { align: "center" });
  y += lh + 4;

  // Company address (centered)
  doc.setFontSize(PDF_LAYOUT.fontSizeSubtitle);
  doc.setFont("helvetica", "normal");
  const addrLines = doc.splitTextToSize(schoolName.toUpperCase(), PDF_LAYOUT.contentWidth);
  addrLines.forEach((line: string) => {
    doc.text(line, w / 2, y, { align: "center" });
    y += lh;
  });
  const addr2Lines = doc.splitTextToSize(schoolAddress, PDF_LAYOUT.contentWidth);
  addr2Lines.forEach((line: string) => {
    doc.text(line, w / 2, y, { align: "center" });
    y += lh;
  });
  y += blockGap;

  // Employee details (label: value)
  const labelW = 42;
  const joinDate = data.joining_date
    ? new Date(data.joining_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  doc.text("Date of Joining", margin, y);
  doc.text(`: ${joinDate}`, margin + labelW, y);
  y += lh;

  doc.text("Pay Period", margin, y);
  doc.text(`: ${formatMonthYear(data.month_year)}`, margin + labelW, y);
  y += lh;

  doc.text("Worked Days", margin, y);
  doc.text(`: ${data.present_days}`, margin + labelW, y);
  y += lh;

  doc.text("Employee Name", margin, y);
  doc.text(`: ${data.full_name}`, margin + labelW, y);
  y += lh;

  doc.text("Designation", margin, y);
  doc.text(`: ${data.designation ?? "—"}`, margin + labelW, y);
  y += lh;

  doc.text("Department", margin, y);
  doc.text(`: ${data.department ?? "—"}`, margin + labelW, y);
  y += blockGap;

  // 4-column grid: Earnings | Amount | Deductions | Amount
  const colW = (w - 2 * margin) / 4;
  const c1 = margin;
  const c2 = margin + colW;
  const c3 = margin + colW * 2;
  const c4 = margin + colW * 3;

  const rowH = 7;
  const grey = [0.8, 0.8, 0.8] as [number, number, number];

  // Header row (grey)
  doc.setFillColor(...grey);
  doc.rect(c1, y, colW * 2, rowH, "F");
  doc.rect(c3, y, colW * 2, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Earnings", c1 + colW / 2, y + rowH / 2 + 2, { align: "center" });
  doc.text("Amount", c2 + colW / 2, y + rowH / 2 + 2, { align: "center" });
  doc.text("Deductions", c3 + colW / 2, y + rowH / 2 + 2, { align: "center" });
  doc.text("Amount", c4 + colW / 2, y + rowH / 2 + 2, { align: "center" });
  y += rowH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const allowanceItems = data.allowance_items ?? [];
  const deductionItems = data.deduction_items ?? [];

  const earningsRows: { label: string; amount: number }[] = [
    { label: "Basic Pay", amount: data.gross_amount },
    ...allowanceItems.map((a) => ({ label: a.label, amount: a.amount })),
  ];
  const deductionRows: { label: string; amount: number }[] = deductionItems.map((d) => ({
    label: d.label,
    amount: d.amount,
  }));

  const grossTotal = data.gross_amount + (data.allowances ?? 0);
  const maxDataRows = Math.max(earningsRows.length, deductionRows.length);

  for (let i = 0; i < maxDataRows; i++) {
    const earn = earningsRows[i];
    const ded = deductionRows[i];

    if (earn) {
      doc.text(earn.label, c1 + 3, y + 4);
      doc.text(earn.amount.toFixed(2), c2 + colW - 3, y + 4, { align: "right" });
    }
    if (ded) {
      doc.text(ded.label, c3 + 3, y + 4);
      doc.text(ded.amount.toFixed(2), c4 + colW - 3, y + 4, { align: "right" });
    }

    doc.setDrawColor(0, 0, 0);
    doc.line(c1, y, c1 + colW * 4, y);
    y += rowH;
  }

  // Total Earnings | Total Deductions row
  doc.setFont("helvetica", "bold");
  doc.text("Total Earnings", c1 + 3, y + 4);
  doc.text(grossTotal.toFixed(2), c2 + colW - 3, y + 4, { align: "right" });
  doc.text("Total Deductions", c3 + 3, y + 4);
  doc.text(data.deductions.toFixed(2), c4 + colW - 3, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.line(c1, y, c1 + colW * 4, y);
  y += rowH;

  // Net Pay row (empty earnings cols, Net Pay in deductions cols)
  doc.setFont("helvetica", "bold");
  doc.text("Net Pay", c3 + colW - 3, y + 4, { align: "right" });
  doc.text(data.net_amount.toFixed(2), c4 + colW - 3, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.line(c1, y, c1 + colW * 4, y);
  y += rowH;

  y += blockGap;

  // Net pay amount (centered, prominent)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.net_amount.toFixed(2), w / 2, y, { align: "center" });
  y += lh;

  const amountWords = amountInWords(data.net_amount);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_LAYOUT.fontSizeSmall);
  doc.text(amountWords, w / 2, y, { align: "center" });
  y += blockGap;

  // Signature line
  doc.setFontSize(PDF_LAYOUT.fontSizeBody);
  doc.text("Employer Signature", margin + 30, y);
  doc.text("Employee Signature", w - margin - 50, y);
  y += 6;
  doc.line(margin, y, margin + 55, y);
  doc.line(w - margin - 55, y, w - margin, y);
  y += blockGap;

  // Bank details (if any)
  if (data.bank) {
    doc.setFontSize(PDF_LAYOUT.fontSizeSmall);
    const masked = data.bank.account_number.length >= 8
      ? `${data.bank.account_number.slice(0, 4)}****${data.bank.account_number.slice(-4)}`
      : data.bank.account_number;
    doc.text(
      `Bank: ${data.bank.bank_name} | A/c: ${masked} | IFSC: ${data.bank.ifsc_code}`,
      w / 2,
      y,
      { align: "center" }
    );
    y += lh;
  }

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(PDF_LAYOUT.fontSizeSmall);
  doc.text("This is system generated payslip", w / 2, y, { align: "center" });

  return doc.output("blob");
}
