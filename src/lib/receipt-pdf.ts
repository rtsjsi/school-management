import { jsPDF } from "jspdf";
import { getFeeTypeLabel } from "@/lib/utils";
import { PDF_LAYOUT, drawWrappedText } from "./pdf-utils";

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const whole = Math.floor(n);
  if (whole === 0) return "Zero";
  function upTo99(x: number): string {
    if (x < 20) return ONES[x] ?? "";
    const t = Math.floor(x / 10);
    const o = x % 10;
    return (TENS[t] + (o ? " " + ONES[o] : "")).trim();
  }
  function upTo999(x: number): string {
    if (x < 100) return upTo99(x);
    const h = Math.floor(x / 100);
    const rest = x % 100;
    return (ONES[h] + " Hundred" + (rest ? " " + upTo99(rest) : "")).trim();
  }
  const crores = Math.floor(whole / 1e7);
  const lakhs = Math.floor((whole % 1e7) / 1e5);
  const thousands = Math.floor((whole % 1e5) / 1000);
  const hundreds = whole % 1000;
  const parts: string[] = [];
  if (crores) parts.push(upTo999(crores) + " Crore");
  if (lakhs) parts.push(upTo999(lakhs) + " Lakh");
  if (thousands) parts.push(upTo999(thousands) + " Thousand");
  if (hundreds) parts.push(upTo999(hundreds));
  return parts.join(" ").trim() || "Zero";
}

export function amountInWords(amount: number): string {
  const whole = Math.floor(amount);
  const words = numberToWords(whole);
  return words.toUpperCase() + " RUPEES ONLY";
}

export interface ReceiptData {
  receiptNumber: string;
  studentName: string;
  amount: number;
  paymentMode: string;
  quarter: number;
  academicYear: string;
  feeType: string;
  collectedAt: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeDate?: string;
  onlineTransactionId?: string;
  onlineTransactionRef?: string;
  concessionAmount?: number;
  periodLabel?: string;
  amountInWords?: string;
  receivedBy?: string;
  policyNotes?: string[];
  schoolName?: string;
  schoolAddress?: string;
  grade?: string;
  section?: string;
  rollNumber?: number | string;
  grNo?: string;
  outstandingAfterPayment?: number;
}

export function generateReceiptPDF(data: ReceiptData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = PDF_LAYOUT.margin;
  const lh = PDF_LAYOUT.lineHeight;
  const blockGap = PDF_LAYOUT.blockGap;
  let y = 22;

  const schoolName = data.schoolName ?? "SCHOOL NAME";
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
  doc.text("Fee Receipt", w / 2, y, { align: "center" });
  y += lh + blockGap;

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, w - margin, y);
  y += blockGap;

  const colLeft = margin;
  const colRight = w / 2 + 5;
  const labelW = PDF_LAYOUT.labelWidth;
  const dateStr = data.collectedAt ? new Date(data.collectedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
  const stdDiv = [data.grade, data.section].filter(Boolean).join(" ") || "—";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_LAYOUT.fontSizeBody);

  doc.text("Receipt No.:", colLeft, y);
  doc.text(String(data.receiptNumber), colLeft + labelW, y);
  doc.text("Date:", colRight, y);
  doc.text(dateStr, colRight + labelW, y);
  y += lh;

  doc.text("Name:", colLeft, y);
  const nameLines = doc.splitTextToSize(data.studentName, PDF_LAYOUT.valueMaxWidth);
  nameLines.forEach((line: string, i: number) => {
    doc.text(line, colLeft + labelW, y + i * lh);
  });
  doc.text("Std:", colRight, y);
  doc.text(stdDiv, colRight + labelW, y);
  y += Math.max(lh * nameLines.length, lh);

  doc.text("Div.:", colLeft, y);
  doc.text(data.section ?? "—", colLeft + labelW, y);
  doc.text("GR No.:", colRight, y);
  doc.text(String(data.grNo ?? "—"), colRight + labelW, y);
  y += lh;

  doc.text("Period:", colLeft, y);
  doc.text(data.periodLabel ?? `Q${data.quarter} (${data.academicYear})`, colLeft + labelW, y);
  doc.text("Year:", colRight, y);
  doc.text(data.academicYear, colRight + labelW, y);
  y += lh;

  doc.text("Pay Type:", colLeft, y);
  doc.text(data.paymentMode.charAt(0).toUpperCase() + data.paymentMode.slice(1), colLeft + labelW, y);
  y += blockGap;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  doc.setFont("helvetica", "bold");
  doc.text("Fees", w / 2, y, { align: "center" });
  y += lh + 2;

  const feeLabel = getFeeTypeLabel(data.feeType);
  doc.setFont("helvetica", "normal");
  doc.text(`${feeLabel}:`, margin, y);
  doc.text(data.amount.toFixed(2), w - margin, y, { align: "right" });
  y += lh + 2;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  doc.setFont("helvetica", "bold");
  doc.text("Total Fee:", margin, y);
  doc.text(data.amount.toFixed(2), w - margin, y, { align: "right" });
  y += lh + 2;

  if (data.outstandingAfterPayment != null) {
    doc.setFont("helvetica", "normal");
    doc.text("Outstanding after this payment:", margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(`₹${data.outstandingAfterPayment.toFixed(2)}`, w - margin, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += lh + 2;
  }

  const amountWords = data.amountInWords ?? amountInWords(data.amount);
  doc.setFontSize(PDF_LAYOUT.fontSizeSmall);
  y = drawWrappedText(doc, amountWords, margin, y, PDF_LAYOUT.contentWidth, PDF_LAYOUT.lineHeightSmall);
  y += blockGap;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_LAYOUT.fontSizeBody);
  doc.text("Note:", margin, y);
  y += lh;

  const notes = data.policyNotes && data.policyNotes.length > 0
    ? data.policyNotes
    : [
        "(1) Fees will not be given back in any case.",
        "(2) Fees are not transferable.",
        "(3) Cheque payment subject to realization of cheque.",
      ];

  doc.setFont("helvetica", "normal");
  notes.forEach((line) => {
    y = drawWrappedText(doc, line, margin + 3, y, PDF_LAYOUT.contentWidth - 3, PDF_LAYOUT.lineHeightSmall);
  });

  y += blockGap;
  doc.setFont("helvetica", "bold");
  doc.text("Received By", w - margin - 50, y);
  y += 4;
  doc.line(w - margin - 55, y, w - margin, y);
  y += lh;
  doc.setFont("helvetica", "normal");
  doc.text(data.receivedBy ?? "", w - margin - 50, y);

  return doc.output("blob");
}
