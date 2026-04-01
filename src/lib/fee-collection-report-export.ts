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
  summary?: FeeReportSummary;
};

// ─── Colour palette — matches the app's HSL theme from globals.css ───
// primary:            hsl(210 59% 30%)
// primary-foreground: hsl(0 0% 100%)
// foreground:         hsl(210 25% 9%)
// muted-foreground:   hsl(210 12% 40%)
// border:             hsl(210 16% 90%)
// background:         hsl(210 20% 98%)
// secondary:          hsl(210 18% 94%)
// muted:              hsl(210 16% 95%)
// accent:             hsl(210 30% 94%)
// green-600 (amount): used on-screen for total amount

type RGB = [number, number, number];

const C = {
  primary:      [31, 63, 122]   as RGB,   // hsl(210 59% 30%)
  white:        [255, 255, 255] as RGB,
  foreground:   [17, 20, 25]    as RGB,   // hsl(210 25% 9%)
  mutedFg:      [90, 97, 107]   as RGB,   // hsl(210 12% 40%)
  border:       [221, 226, 233] as RGB,   // hsl(210 16% 90%)
  background:   [247, 249, 252] as RGB,   // hsl(210 20% 98%)
  secondary:    [237, 241, 245] as RGB,   // hsl(210 18% 94%)
  muted:        [239, 242, 246] as RGB,   // hsl(210 16% 95%)
  accent:       [225, 232, 240] as RGB,   // hsl(210 30% 94%)
  green600:     [22, 163, 74]   as RGB,   // tailwind green-600
};

function fmtINR(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

function drawRoundedRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number, r: number,
  fill: RGB,
  stroke?: RGB
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
  label: string,
  value: string,
  sub: string | null,
  valueColor: RGB
) {
  drawRoundedRect(doc, x, y, w, h, 2, C.white, C.border);

  doc.setFontSize(7);
  doc.setTextColor(...C.mutedFg);
  doc.setFont("helvetica", "normal");
  doc.text(label, x + 4, y + 6);

  doc.setFontSize(12);
  doc.setTextColor(...valueColor);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 4, y + 13.5);

  if (sub) {
    doc.setFontSize(7);
    doc.setTextColor(...C.mutedFg);
    doc.setFont("helvetica", "normal");
    doc.text(sub, x + 4, y + 18);
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
  // HEADER
  // ═══════════════════════════════════════════
  drawRoundedRect(doc, marginL, curY, contentW, 14, 2, C.primary);

  doc.setFontSize(13);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.text(opts.schoolName?.trim() || "Fee Collection Report", marginL + 5, curY + 6);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Fees Collection Report", marginL + 5, curY + 11);

  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
  doc.setFontSize(7.5);
  doc.text(`Generated: ${dateStr}`, pageW - marginR - 5, curY + 6, { align: "right" });

  curY += 18;

  // ═══════════════════════════════════════════
  // FILTER STRIP
  // ═══════════════════════════════════════════
  if (opts.subtitle?.trim()) {
    drawRoundedRect(doc, marginL, curY, contentW, 7.5, 1.5, C.secondary, C.border);
    doc.setFontSize(7.5);
    doc.setTextColor(...C.mutedFg);
    doc.setFont("helvetica", "normal");
    doc.text(opts.subtitle.trim(), marginL + 4, curY + 5);
    curY += 10;
  }

  // ═══════════════════════════════════════════
  // SUMMARY CARDS
  // ═══════════════════════════════════════════
  const summary = opts.summary;
  if (summary) {
    const modeCards = summary.byMode;
    const totalCards = 2 + modeCards.length;
    const cardGap = 3;
    const cardW = (contentW - cardGap * (totalCards - 1)) / totalCards;
    const cardH = 20;

    drawSummaryCard(
      doc, marginL, curY, cardW, cardH,
      "Total Collections",
      String(summary.totalCount),
      summary.totalCount === 1 ? "receipt" : "receipts",
      C.foreground
    );

    drawSummaryCard(
      doc, marginL + cardW + cardGap, curY, cardW, cardH,
      "Total Amount",
      fmtINR(summary.totalAmount),
      null,
      C.green600
    );

    modeCards.forEach((m, i) => {
      const x = marginL + (cardW + cardGap) * (i + 2);
      const modeLabel = m.payment_mode.charAt(0).toUpperCase() + m.payment_mode.slice(1);
      drawSummaryCard(
        doc, x, curY, cardW, cardH,
        modeLabel,
        fmtINR(m.total),
        `${m.count} receipt${m.count !== 1 ? "s" : ""}`,
        C.foreground
      );
    });

    curY += cardH + 5;
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
          styles: { halign: "right" as const, fontStyle: "bold" as const, fontSize: 8.5 },
        },
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      font: "helvetica",
      textColor: C.foreground,
      lineColor: C.border,
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
      fillColor: C.accent,
      textColor: C.primary,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      lineColor: C.border,
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: C.background,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      4: { halign: "right", fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      const pageH = doc.internal.pageSize.getHeight();
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      const currentPage = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;

      // Footer line
      const lineY = pageH - 9;
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.3);
      doc.line(marginL, lineY, pageW - marginR, lineY);

      // Footer text
      doc.setFontSize(7);
      doc.setTextColor(...C.mutedFg);
      doc.setFont("helvetica", "normal");
      doc.text(
        opts.schoolName?.trim() || "Fee Collection Report",
        marginL,
        pageH - 6
      );
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageW - marginR,
        pageH - 6,
        { align: "right" }
      );

      // Continuation header on pages 2+
      if (data.pageNumber > 1) {
        drawRoundedRect(doc, marginL, 4, contentW, 7.5, 1.5, C.secondary);
        doc.setFontSize(7);
        doc.setTextColor(...C.mutedFg);
        doc.text(
          `${opts.schoolName?.trim() || "Fee Collection Report"}  —  Fees Collection Report (continued)`,
          marginL + 4,
          9
        );
      }
    },
  });

  doc.save(`${fileBase}.pdf`);
}
