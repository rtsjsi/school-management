import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  C,
  drawFilterStrip,
  drawPageFooter,
  drawPdfHeader,
  drawSummaryCard,
} from "@/lib/pdf-theme";

export type SubjectsExportRow = {
  name: string;
  evaluationType: string;
  teacherName: string;
};

export type SubjectsPdfOptions = {
  schoolName?: string;
  subtitle?: string;
};

export function exportSubjectsPdf(
  rows: SubjectsExportRow[],
  fileBase: string,
  opts: SubjectsPdfOptions,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 12;
  const marginR = 12;
  const contentW = pageW - marginL - marginR;
  const reportTitle = "Subjects Report";

  let curY = drawPdfHeader(doc, { schoolName: opts.schoolName, reportTitle }, marginL, marginR, contentW);

  if (opts.subtitle?.trim()) {
    curY = drawFilterStrip(doc, opts.subtitle, curY, marginL, contentW);
  }

  const totalSubjects = rows.length;
  const gradeBased = rows.filter((r) => r.evaluationType === "Grade based").length;
  const markBased = rows.filter((r) => r.evaluationType === "Mark based").length;
  const assignedTeacher = rows.filter((r) => r.teacherName !== "—").length;

  const cardGap = 3;
  const totalCards = 4;
  const cardW = (contentW - cardGap * (totalCards - 1)) / totalCards;
  const cardH = 20;

  drawSummaryCard(
    doc, marginL, curY, cardW, cardH,
    "Total Subjects", String(totalSubjects),
    totalSubjects === 1 ? "subject" : "subjects",
    C.foreground,
  );

  drawSummaryCard(
    doc, marginL + (cardW + cardGap), curY, cardW, cardH,
    "Grade Based", String(gradeBased), null,
    C.primary,
  );

  drawSummaryCard(
    doc, marginL + (cardW + cardGap) * 2, curY, cardW, cardH,
    "Mark Based", String(markBased), null,
    C.primary,
  );

  drawSummaryCard(
    doc, marginL + (cardW + cardGap) * 3, curY, cardW, cardH,
    "Teacher Assigned", String(assignedTeacher), null,
    C.green600,
  );

  curY += cardH + 5;

  const body = rows.map((row, idx) => [
    String(idx + 1),
    row.name,
    row.evaluationType,
    row.teacherName,
  ]);

  autoTable(doc, {
    startY: curY,
    margin: { left: marginL, right: marginR },
    head: [["#", "Subject", "Evaluation Type", "Subject Teacher"]],
    body,
    foot: [[
      {
        content: `Total: ${totalSubjects} subject${totalSubjects !== 1 ? "s" : ""}`,
        colSpan: 4,
        styles: { halign: "left" as const, fontStyle: "bold" as const },
      },
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
