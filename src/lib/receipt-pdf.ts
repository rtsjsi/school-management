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
  schoolLogoUrl?: string;
  schoolLogoDataUrl?: string;
  standard?: string;
  division?: string;
  rollNumber?: number | string;
  grNo?: string;
  outstandingAfterPayment?: number;
}

const QUARTER_MONTHS: Record<number, string> = {
  1: "Jan-Mar",
  2: "Apr-Jun",
  3: "Jul-Sep",
  4: "Oct-Dec",
};

function quarterLabel(quarter: number): string {
  const months = QUARTER_MONTHS[quarter] ?? "—";
  return `Q${quarter} (${months})`;
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateReceiptPDF(data: ReceiptData): Promise<Blob> {
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
  const periodText = data.periodLabel ?? quarterLabel(data.quarter);
  const amountWords = data.amountInWords ?? amountInWords(data.amount);
  const logoDataUrl = data.schoolLogoDataUrl ?? (data.schoolLogoUrl ? await urlToDataUrl(data.schoolLogoUrl) : null);

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin, y - 2, 12, 12);
    } catch {
      // Ignore logo rendering failures and continue with text-only header.
    }
  }

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
  const drawField = (label: string, value: string, yy: number) => {
    doc.setFont("helvetica", "normal");
    doc.text(`${label} :`, leftX, yy);
    doc.text(value || "—", valueX, yy);
  };

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
  doc.text("Roll No. :", rightX - 36, y);
  doc.text(String(data.rollNumber ?? "—"), rightX, y, { align: "right" });
  y += lh;

  drawField("GR Number", String(data.grNo ?? "—"), y);
  y += lh;

  drawField("Acedemic Year", data.academicYear || "—", y);
  y += lh;

  drawField("Period", periodText, y);
  y += lh;

  drawField(
    "Payment Mode",
    data.paymentMode ? data.paymentMode.charAt(0).toUpperCase() + data.paymentMode.slice(1) : "—",
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

  if (data.outstandingAfterPayment != null) {
    const badgeHeight = 5.4;
    const badgeY = y - 0.2;
    doc.setFillColor(255, 245, 204);
    doc.setDrawColor(214, 158, 46);
    doc.roundedRect(leftX, badgeY, contentW, badgeHeight, 1.2, 1.2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.1);
    doc.setTextColor(120, 53, 15);
    doc.text("Outstanding:", leftX + 1.5, badgeY + 3.7);
    doc.text(`Rs. ${data.outstandingAfterPayment.toFixed(2)}`, rightX - 1.5, badgeY + 3.7, {
      align: "right",
    });
    doc.setTextColor(0, 0, 0);
    y += badgeHeight + 1.8;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  y = drawWrappedText(doc, amountWords, leftX, y, contentW, smallLh);
  y += 1.4;

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
  // Right-side receiver name and signature/stamp box with fixed lower area
  const receiverBlockTop = Math.max(y + 1, h - 27);
  const notesBottomLimit = receiverBlockTop - 2;
  notes.slice(0, 3).forEach((line) => {
    if (y < notesBottomLimit) {
      y = drawWrappedText(doc, line, leftX, y, contentW - 36, 3.4);
    }
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text(data.receivedBy ?? "", rightX, receiverBlockTop, { align: "right" });
  const boxW = 26;
  const boxH = 16;
  const boxX = rightX - boxW;
  const boxY = receiverBlockTop + 3;
  doc.setLineWidth(0.2);
  doc.rect(boxX, boxY, boxW, boxH);

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
