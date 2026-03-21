import { jsPDF } from "jspdf";
import { getFeeTypeLabel } from "@/lib/utils";
import { drawWrappedText } from "./pdf-utils";

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
  standard?: string;
  division?: string;
  rollNumber?: number | string;
  grNo?: string;
  outstandingAfterPayment?: number;
}

export function generateReceiptPDF(data: ReceiptData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a6", orientation: "portrait" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 7;
  const contentW = w - margin * 2;
  const lh = 4.4;
  const smallLh = 3.8;
  const blockGap = 3;
  let y = 10;

  const schoolName = data.schoolName ?? "SCHOOL NAME";
  const schoolAddress = data.schoolAddress ?? "Address";
  const dateStr = data.collectedAt
    ? new Date(data.collectedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
  const stdDiv = [data.standard, data.division].filter(Boolean).join(" / ") || "—";
  const periodText = data.periodLabel ?? `Q${data.quarter} (${data.academicYear})`;
  const amountWords = data.amountInWords ?? amountInWords(data.amount);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName.toUpperCase(), w / 2, y, { align: "center" });
  y += lh + 0.6;

  doc.setFontSize(7.4);
  doc.setFont("helvetica", "normal");
  const addrLines = doc.splitTextToSize(schoolAddress.toUpperCase(), contentW);
  addrLines.forEach((line: string) => {
    doc.text(line, w / 2, y, { align: "center" });
    y += smallLh;
  });
  y += 1.2;

  doc.setFontSize(9.2);
  doc.setFont("helvetica", "bold");
  doc.text("FEE RECEIPT", w / 2, y, { align: "center" });
  y += lh;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(margin, y, w - margin, y);
  y += blockGap;

  const leftX = margin;
  const rightX = w - margin;
  const valueX = margin + 19;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.9);

  doc.text("Receipt:", leftX, y);
  doc.setFont("helvetica", "bold");
  doc.text(String(data.receiptNumber), valueX, y);
  doc.setFont("helvetica", "normal");
  doc.text("Date:", rightX - 24, y);
  doc.text(dateStr || "—", rightX, y, { align: "right" });
  y += lh;

  doc.text("Name:", leftX, y);
  const nameLines = doc.splitTextToSize(data.studentName || "—", contentW - 19);
  nameLines.forEach((line: string, i: number) => {
    doc.text(line, valueX, y + i * lh);
  });
  y += Math.max(lh * nameLines.length, lh);

  doc.text("Class:", leftX, y);
  doc.text(stdDiv, valueX, y);
  doc.text("GR:", rightX - 24, y);
  doc.text(String(data.grNo ?? "—"), rightX, y, { align: "right" });
  y += lh;

  doc.text("Period:", leftX, y);
  doc.text(periodText, valueX, y);
  y += lh;

  doc.text("Mode:", leftX, y);
  doc.text(
    data.paymentMode ? data.paymentMode.charAt(0).toUpperCase() + data.paymentMode.slice(1) : "—",
    valueX,
    y
  );
  y += blockGap + 0.6;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  const feeLabel = getFeeTypeLabel(data.feeType);
  const amountText = `Rs. ${Number(data.amount || 0).toFixed(2)}`;
  doc.setFont("helvetica", "normal");
  doc.text("Fee Head:", leftX, y);
  doc.text(feeLabel || "Fee", valueX, y);
  y += lh;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.3);
  doc.text("Total Paid:", leftX, y);
  doc.text(amountText, rightX, y, { align: "right" });
  doc.setFontSize(7.9);
  y += lh + 0.6;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  if (data.outstandingAfterPayment != null) {
    doc.setFont("helvetica", "normal");
    doc.text("Outstanding:", leftX, y);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${data.outstandingAfterPayment.toFixed(2)}`, rightX, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += lh;
  }

  doc.setFontSize(7.2);
  y = drawWrappedText(doc, `In Words: ${amountWords}`, leftX, y, contentW, smallLh);
  y += 1.2;

  if (data.paymentMode === "cheque") {
    doc.setFont("helvetica", "normal");
    doc.text(`Cheque No: ${data.chequeNumber ?? "—"}`, leftX, y);
    y += smallLh;
    doc.text(`Bank: ${data.chequeBank ?? "—"}`, leftX, y);
    y += smallLh;
  }
  if (data.paymentMode === "online") {
    doc.setFont("helvetica", "normal");
    doc.text(`Txn ID: ${data.onlineTransactionId ?? "—"}`, leftX, y);
    y += smallLh;
  }

  y += 0.6;
  doc.line(margin, y, w - margin, y);
  y += 2.4;

  const notes = data.policyNotes && data.policyNotes.length > 0
    ? data.policyNotes
    : [
        "(1) Fees will not be given back in any case.",
        "(2) Fees are not transferable.",
        "(3) Cheque payment subject to realization of cheque.",
      ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  const maxNotesToShow = 2;
  notes.slice(0, maxNotesToShow).forEach((line) => {
    if (y < h - 14) {
      y = drawWrappedText(doc, line, leftX, y, contentW, 3.2);
    }
  });

  const signY = h - 10;
  doc.setFontSize(7.4);
  doc.setFont("helvetica", "bold");
  doc.text("Received By", rightX, signY - 2.2, { align: "right" });
  doc.setLineWidth(0.2);
  doc.line(rightX - 28, signY, rightX, signY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(data.receivedBy ?? "", rightX, signY + 3.2, { align: "right" });

  return doc.output("blob");
}
