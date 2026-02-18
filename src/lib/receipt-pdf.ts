import { jsPDF } from "jspdf";

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
  return words + " Rupees Only";
}

interface ReceiptData {
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
  /** Concession/discount given */
  concessionAmount?: number;
  /** e.g. Dec - Feb */
  periodLabel?: string;
  /** Amount in words (e.g. "Nine Thousand Forty-Five Rupees Only") */
  amountInWords?: string;
  /** Name of staff who received payment */
  receivedBy?: string;
  /** Policy notes for receipt footer */
  policyNotes?: string[];
}

export function generateReceiptPDF(data: ReceiptData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SCHOOL FEE RECEIPT", w / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Official Receipt", w / 2, y, { align: "center" });
  y += 15;

  doc.setDrawColor(0, 0, 0);
  doc.line(15, y, w - 15, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Receipt No:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.receiptNumber, 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Date:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.collectedAt, 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Student:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.studentName, 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Fee Type:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.feeType.charAt(0).toUpperCase() + data.feeType.slice(1), 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Period:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.periodLabel ?? `Q${data.quarter} (${data.academicYear})`, 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Amount:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Rs. ${data.amount.toLocaleString()}`, 80, y);
  y += 10;

  if (data.concessionAmount != null && data.concessionAmount > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Concession:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(`Rs. ${data.concessionAmount.toLocaleString()}`, 80, y);
    y += 10;
  }

  const amountWords = data.amountInWords ?? amountInWords(data.amount);
  doc.setFont("helvetica", "bold");
  doc.text("In words:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(amountWords, 20, y + 5, { maxWidth: w - 40 });
  y += 14;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Mode:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.paymentMode.charAt(0).toUpperCase() + data.paymentMode.slice(1), 80, y);
  y += 10;

  if (data.paymentMode === "cheque" && (data.chequeNumber || data.chequeBank || data.chequeDate)) {
    doc.setFont("helvetica", "bold");
    doc.text("Cheque Details:", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const chequeParts = [data.chequeNumber && `No: ${data.chequeNumber}`, data.chequeBank && `Bank: ${data.chequeBank}`, data.chequeDate && `Date: ${data.chequeDate}`].filter(Boolean);
    doc.text(chequeParts.join(", "), 20, y);
    y += 10;
  }

  if (data.paymentMode === "online" && (data.onlineTransactionId || data.onlineTransactionRef)) {
    doc.setFont("helvetica", "bold");
    doc.text("Transaction Details:", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const txnParts = [data.onlineTransactionId && `Txn ID: ${data.onlineTransactionId}`, data.onlineTransactionRef && `Ref: ${data.onlineTransactionRef}`].filter(Boolean);
    doc.text(txnParts.join(", "), 20, y);
    y += 10;
  }

  y += 10;
  if (data.receivedBy) {
    doc.setFont("helvetica", "bold");
    doc.text("Received by:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.receivedBy, 80, y);
    y += 10;
  }

  y += 8;
  doc.line(15, y, w - 15, y);
  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  const defaultNote = "This is a computer-generated receipt. Please retain for your records.";
  const notes = data.policyNotes && data.policyNotes.length > 0 ? data.policyNotes : [defaultNote];
  notes.forEach((line) => {
    doc.text(line, w / 2, y, { align: "center" });
    y += 5;
  });

  return doc.output("blob");
}
