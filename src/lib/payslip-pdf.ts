import { jsPDF } from "jspdf";
import { amountInWords } from "./receipt-pdf";
import { PDF_LAYOUT, drawWrappedText } from "./pdf-utils";

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
  const margin = PDF_LAYOUT.margin;
  const lh = PDF_LAYOUT.lineHeight;
  const blockGap = PDF_LAYOUT.blockGap;
  let y = 22;

  const schoolName = data.schoolName ?? process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "SCHOOL NAME";
  const schoolAddress = data.schoolAddress ?? "Address";

  doc.setFontSize(PDF_LAYOUT.fontSizeTitle);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName.toUpperCase(), w / 2, y, { align: "center" });
  y += lh + 2;

  doc.setFontSize(PDF_LAYOUT.fontSizeSubtitle);
  doc.setFont("helvetica", "normal");
  const addrLines = doc.splitTextToSize(schoolAddress.toUpperCase(), PDF_LAYOUT.contentWidth);
  addrLines.forEach((line: string) => {
    doc.text(line, w / 2, y, { align: "center" });
    y += lh;
  });
  y += blockGap;

  doc.setFontSize(PDF_LAYOUT.fontSizeHeading);
  doc.setFont("helvetica", "bold");
  doc.text("PAY SLIP", w / 2, y, { align: "center" });
  y += lh + 2;

  doc.setFontSize(PDF_LAYOUT.fontSizeBody);
  doc.setFont("helvetica", "normal");
  doc.text(`For the month of ${formatMonthYear(data.month_year)}`, w / 2, y, { align: "center" });
  y += lh + blockGap;

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, w - margin, y);
  y += blockGap;

  const colLeft = margin;
  const colRight = w / 2 + 5;
  const labelW = PDF_LAYOUT.labelWidth;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_LAYOUT.fontSizeBody);

  doc.text("Employee:", colLeft, y);
  const nameLines = doc.splitTextToSize(data.full_name, PDF_LAYOUT.valueMaxWidth);
  nameLines.forEach((line: string, i: number) => {
    doc.text(line, colLeft + labelW, y + i * lh);
  });
  doc.text("Employee ID:", colRight, y);
  doc.text(data.employee_code, colRight + labelW, y);
  y += Math.max(lh * nameLines.length, lh);

  doc.text("Designation:", colLeft, y);
  doc.text(data.designation ?? "—", colLeft + labelW, y);
  doc.text("Department:", colRight, y);
  doc.text(data.department ?? "—", colRight + labelW, y);
  y += lh;

  doc.text("Joining Date:", colLeft, y);
  const joinDate = data.joining_date
    ? new Date(data.joining_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
  doc.text(joinDate, colLeft + labelW, y);
  doc.text("Working Days:", colRight, y);
  doc.text(`${data.present_days} / ${data.working_days}`, colRight + labelW, y);
  y += lh + blockGap;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  const grossTotal = data.gross_amount + (data.allowances ?? 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_LAYOUT.fontSizeBody);
  doc.text("EARNINGS", colLeft, y);
  doc.text("AMOUNT (₹)", w - margin, y, { align: "right" });
  y += lh + 2;

  doc.setFont("helvetica", "normal");
  doc.text("Basic Salary", colLeft + 5, y);
  doc.text(data.gross_amount.toFixed(2), w - margin, y, { align: "right" });
  y += lh;

  if ((data.allowances ?? 0) > 0) {
    doc.text("Allowances (HRA, Transport, etc.)", colLeft + 5, y);
    doc.text((data.allowances ?? 0).toFixed(2), w - margin, y, { align: "right" });
    y += lh;
  }

  doc.line(margin, y, w - margin, y);
  y += lh;
  doc.setFont("helvetica", "bold");
  doc.text("Gross Earnings", colLeft + 5, y);
  doc.text(grossTotal.toFixed(2), w - margin, y, { align: "right" });
  y += lh + blockGap;

  doc.setFont("helvetica", "bold");
  doc.text("DEDUCTIONS", colLeft, y);
  doc.text("AMOUNT (₹)", w - margin, y, { align: "right" });
  y += lh + 2;

  doc.setFont("helvetica", "normal");
  if (data.deduction_items && data.deduction_items.length > 0) {
    data.deduction_items.forEach((item) => {
      doc.text(item.label, colLeft + 5, y);
      doc.text(item.amount.toFixed(2), w - margin, y, { align: "right" });
      y += lh;
    });
  } else if (data.deductions > 0) {
    doc.text("Total Deductions", colLeft + 5, y);
    doc.text(data.deductions.toFixed(2), w - margin, y, { align: "right" });
    y += lh;
  } else {
    doc.text("—", colLeft + 5, y);
    doc.text("0.00", w - margin, y, { align: "right" });
    y += lh;
  }

  doc.line(margin, y, w - margin, y);
  y += lh;
  doc.setFont("helvetica", "bold");
  doc.text("Total Deductions", colLeft + 5, y);
  doc.text(data.deductions.toFixed(2), w - margin, y, { align: "right" });
  y += lh + blockGap;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += blockGap;

  doc.setFontSize(PDF_LAYOUT.fontSizeHeading);
  doc.text("NET PAY", colLeft + 5, y);
  doc.text(`₹ ${data.net_amount.toFixed(2)}`, w - margin, y, { align: "right" });
  y += lh + 2;

  const amountWords = amountInWords(data.net_amount);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_LAYOUT.fontSizeSmall);
  y = drawWrappedText(doc, `Amount in Words: ${amountWords}`, margin + 5, y, PDF_LAYOUT.contentWidth, PDF_LAYOUT.lineHeightSmall);
  y += blockGap;

  if (data.bank) {
    doc.setFontSize(PDF_LAYOUT.fontSizeBody);
    const bankStr = `Bank: ${data.bank.bank_name} | A/c: ${maskAccountNumber(data.bank.account_number)} | IFSC: ${data.bank.ifsc_code}`;
    y = drawWrappedText(doc, bankStr, margin + 5, y, PDF_LAYOUT.contentWidth);
    y += lh;
  }

  doc.setFontSize(PDF_LAYOUT.fontSizeSmall);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
    w / 2,
    y,
    { align: "center" }
  );

  return doc.output("blob");
}
