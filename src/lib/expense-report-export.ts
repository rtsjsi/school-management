import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { C, drawFilterStrip, drawPageFooter, drawPdfHeader, drawSummaryCard, fmtINR } from "@/lib/pdf-theme";

export type ExpenseListRow = {
  expense_date?: string;
  voucher?: string;
  expense_head?: string;
  party?: string;
  amount: number;
  account?: string;
  expense_by?: string;
  description?: string;
};

export type ExpenseSummaryRow = {
  payment_mode: string;
  count: number;
  total: number;
};

export type ExpensePdfOptions = {
  schoolName?: string;
  subtitle?: string;
  reportType: "list" | "summary";
};

export function exportExpensePdf(
  listRows: ExpenseListRow[],
  summaryRows: ExpenseSummaryRow[],
  fileBase: string,
  opts: ExpensePdfOptions,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 12;
  const marginR = 12;
  const contentW = pageW - marginL - marginR;
  const reportTitle = "Expense Report";

  let curY = drawPdfHeader(doc, { schoolName: opts.schoolName, reportTitle }, marginL, marginR, contentW);
  if (opts.subtitle?.trim()) curY = drawFilterStrip(doc, opts.subtitle, curY, marginL, contentW);

  const totalCount = opts.reportType === "summary"
    ? summaryRows.reduce((s, r) => s + Number(r.count), 0)
    : listRows.length;
  const totalAmount = opts.reportType === "summary"
    ? summaryRows.reduce((s, r) => s + Number(r.total), 0)
    : listRows.reduce((s, r) => s + Number(r.amount), 0);
  const byMode = summaryRows.length
    ? summaryRows
    : listRows.reduce<Record<string, { count: number; total: number }>>((acc, row) => {
      const mode = (row.account ?? "unknown").toLowerCase();
      if (!acc[mode]) acc[mode] = { count: 0, total: 0 };
      acc[mode].count += 1;
      acc[mode].total += Number(row.amount ?? 0);
      return acc;
    }, {});

  const modeEntries = Array.isArray(byMode)
    ? byMode.map((r) => ({ mode: r.payment_mode, count: r.count, total: r.total }))
    : Object.entries(byMode).map(([mode, v]) => ({ mode, count: v.count, total: v.total }));

  const cardGap = 3;
  const cardCount = Math.min(4, 2 + modeEntries.length);
  const cardW = (contentW - cardGap * (cardCount - 1)) / cardCount;
  const cardH = 20;
  drawSummaryCard(doc, marginL, curY, cardW, cardH, "Total Expenses", String(totalCount), `${totalCount === 1 ? "entry" : "entries"}`, C.foreground);
  drawSummaryCard(doc, marginL + cardW + cardGap, curY, cardW, cardH, "Total Amount", fmtINR(totalAmount), null, C.destructive);
  modeEntries.slice(0, Math.max(0, cardCount - 2)).forEach((m, idx) => {
    drawSummaryCard(
      doc,
      marginL + (cardW + cardGap) * (idx + 2),
      curY,
      cardW,
      cardH,
      m.mode.charAt(0).toUpperCase() + m.mode.slice(1),
      fmtINR(m.total),
      `${m.count} ${m.count === 1 ? "entry" : "entries"}`,
      C.foreground,
    );
  });
  curY += cardH + 5;

  if (opts.reportType === "summary") {
    const body = summaryRows.map((r, i) => [
      String(i + 1),
      r.payment_mode.charAt(0).toUpperCase() + r.payment_mode.slice(1),
      String(r.count),
      fmtINR(Number(r.total)),
    ]);
    autoTable(doc, {
      startY: curY,
      margin: { left: marginL, right: marginR },
      head: [["#", "Payment Mode", "Count", "Total Amount"]],
      body,
      foot: [[
        { content: "Total", colSpan: 2 },
        { content: String(totalCount), styles: { halign: "center" as const, fontStyle: "bold" as const } },
        { content: fmtINR(totalAmount), styles: { halign: "right" as const, fontStyle: "bold" as const } },
      ]],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, textColor: C.foreground, lineColor: C.border, lineWidth: 0.2 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold" },
      footStyles: { fillColor: C.accent, textColor: C.primary, fontStyle: "bold" },
      alternateRowStyles: { fillColor: C.background },
      columnStyles: { 0: { cellWidth: 10, halign: "center" }, 2: { halign: "center" }, 3: { halign: "right" } },
      didDrawPage: (data) => {
        const currentPage = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;
        drawPageFooter(doc, { schoolName: opts.schoolName, reportTitle }, marginL, marginR, contentW, currentPage > 0 ? currentPage : data.pageNumber);
      },
    });
  } else {
    const body = listRows.map((r, i) => [
      String(i + 1),
      r.expense_date ? new Date(`${r.expense_date}T12:00:00`).toLocaleDateString("en-IN") : "—",
      r.voucher ?? "—",
      r.expense_head ?? "—",
      r.party ?? "—",
      fmtINR(Number(r.amount ?? 0)),
      r.account ? r.account.charAt(0).toUpperCase() + r.account.slice(1) : "—",
      r.expense_by ?? "—",
      r.description ?? "—",
    ]);
    autoTable(doc, {
      startY: curY,
      margin: { left: marginL, right: marginR },
      head: [["#", "Date", "Voucher", "Head", "Party", "Amount", "Mode", "Expense By", "Description"]],
      body,
      foot: [[
        { content: "Total", colSpan: 5 },
        { content: fmtINR(totalAmount), styles: { halign: "right" as const, fontStyle: "bold" as const } },
        { content: "", colSpan: 3 },
      ]],
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 2, textColor: C.foreground, lineColor: C.border, lineWidth: 0.2 },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold" },
      footStyles: { fillColor: C.accent, textColor: C.primary, fontStyle: "bold" },
      alternateRowStyles: { fillColor: C.background },
      columnStyles: { 0: { cellWidth: 8, halign: "center" }, 5: { halign: "right", fontStyle: "bold" } },
      didDrawPage: (data) => {
        const currentPage = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;
        drawPageFooter(doc, { schoolName: opts.schoolName, reportTitle }, marginL, marginR, contentW, currentPage > 0 ? currentPage : data.pageNumber);
      },
    });
  }

  doc.save(`${fileBase}.pdf`);
}
