import { jsPDF } from "jspdf";
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

/** Receipt PDF currency: INR prefix + Indian grouping (e.g. INR 12,345.67). */
export function formatInrAmount(value: number): string {
  return `INR ${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  /** Annual net fee liability for the student (academic year); enables fee summary on receipt. */
  totalFees?: number;
  /** Balance due after this payment (0 if fully paid for the year). */
  outstandingAfterPayment?: number;
}

/** Academic / India FY-style quarters (Apr–Mar year), not calendar Jan–Dec Q1–Q4. */
const QUARTER_MONTHS: Record<number, string> = {
  1: "Apr-Jun",
  2: "Jul-Sep",
  3: "Oct-Dec",
  4: "Jan-Mar",
};

export function quarterLabel(quarter: number): string {
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
  const labelX = leftX;
  const colonX = leftX + 17;
  const valueX = leftX + 19;
  const drawAlignedField = (label: string, value: string, yy: number) => {
    doc.setFont("helvetica", "normal");
    doc.text(label, labelX, yy);
    doc.text(":", colonX, yy);
    doc.text(value || "—", valueX, yy);
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.9);

  doc.text("Receipt", labelX, y);
  doc.text(":", colonX, y);
  doc.setFont("helvetica", "bold");
  doc.text(String(data.receiptNumber), valueX, y);
  doc.setFont("helvetica", "normal");
  doc.text("Date :", rightX - 24, y);
  doc.setFont("helvetica", "bold");
  doc.text(dateStr || "—", rightX, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += lh;

  doc.text("Name", labelX, y);
  doc.text(":", colonX, y);
  const nameLines = doc.splitTextToSize(data.studentName || "—", contentW - (valueX - leftX));
  nameLines.forEach((line: string, i: number) => {
    doc.text(line, valueX, y + i * lh);
  });
  y += Math.max(lh * nameLines.length, lh);

  drawAlignedField(
    "Std/Div",
    `${String(data.standard ?? "—")} / ${String(data.division ?? "—")}`,
    y
  );
  y += lh;

  drawAlignedField("Roll No", String(data.rollNumber ?? "—"), y);
  y += lh;

  drawAlignedField("GR No", String(data.grNo ?? "—"), y);
  y += lh;

  drawAlignedField("Period", periodText, y);
  y += lh;

  drawAlignedField("Year", data.academicYear || "—", y);
  y += lh;

  drawAlignedField("Mode", data.paymentMode ? data.paymentMode.charAt(0).toUpperCase() + data.paymentMode.slice(1) : "—", y);
  y += blockGap + 0.6;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  const amountFormatted = formatInrAmount(Number(data.amount || 0));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.3);
  doc.text("Fee Amount :", leftX, y);
  doc.text(amountFormatted, rightX, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.9);
  y += lh;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  y += 1;
  y = drawWrappedText(doc, amountWords, leftX, y, contentW, smallLh);

  if (data.totalFees != null) {
    y += 1.2;
    const totalFees = Number(data.totalFees);
    const outstanding = Math.max(0, Number(data.outstandingAfterPayment ?? 0));
    const feesPaid = Math.max(0, totalFees - outstanding);
    const bandPadX = 2.8;
    const innerLeft = margin + bandPadX;
    const innerRight = w - margin - bandPadX;
    const rowGap = 3.9;
    const bandTop = y;
    const bandH = 3.2 + rowGap * 3;
    // Black & white print: light gray panel + black border/text only
    doc.setFillColor(242, 242, 242);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, bandTop, contentW, bandH, 1.2, 1.2, "FD");

    let rowY = bandTop + 4.2;
    doc.setFontSize(7.2);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("Total Fees", innerLeft, rowY);
    doc.setFont("helvetica", "bold");
    doc.text(formatInrAmount(totalFees), innerRight, rowY, { align: "right" });
    rowY += rowGap;

    doc.setFont("helvetica", "normal");
    doc.text("Fees Paid", innerLeft, rowY);
    doc.setFont("helvetica", "bold");
    doc.text(formatInrAmount(feesPaid), innerRight, rowY, { align: "right" });
    rowY += rowGap;

    doc.setFont("helvetica", "normal");
    doc.text("Outstanding Fees", innerLeft, rowY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.text(formatInrAmount(outstanding), innerRight, rowY, { align: "right" });

    doc.setFontSize(7.2);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    y = bandTop + bandH + 1.4;
  }
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
  // Keep note text and receiver block aligned on the same top line.
  const sectionTopY = y;
  const notesBottomLimit = h - 11;
  notes.slice(0, 3).forEach((line) => {
    if (y < notesBottomLimit) {
      y = drawWrappedText(doc, line, leftX, y, contentW - 36, 3.4);
    }
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(data.receivedBy ?? "", rightX, sectionTopY, { align: "right" });
  const boxW = 26;
  const boxH = 16;
  const boxX = rightX - boxW;
  const boxY = sectionTopY + 2;
  doc.setLineWidth(0.2);
  doc.rect(boxX, boxY, boxW, boxH);

  return doc.output("blob");
}
