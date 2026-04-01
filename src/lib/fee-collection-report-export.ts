import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatFeeCollectionDisplayDate, getFeeTypeLabel } from "@/lib/utils";

export type FeeReportExportRow = {
  receipt_number: string;
  student_name?: string;
  student_standard?: string;
  student_division?: string;
  student_roll_number?: number;
  student_gr_no?: string;
  amount: number;
  fee_type: string;
  quarter: number;
  academic_year: string;
  payment_mode: string;
  collection_date: string;
  collected_by?: string;
};

export type FeeReportSummary = {
  totalCount: number;
  totalAmount: number;
  byMode: { payment_mode: string; count: number; total: number }[];
};

export type FeeReportPdfOptions = {
  schoolName?: string;
  subtitle?: string;
  filters?: string[];
  summary?: FeeReportSummary;
};

// ─── Colour palette ───
const C = {
  primary:     [30, 64, 175]   as [number, number, number],
  primaryLight:[219, 234, 254] as [number, number, number],
  green:       [22, 163, 74]   as [number, number, number],
  greenBg:     [220, 252, 231] as [number, number, number],
  slate900:    [15, 23, 42]    as [number, number, number],
  slate600:    [71, 85, 105]   as [number, number, number],
  slate200:    [226, 232, 240] as [number, number, number],
  slate100:    [241, 245, 249] as [number, number, number],
  slate50:     [248, 250, 252] as [number, number, number],
  white:       [255, 255, 255] as [number, number, number],
  amber:       [245, 158, 11]  as [number, number, number],
  amberBg:     [254, 243, 199] as [number, number, number],
  violet:      [124, 58, 237]  as [number, number, number],
  violetBg:    [237, 233, 254] as [number, number, number],
  teal:        [13, 148, 136]  as [number, number, number],
  tealBg:      [204, 251, 241] as [number, number, number],
};

function fmtINR(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

function drawRoundedRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number, r: number,
  fill: [number, number, number],
  stroke?: [number, number, number]
) {
  if (stroke) {
    doc.setDrawColor(...stroke);
    doc.setLineWidth(0.3);
  }
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, r, r, stroke ? "FD" : "F");
}

function drawSummaryCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string, sub: string | null,
  bgColor: [number, number, number],
  borderColor: [number, number, number],
  valueColor: [number, number, number]
) {
  drawRoundedRect(doc, x, y, w, h, 2, bgColor, borderColor);
  doc.setFontSize(7);
  doc.setTextColor(...C.slate600);
  doc.setFont("helvetica", "normal");
  doc.text(label, x + 4, y + 6);
  doc.setFontSize(13);
  doc.setTextColor(...valueColor);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 4, y + 14);
  if (sub) {
    doc.setFontSize(7);
    doc.setTextColor(...C.slate600);
    doc.setFont("helvetica", "normal");
    doc.text(sub, x + 4, y + 19);
  }
}

