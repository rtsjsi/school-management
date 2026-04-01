import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getFeeTypeLabel } from "@/lib/utils";
import {
  C, fmtINR,
  drawSummaryCard, drawPdfHeader, drawFilterStrip, drawPageFooter,
} from "@/lib/pdf-theme";

export type OutstandingExportRow = {
  student_id: string;
  full_name: string;
  standard: string;
  division: string;
  roll_number?: number;
  gr_number?: string;
  quarter: number;
  quarter_label?: string;
  fee_type: string;
  total: number;
  paid: number;
  outstanding: number;
};

export type OutstandingSummary = {
  totalStudents: number;
  totalOutstanding: number;
  totalFees: number;
  totalPaid: number;
};

export type OutstandingPdfOptions = {
  schoolName?: string;
  subtitle?: string;
  summary?: OutstandingSummary;
};

export function exportOutstandingPdf(
  rows: OutstandingExportRow[],
  fileBase: string,
  opts: OutstandingPdfOptions,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 12;
  const marginR = 12;
  const contentW = pageW - marginL - marginR;
  const reportTitle = "Outstanding Fees Report";

  let curY = drawPdfHeader(doc, { schoolName: opts.schoolName, reportTitle }, marginL, marginR, contentW);

  if (opts.subtitle?.trim()) {
    curY = drawFilterStrip(doc, opts.subtitle, curY, marginL, contentW);
  }

  // Summary cards
  const summary = opts.summary;
  if (summary) {
    const cardGap = 3;
    const totalCards = 4;
    const cardW = (contentW - cardGap * (totalCards - 1)) / totalCards;
    const cardH = 20;

    drawSummaryCard(
      doc, marginL, curY, cardW, cardH,
      "Students with Dues", String(summary.totalStudents),
      summary.totalStudents === 1 ? "student" : "students",
      C.foreground,
    );

    drawSummaryCard(
      doc, marginL + (cardW + cardGap), curY, cardW, cardH,
      "Total Outstanding", fmtINR(summary.totalOutstanding), null,
      C.destructive,
    );

    drawSummaryCard(
      doc, marginL + (cardW + cardGap) * 2, curY, cardW, cardH,
      "Total Fees", fmtINR(summary.totalFees), null,
      C.foreground,
    );

    drawSummaryCard(
      doc, marginL + (cardW + cardGap) * 3, curY, cardW, cardH,
      "Total Paid", fmtINR(summary.totalPaid), null,
      C.green600,
    );

    curY += cardH + 5;
  }

  // Data table
  const body = rows.map((row, idx) => [
    String(idx + 1),
    String(row.full_name).slice(0, 28),
    row.gr_number ?? "—",
    row.standard,
    row.division || "—",
    row.quarter_label ?? `Q${row.quarter}`,
    getFeeTypeLabel(row.fee_type),
    fmtINR(row.total),
    fmtINR(row.paid),
    fmtINR(row.outstanding),
  ]);

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  const totalFees = rows.reduce((s, r) => s + r.total, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);

  autoTable(doc, {
    startY: curY,
    margin: { left: marginL, right: marginR },
    head: [["#", "Student", "GR No.", "Std", "Div", "Quarter", "Fee Type", "Total", "Paid", "Outstanding"]],
    body,
    foot: [[
      { content: "", colSpan: 7 },
      { content: fmtINR(totalFees), styles: { halign: "right" as const, fontStyle: "bold" as const } },
      { content: fmtINR(totalPaid), styles: { halign: "right" as const, fontStyle: "bold" as const } },
      { content: fmtINR(totalOutstanding), styles: { halign: "right" as const, fontStyle: "bold" as const } },
    ]],
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
    alternateRowStyles: { fillColor: C.background },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right", fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      const currentPage = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;
      drawPageFooter(doc, { schoolName: opts.schoolName, reportTitle }, marginL, marginR, contentW, currentPage > 0 ? currentPage : data.pageNumber);
    },
  });

  doc.save(`${fileBase}.pdf`);
}
