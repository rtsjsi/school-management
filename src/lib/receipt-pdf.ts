import { jsPDF } from "jspdf";
import { getFeeTypeLabel } from "@/lib/utils";

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
  /** School name for header */
  schoolName?: string;
  /** School address */
  schoolAddress?: string;
  /** Student grade (e.g. "1") */
  grade?: string;
  /** Section (e.g. "A") */
  section?: string;
  /** Roll number */
  rollNumber?: number | string;
  /** GR No. / Student ID */
  grNo?: string;
  /** Outstanding amount after this payment (optional) */
  outstandingAfterPayment?: number;
}

export function generateReceiptPDF(data: ReceiptData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  const schoolName = data.schoolName ?? "SCHOOL NAME";
  const schoolAddress = data.schoolAddress ?? "Address";

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName.toUpperCase(), w / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(schoolAddress.toUpperCase(), w / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Fee Receipt", w / 2, y, { align: "center" });
  y += 15;

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, w - margin, y);
  y += 10;

  const col1 = margin;
  const col2 = w - margin;
  const dateStr = data.collectedAt ? new Date(data.collectedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Receipt No.:", col1, y);
  doc.text(data.receiptNumber, col1 + 45, y);
  doc.text("Date:", col2 - 50, y);
  doc.text(dateStr, col2 - 25, y);
  y += 7;

  doc.text("Name:", col1, y);
  doc.text(data.studentName, col1 + 45, y);
  const stdDiv = [data.grade, data.section].filter(Boolean).join(" ") || "—";
  doc.text("Std:", col2 - 50, y);
  doc.text(stdDiv, col2 - 25, y);
  y += 7;

  doc.text("Div.:", col1, y);
  doc.text(data.section ?? "—", col1 + 45, y);
  doc.text("GR No.:", col2 - 50, y);
  doc.text(data.grNo ?? "—", col2 - 25, y);
  y += 7;

  doc.text("Period:", col1, y);
  doc.text(data.periodLabel ?? `Q${data.quarter} (${data.academicYear})`, col1 + 45, y);
  doc.text("Year:", col2 - 50, y);
  doc.text(data.academicYear, col2 - 25, y);
  y += 7;

  doc.text("Pay Type:", col1, y);
  doc.text(data.paymentMode.charAt(0).toUpperCase() + data.paymentMode.slice(1), col1 + 45, y);
  y += 12;

  doc.line(margin, y, w - margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Fees", w / 2, y, { align: "center" });
  y += 8;

  const feeLabel = getFeeTypeLabel(data.feeType);
  doc.setFont("helvetica", "normal");
  doc.text(`${feeLabel} :`, margin + 5, y);
  doc.text(data.amount.toFixed(2), w - margin - 5, y, { align: "right" });
  y += 10;

  doc.line(margin, y, w - margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Total Fee:", margin + 5, y);
  doc.text(data.amount.toFixed(2), w - margin - 5, y, { align: "right" });
  y += 8;

  if (data.outstandingAfterPayment != null && data.outstandingAfterPayment > 0) {
    doc.setFont("helvetica", "normal");
    doc.text("Outstanding after this payment:", margin + 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(`₹${data.outstandingAfterPayment.toFixed(2)}`, w - margin - 5, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 8;
  }

  const amountWords = data.amountInWords ?? amountInWords(data.amount);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(amountWords, margin + 5, y);
  y += 15;

  doc.line(margin, y, w - margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Note:", margin, y);
  y += 6;

  const notes = data.policyNotes && data.policyNotes.length > 0
    ? data.policyNotes
    : [
        "(1) Fees will not be given back in any case.",
        "(2) Fees are not transferable.",
        "(3) Cheque payment subject to realization of cheque.",
      ];

  doc.setFont("helvetica", "normal");
  notes.forEach((line) => {
    doc.text(line, margin + 5, y);
    y += 5;
  });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Received By", w - margin - 45, y);
  y += 2;
  doc.line(w - margin - 50, y, w - margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.text(data.receivedBy ?? "", w - margin - 45, y);

  return doc.output("blob");
}
