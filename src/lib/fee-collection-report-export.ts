import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatFeeCollectionDisplayDate, getFeeTypeLabel } from "@/lib/utils";
import {
  C, fmtINR,
  drawSummaryCard, drawPdfHeader, drawFilterStrip, drawPageFooter,
} from "@/lib/pdf-theme";

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

export function exportFeeCollectionPdf(
  rows: FeeReportExportRow[],
  fileBase: string,
  opts: FeeReportPdfOptions,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 12;
  const marginR = 12;
  const contentW = pageW - marginL - marginR;
  const reportTitle = "Fees Collection Report";

  let curY = drawPdfHeader(doc, { schoolName: opts.schoolName, reportTitle }, marginL, marginR, contentW);

  if (opts.subtitle?.trim()) {
    curY = drawFilterStrip(doc, opts.subtitle, curY, marginL, contentW);
  }

  // Summary cards
  const summary = opts.summary;
  if (summary) {
    const modeCards = summary.byMode;
    const totalCards = 2 + modeCards.length;
    const cardGap = 3;
    const cardW = (contentW - cardGap * (totalCards - 1)) / totalCards;
    const cardH = 20;

    drawSummaryCard(
      doc, marginL, curY, cardW, cardH,
      "Total Collections", String(summary.totalCount),
      summary.totalCount === 1 ? "receipt" : "receipts",
      C.foreground,
    );

    drawSummaryCard(
      doc, marginL + cardW + cardGap, curY, cardW, cardH,
      "Total Amount", fmtINR(summary.totalAmount), null,
      C.green600,
    );

    modeCards.forEach((m, i) => {
      const x = marginL + (cardW + cardGap) * (i + 2);
      const modeLabel = m.payment_mode.charAt(0).toUpperCase() + m.payment_mode.slice(1);
      drawSummaryCard(
        doc, x, curY, cardW, cardH,
        modeLabel, fmtINR(m.total),
        `${m.count} receipt${m.count !== 1 ? "s" : ""}`,
        C.foreground,
      );
    });

    curY += cardH + 5;
  }

  // Data table
  const body = rows.map((row, idx) => [
    String(idx + 1),
    row.receipt_number,
    String(row.student_name ?? "—").slice(0, 30),
    row.student_standard || "—",
    row.student_division || "—",
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
    head: [["#", "Receipt", "Student", "Std", "Div", "Amount", "Type", "Qtr", "Mode", "Date", "Collected By"]],
    body,
    foot: [[
      { content: "", colSpan: 5 },
      { content: `Total: ${fmtINR(sum)}`, colSpan: 6, styles: { halign: "right" as const, fontStyle: "bold" as const, fontSize: 8.5 } },
    ]],
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      font: "helvetica",
      textColor: C.foreground,
      lineColor: C.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
    },
    footStyles: {
      fillColor: C.accent,
      textColor: C.primary,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      lineColor: C.border,
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: C.background },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      3: { cellWidth: 12 },
      4: { cellWidth: 10 },
      5: { halign: "right", fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      const currentPage = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;
      drawPageFooter(doc, { schoolName: opts.schoolName, reportTitle }, marginL, marginR, contentW, currentPage > 0 ? currentPage : data.pageNumber);
    },
  });

  doc.save(`${fileBase}.pdf`);
}