export function exportFeeCollectionPdf(
  rows: FeeReportExportRow[],
  fileBase: string,
  opts: FeeReportPdfOptions
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 12;
  const marginR = 12;
  const contentW = pageW - marginL - marginR;
  let curY = 10;

  // ═══════════════════════════════════════════
  // HEADER BAR
  // ═══════════════════════════════════════════
  drawRoundedRect(doc, marginL, curY, contentW, 16, 2.5, C.primary);

  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.text(opts.schoolName?.trim() || "Fee Collection Report", marginL + 6, curY + 7);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Fees Collection Report", marginL + 6, curY + 12.5);

  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
  doc.setFontSize(8);
  doc.text(`Generated: ${dateStr}`, pageW - marginR - 6, curY + 7, { align: "right" });

  curY += 20;

  // ═══════════════════════════════════════════
  // FILTER BADGES
  // ═══════════════════════════════════════════
  if (opts.subtitle?.trim()) {
    drawRoundedRect(doc, marginL, curY, contentW, 8, 1.5, C.slate100, C.slate200);
    doc.setFontSize(7.5);
    doc.setTextColor(...C.slate600);
    doc.setFont("helvetica", "normal");
    doc.text(opts.subtitle.trim(), marginL + 4, curY + 5.2);
    curY += 11;
  }

  // ═══════════════════════════════════════════
  // SUMMARY CARDS
  // ═══════════════════════════════════════════
  const summary = opts.summary;
  if (summary) {
    const modeCards = summary.byMode;
    const totalCards = 2 + modeCards.length;
    const cardGap = 4;
    const cardW = (contentW - cardGap * (totalCards - 1)) / totalCards;
    const cardH = 21;

    const modeStyles: Record<string, { bg: [number, number, number]; border: [number, number, number]; val: [number, number, number] }> = {
      cash:   { bg: C.amberBg,  border: C.amber,  val: C.amber },
      cheque: { bg: C.violetBg, border: C.violet,  val: C.violet },
      online: { bg: C.tealBg,   border: C.teal,    val: C.teal },
    };

    drawSummaryCard(
      doc, marginL, curY, cardW, cardH,
      "Total Collections",
      String(summary.totalCount),
      summary.totalCount === 1 ? "receipt" : "receipts",
      C.primaryLight, C.primary, C.primary
    );

    drawSummaryCard(
      doc, marginL + cardW + cardGap, curY, cardW, cardH,
      "Total Amount",
      fmtINR(summary.totalAmount),
      null,
      C.greenBg, C.green, C.green
    );

    modeCards.forEach((m, i) => {
      const style = modeStyles[m.payment_mode] ?? { bg: C.slate100, border: C.slate600, val: C.slate600 };
      const x = marginL + (cardW + cardGap) * (i + 2);
      const modeLabel = m.payment_mode.charAt(0).toUpperCase() + m.payment_mode.slice(1);
      drawSummaryCard(
        doc, x, curY, cardW, cardH,
        modeLabel,
        fmtINR(m.total),
        `${m.count} receipt${m.count !== 1 ? "s" : ""}`,
        style.bg, style.border, style.val
      );
    });

    curY += cardH + 6;
  }

  // ═══════════════════════════════════════════
  // DATA TABLE
  // ═══════════════════════════════════════════
  const body = rows.map((row, idx) => [
    String(idx + 1),
    row.receipt_number,
    String(row.student_name ?? "—").slice(0, 30),
    [row.student_standard, row.student_division].filter(Boolean).join(" ") || "—",
    fmtINR(Number(row.amount)),
    getFeeTypeLabel(row.fee_type),
    `Q${row.quarter}`,
    String(row.payment_mode).charAt(0).toUpperCase() + String(row.payment_mode).slice(1),
    formatFeeCollectionDisplayDate(row.collection_date, ""),
    String(row.collected_by ?? "—").slice(0, 20),
  ]);

  const sum = rows.reduce((s, r) => s + Number(r.amount), 0);

  autoTable(doc, {
    startY: curY,
    margin: { left: marginL, right: marginR },
    head: [["#", "Receipt", "Student", "Std / Div", "Amount", "Type", "Qtr", "Mode", "Date", "Collected By"]],
    body,
    foot: [
      [
        { content: "", colSpan: 4 },
        {
          content: `Total: ${fmtINR(sum)}`,
          colSpan: 6,
          styles: { halign: "right" as const, fontStyle: "bold" as const, fontSize: 9 },
        },
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      font: "helvetica",
      textColor: C.slate900,
      lineColor: C.slate200,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
    },
    footStyles: {
      fillColor: C.primaryLight,
      textColor: C.primary,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      lineColor: C.primary,
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: C.slate50,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      4: { halign: "right", fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      const pageH = doc.internal.pageSize.getHeight();
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      const currentPage = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;

      doc.setFontSize(7);
      doc.setTextColor(...C.slate600);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageW - marginR,
        pageH - 6,
        { align: "right" }
      );
      doc.text(
        opts.schoolName?.trim() || "Fee Collection Report",
        marginL,
        pageH - 6
      );

      const lineY = pageH - 9;
      doc.setDrawColor(...C.slate200);
      doc.setLineWidth(0.3);
      doc.line(marginL, lineY, pageW - marginR, lineY);

      if (data.pageNumber > 1) {
        drawRoundedRect(doc, marginL, 4, contentW, 8, 1.5, C.slate100);
        doc.setFontSize(7);
        doc.setTextColor(...C.slate600);
        doc.text(
          `${opts.schoolName?.trim() || "Fee Collection Report"}  —  Fees Collection Report (continued)`,
          marginL + 4,
          9.2
        );
      }
    },
  });

  doc.save(`${fileBase}.pdf`);
}
