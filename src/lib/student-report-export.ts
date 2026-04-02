import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  C,
  drawSummaryCard,
  drawPdfHeader,
  drawFilterStrip,
  drawPageFooter,
} from "@/lib/pdf-theme";

export type StudentExportRow = {
  gr_number?: string | null;
  full_name: string;
  standard?: string | null;
  division?: string | null;
  roll_number?: number | null;
  gender?: string | null;
  date_of_birth?: string | null;
  parent_name?: string | null;
  parent_contact?: string | null;
  status?: string | null;
  is_rte_quota?: boolean | null;
  [key: string]: unknown;
};

export type StudentPdfOptions = {
  schoolName?: string;
  subtitle?: string;
};

export function exportStudentsPdf(
  rows: StudentExportRow[],
  fileBase: string,
  opts: StudentPdfOptions,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 12;
  const marginR = 12;
  const contentW = pageW - marginL - marginR;
  const reportTitle = "Student Data Report";

  let curY = drawPdfHeader(
    doc,
    { schoolName: opts.schoolName, reportTitle },
    marginL,
    marginR,
    contentW,
  );

  if (opts.subtitle?.trim()) {
    curY = drawFilterStrip(doc, opts.subtitle, curY, marginL, contentW);
  }

  const totalStudents = rows.length;
  const rteCount = rows.filter((r) => r.is_rte_quota).length;
  const maleCount = rows.filter((r) => (r.gender ?? "").toLowerCase() === "male").length;
  const femaleCount = rows.filter((r) => (r.gender ?? "").toLowerCase() === "female").length;

  const cardGap = 3;
  const totalCards = 4;
  const cardW = (contentW - cardGap * (totalCards - 1)) / totalCards;
  const cardH = 20;

  drawSummaryCard(
    doc, marginL, curY, cardW, cardH,
    "Total Students", String(totalStudents),
    totalStudents === 1 ? "student" : "students",
    C.foreground,
  );

  drawSummaryCard(
    doc, marginL + (cardW + cardGap), curY, cardW, cardH,
    "Male", String(maleCount), null,
    C.primary,
  );

  drawSummaryCard(
    doc, marginL + (cardW + cardGap) * 2, curY, cardW, cardH,
    "Female", String(femaleCount), null,
    C.primary,
  );

  drawSummaryCard(
    doc, marginL + (cardW + cardGap) * 3, curY, cardW, cardH,
    "RTE Students", String(rteCount), null,
    C.green600,
  );

  curY += cardH + 5;

  const body = rows.map((row, idx) => [
    String(idx + 1),
    row.gr_number ?? "—",
    String(row.full_name).slice(0, 30),
    row.standard ?? "—",
    row.division ?? "—",
    row.roll_number != null ? String(row.roll_number) : "—",
    row.gender ?? "—",
    row.date_of_birth
      ? new Date(row.date_of_birth + "T12:00:00").toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—",
    row.parent_name ?? "—",
    row.parent_contact ?? "—",
    row.is_rte_quota ? "Yes" : "No",
    (row.status ?? "active").charAt(0).toUpperCase() + (row.status ?? "active").slice(1),
  ]);

  autoTable(doc, {
    startY: curY,
    margin: { left: marginL, right: marginR },
    head: [
      ["#", "GR No.", "Student Name", "Std", "Div", "Roll", "Gender", "DOB", "Parent / Guardian", "Contact", "RTE", "Status"],
    ],
    body,
    foot: [
      [
        {
          content: `Total: ${totalStudents} student${totalStudents !== 1 ? "s" : ""}`,
          colSpan: 12,
          styles: { halign: "left" as const, fontStyle: "bold" as const, fontSize: 8 },
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
    alternateRowStyles: { fillColor: C.background },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 16 },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 10, halign: "center" },
      5: { cellWidth: 10, halign: "center" },
      6: { cellWidth: 14, halign: "center" },
      7: { cellWidth: 20, halign: "center" },
      10: { cellWidth: 10, halign: "center" },
      11: { cellWidth: 16, halign: "center" },
    },
    didDrawPage: (data) => {
      const currentPage = (
        doc as unknown as {
          internal: {
            getCurrentPageInfo: () => { pageNumber: number };
          };
        }
      ).internal.getCurrentPageInfo().pageNumber;
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
