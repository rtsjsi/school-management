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
  cheque_number?: string | null;
  cheque_bank?: string | null;
  cheque_date?: string | null;
  online_transaction_id?: string | null;
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

/** Format cheque / online fields for report table & PDF. */
export function formatFeePaymentDetails(row: {
  payment_mode?: string | null;
  cheque_number?: string | null;
  cheque_bank?: string | null;
  cheque_date?: string | null;
  online_transaction_id?: string | null;
}): string {
  const mode = (row.payment_mode ?? "").toLowerCase();
  if (mode === "cheque") {
    const parts = [
      row.cheque_number ? `Chq ${row.cheque_number}` : null,
      row.cheque_bank ? row.cheque_bank : null,
      row.cheque_date ? formatFeeCollectionDisplayDate(row.cheque_date, row.cheque_date) : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "—";
  }
  if (mode === "online") {
    return row.online_transaction_id ? `Txn ${row.online_transaction_id}` : "—";
  }
  return "—";
}

export function exportFeeCollectionPdf(
  rows: FeeReportExportRow[],
  fileBase: string,
  opts: FeeReportPdfOptions,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 8;
  const marginR = 8;
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
    String(row.student_name ?? "—").slice(0, 24),
    row.student_gr_no || "—",
    row.student_standard || "—",
    row.student_division || "—",
    row.student_roll_number != null ? String(row.student_roll_number) : "—",
    fmtINR(Number(row.amount)),
    getFeeTypeLabel(row.fee_type),
    `Q${row.quarter}`,
    String(row.academic_year ?? "—").slice(0, 9),
    String(row.payment_mode).charAt(0).toUpperCase() + String(row.payment_mode).slice(1),
    formatFeePaymentDetails(row).slice(0, 42),
    formatFeeCollectionDisplayDate(row.collection_date, ""),
    String(row.collected_by ?? "—").slice(0, 16),
  ]);

  const sum = rows.reduce((s, r) => s + Number(r.amount), 0);

  autoTable(doc, {
    startY: curY,
    margin: { left: marginL, right: marginR },
    head: [[
      "#", "Receipt", "Student", "GR", "Std", "Div", "Roll", "Amount", "Type", "Qtr",
      "Year", "Mode", "Payment details", "Date", "Collected By",
    ]],
    body,
    foot: [[
      { content: "", colSpan: 7 },
      { content: `Total: ${fmtINR(sum)}`, colSpan: 8, styles: { halign: "right" as const, fontStyle: "bold" as const, fontSize: 7.5 } },
    ]],
    theme: "grid",
    styles: {
      fontSize: 6,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
      font: "helvetica",
      textColor: C.foreground,
      lineColor: C.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 6,
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
    },
    footStyles: {
      fillColor: C.accent,
      textColor: C.primary,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      lineColor: C.border,
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: C.background },
    columnStyles: {
      0: { cellWidth: 6, halign: "center" },
      7: { halign: "right", fontStyle: "bold" },
      12: { cellWidth: 38 },
    },
    didDrawPage: (data) => {
      const currentPage = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;
      drawPageFooter(doc, { schoolName: opts.schoolName, reportTitle }, marginL, marginR, contentW, currentPage > 0 ? currentPage : data.pageNumber);
    },
  });

  doc.save(`${fileBase}.pdf`);
}
