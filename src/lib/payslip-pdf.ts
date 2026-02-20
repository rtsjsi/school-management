import { jsPDF } from "jspdf";
import { amountInWords } from "./receipt-pdf";

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

function maskAccountNumber(acc: string): string {
  if (!acc || acc.length < 8) return acc;
  const start = acc.slice(0, 4);
  const end = acc.slice(-4);
  return `${start}****${end}`;
}

export function generatePayslipPDF(data: PayslipData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  const schoolName = data.schoolName ?? process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "SCHOOL NAME";
  const schoolAddress = data.schoolAddress ?? "Address";

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName.toUpperCase(), w / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(schoolAddress.toUpperCase(), w / 2, y, { align: "center" });
  y += 14;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PAY SLIP", w / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`For the month of ${formatMonthYear(data.month_year)}`, w / 2, y, {
    align: "center",
  });
  y += 14;

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, w - margin, y);
  y += 10;

  const col1 = margin;
  const col2Label = w / 2 - 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text("Employee:", col1, y);
  doc.text(data.full_name, col1 + 35, y);
  doc.text("Employee ID:", col2Label - 40, y);
  doc.text(data.employee_code, col2Label, y);
  y += 7;

  doc.text("Designation:", col1, y);
  doc.text(data.designation ?? "—", col1 + 35, y);
  doc.text("Department:", col2Label - 40, y);
  doc.text(data.department ?? "—", col2Label, y);
  y += 7;

  doc.text("Joining Date:", col1, y);
  const joinDate = data.joining_date
    ? new Date(data.joining_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
  doc.text(joinDate, col1 + 35, y);
  doc.text("Working Days:", col2Label - 40, y);
  doc.text(`${data.present_days} / ${data.working_days}`, col2Label, y);
  y += 14;

  doc.line(margin, y, w - margin, y);
  y += 10;

  const grossTotal = data.gross_amount + (data.allowances ?? 0);

  // Earnings
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EARNINGS", col1, y);
  doc.text("AMOUNT (₹)", w - margin - 5, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Basic Salary", col1 + 5, y);
  doc.text(data.gross_amount.toFixed(2), w - margin - 5, y, { align: "right" });
  y += 7;

  if ((data.allowances ?? 0) > 0) {
    doc.text("Allowances (HRA, Transport, etc.)", col1 + 5, y);
    doc.text((data.allowances ?? 0).toFixed(2), w - margin - 5, y, {
      align: "right",
    });
    y += 7;
  }

  doc.line(margin, y, w - margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Gross Earnings", col1 + 5, y);
  doc.text(grossTotal.toFixed(2), w - margin - 5, y, { align: "right" });
  y += 12;

  // Deductions
  doc.setFont("helvetica", "bold");
  doc.text("DEDUCTIONS", col1, y);
  doc.text("AMOUNT (₹)", w - margin - 5, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  if (data.deduction_items && data.deduction_items.length > 0) {
    data.deduction_items.forEach((item) => {
      doc.text(item.label, col1 + 5, y);
      doc.text(item.amount.toFixed(2), w - margin - 5, y, { align: "right" });
      y += 6;
    });
  } else if (data.deductions > 0) {
    doc.text("Total Deductions", col1 + 5, y);
    doc.text(data.deductions.toFixed(2), w - margin - 5, y, { align: "right" });
    y += 6;
  } else {
    doc.text("—", col1 + 5, y);
    doc.text("0.00", w - margin - 5, y, { align: "right" });
    y += 6;
  }

  doc.line(margin, y, w - margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Total Deductions", col1 + 5, y);
  doc.text(data.deductions.toFixed(2), w - margin - 5, y, { align: "right" });
  y += 14;

  // Net Pay
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.text("NET PAY", col1 + 5, y);
  doc.text(`₹ ${data.net_amount.toFixed(2)}`, w - margin - 5, y, { align: "right" });
  y += 10;

  const amountWords = amountInWords(data.net_amount);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Amount in Words: ${amountWords}`, margin + 5, y);
  y += 12;

  if (data.bank) {
    doc.setFontSize(10);
    doc.text(
      `Bank: ${data.bank.bank_name} | A/c: ${maskAccountNumber(data.bank.account_number)} | IFSC: ${data.bank.ifsc_code}`,
      margin + 5,
      y
    );
    y += 8;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
    w / 2,
    y,
    { align: "center" }
  );

  return doc.output("blob");
}
