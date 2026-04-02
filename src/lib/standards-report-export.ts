import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  C,
  drawFilterStrip,
  drawPageFooter,
  drawPdfHeader,
  drawSummaryCard,
} from "@/lib/pdf-theme";

export type StandardsExportRow = {
  standard: string;
  section: string;
  divisions: string;
  divisionCount: number;
};

export type StandardsPdfOptions = {
  schoolName?: string;
  subtitle?: string;
};

export function exportStandardsPdf(
  rows: StandardsExportRow[],
  fileBase: string,
  opts: StandardsPdfOptions,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 12;
  const marginR = 12;
  const contentW = pageW - marginL - marginR;
  const reportTitle = "Standards Report";

  let curY = drawPdfHeader(doc, { schoolName: opts.schoolName, reportTitle }, marginL, marginR, contentW);

  if (opts.subtitle?.trim()) {
    curY = drawFilterStrip(doc, opts.subtitle, curY, marginL, contentW);
  }

  const totalStandards = rows.length;
  const totalDivisions = rows.reduce((sum, r) => sum + r.divisionCount, 0);
  const withDivisions = rows.filter((r) => r.divisionCount > 0).length;
  const withoutDivisions = totalStandards - withDivisions;

  const cardGap = 3;
  const totalCards = 4;
  const cardW = (contentW - cardGap * (totalCards - 1)) / totalCards;
  const cardH = 20;

  drawSummaryCard(
    doc, marginL, curY, cardW, cardH,
    "Total Standards", String(totalStandards),
    totalStandards === 1 ? "standard" : "standards",
    C.foreground,
  );

  drawSummaryCard(
    doc, marginL + (cardW + cardGap), curY, cardW, cardH,
    "Total Divisions", String(totalDivisions), null,
    C.primary,
  );

  drawSummaryCard(
    doc, marginL + (cardW + cardGap) * 2, curY, cardW, cardH,
    "With Divisions", String(withDivisions), null,
    C.green600,
  );

  drawSummaryCard(
    doc, marginL + (cardW + cardGap) * 3, curY, cardW, cardH,
    "Without Divisions", String(withoutDivisions), null,
    C.destructive,
  );

  curY += cardH + 5;

  const body = rows.map((row, idx) => [
    String(idx + 1),
    row.standard,
    row.section,
    row.divisions || "—",
    String(row.divisionCount),
  ]);

  autoTable(doc, {
    startY: curY,
    margin: { left: marginL, right: marginR },
    head: [["#", "Standard", "Section", "Divisions", "Division Count"]],
    body,
    foot: [[
      { content: `Total: ${totalStandards} standard${totalStandards !== 1 ? "s" : ""}`, colSpan: 4 },
      { content: String(totalDivisions), styles: { halign: "center" as const, fontStyle: "bold" as const } },
    ]],
    theme: "grid",
    styles: {
      fontSize: 8,
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
      fontSize: 8,
    },
    footStyles: {
      fillColor: C.accent,
      textColor: C.primary,
      fontStyle: "bold",
      fontSize: 8,
      lineColor: C.border,
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: C.background },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      4: { cellWidth: 24, halign: "center" },
    },
    didDrawPage: (data) => {
      const currentPage = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } })
        .internal.getCurrentPageInfo().pageNumber;
      drawPageFooter(
        doc,
        { schoolName: opts.schoolName, reportTitle },
        marginL,
        marginR,
        contentW,
        currentPage > 0 ? currentPage : data.pageNumber,
      );
    },
  });

  doc.save(`${fileBase}.pdf`);
}
