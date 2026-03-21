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
  const periodText = data.periodLabel ?? `Q${data.quarter}`;
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

  doc.setFontSize(8.8);
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

  doc.text("Receipt :", leftX, y);
  doc.setFont("helvetica", "bold");
  doc.text(String(data.receiptNumber), valueX, y);
  doc.setFont("helvetica", "normal");
  doc.text("Date :", rightX - 24, y);
  doc.text(dateStr || "—", rightX, y, { align: "right" });
  y += lh;

  doc.text("Name :", leftX, y);
  const nameLines = doc.splitTextToSize(data.studentName || "—", contentW - 19);
  nameLines.forEach((line: string, i: number) => {
    doc.text(line, valueX, y + i * lh);
  });
  y += Math.max(lh * nameLines.length, lh);

  doc.text("Std. :", leftX, y);
  doc.text(String(data.standard ?? "—"), valueX, y);
  doc.text("Div. :", leftX + 29, y);
  doc.text(String(data.division ?? "—"), leftX + 42, y);
  doc.text("Temp. GR No. :", rightX - 36, y);
  doc.text(String(data.grNo ?? "—"), rightX, y, { align: "right" });
  y += lh;

  doc.text("Period :", leftX, y);
  doc.text(periodText, valueX, y);
  y += lh;

  doc.text("Year :", leftX, y);
  doc.text(data.academicYear || "—", valueX, y);
  y += lh;

  doc.text("Pay Type :", leftX, y);
  doc.text(
    data.paymentMode ? data.paymentMode.charAt(0).toUpperCase() + data.paymentMode.slice(1) : "—",
    valueX,
    y
  );
  y += blockGap + 0.6;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.4);
  doc.text("Fees", w / 2, y, { align: "center" });
  y += lh;

  const feeLabel = getFeeTypeLabel(data.feeType);
  const amountText = `Rs. ${Number(data.amount || 0).toFixed(2)}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.9);
  doc.text(`${feeLabel || "Fee"} :`, leftX, y);
  doc.text(amountText.replace("Rs. ", ""), rightX, y, { align: "right" });
  y += lh + 0.3;

  // Empty body area line like printed receipt block
  doc.line(margin, y, w - margin, y);
  y += blockGap;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.3);
  doc.text("Total Fee :", leftX, y);
  doc.text(amountText.replace("Rs. ", ""), rightX, y, { align: "right" });
  doc.setFontSize(7.9);
  y += lh;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  y = drawWrappedText(doc, amountWords, leftX, y, contentW, smallLh);
  y += 0.8;

  doc.line(margin, y, w - margin, y);
  y += blockGap - 0.4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Note :", leftX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.text("Received By,", rightX, y, { align: "right" });
  y += lh;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  const notes = data.policyNotes && data.policyNotes.length > 0
    ? data.policyNotes
    : [
        "(1) Fees will not be given back in any case.",
        "(2) Fees are not transferable.",
        "(3) Cheque payment subject to realization of cheque.",
      ];
  notes.slice(0, 3).forEach((line) => {
    y = drawWrappedText(doc, line, leftX, y, contentW - 36, 3.4);
  });

  // Right-side receiver name and signature/stamp box
  const receiverBlockTop = y - 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text(data.receivedBy ?? "", rightX, receiverBlockTop, { align: "right" });
  const boxW = 26;
  const boxH = 16;
  const boxX = rightX - boxW;
  const boxY = receiverBlockTop + 3;
  doc.setLineWidth(0.2);
  doc.rect(boxX, boxY, boxW, boxH);

  if (data.outstandingAfterPayment != null) {
    const outY = Math.min(h - 4, boxY + boxH + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.text(`Outstanding: Rs. ${data.outstandingAfterPayment.toFixed(2)}`, leftX, outY);
  }

  if (data.paymentMode === "cheque" || data.paymentMode === "online") {
    const refY = Math.min(h - 1.2, (data.outstandingAfterPayment != null ? receiverBlockTop + boxH + 7 : receiverBlockTop + boxH + 3));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.6);
    if (data.paymentMode === "cheque") {
      doc.text(`Cheque: ${data.chequeNumber ?? "—"}  Bank: ${data.chequeBank ?? "—"}`, leftX, refY);
    } else {
      doc.text(`Txn ID: ${data.onlineTransactionId ?? "—"}`, leftX, refY);
    }
  }

  return doc.output("blob");
}
