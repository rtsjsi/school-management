import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PeriodSlot } from "./timetable-generator";
import { formatTimeDisplay } from "./timetable-generator";
import { C, drawPdfHeader, drawFilterStrip, drawPageFooter } from "./pdf-theme";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type TimetablePdfOptions = {
  schoolName: string;
  standardName: string;
  academicYear?: string;
  classTeacher?: string;
};

export type TimetablePdfEntry = {
  day_of_week: number;
  period_number: number;
  subject_name: string;
};

/**
 * Export a class timetable as a PDF matching the sample layout.
 */
export function exportTimetablePdf(
  entries: TimetablePdfEntry[],
  slots: PeriodSlot[],
  options: TimetablePdfOptions,
  fileBaseName: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginL = 10;
  const marginR = 10;
  const contentW = pageWidth - marginL - marginR;

  // Header
  const reportTitle = "Class Time Table";
  let curY = drawPdfHeader(doc, { schoolName: options.schoolName, reportTitle }, marginL, marginR, contentW);

  // Subtitle strip
  const subtitleParts = [`Class: ${options.standardName}`];
  if (options.academicYear) subtitleParts.push(`Year: ${options.academicYear}`);
  if (options.classTeacher) subtitleParts.push(`Class Teacher: ${options.classTeacher}`);
  curY = drawFilterStrip(doc, subtitleParts.join("  ·  "), curY, marginL, contentW);

  // Build header row with time slots
  const headerRow: string[] = [options.standardName];

  // Identify break column indices for styling
  const breakColIndices: number[] = [];
  let colCounter = 1;

  for (const slot of slots) {
    if (slot.type === "period") {
      headerRow.push(`${formatTimeDisplay(slot.start)} to\n${formatTimeDisplay(slot.end)}`);
    } else {
      headerRow.push(`Break\n${formatTimeDisplay(slot.start)}\nto\n${formatTimeDisplay(slot.end)}`);
      breakColIndices.push(colCounter);
    }
    colCounter++;
  }

  // Determine which days have entries
  const daysInUse = new Set(entries.map((e) => e.day_of_week));
  const maxDay = Math.max(...Array.from(daysInUse), 5);

  // Build body rows
  const body: string[][] = [];
  for (let d = 1; d <= maxDay; d++) {
    const row: string[] = [DAY_LABELS[d - 1] || `Day ${d}`];
    for (const slot of slots) {
      if (slot.type === "period") {
        const entry = entries.find(
          (e) => e.day_of_week === d && e.period_number === slot.periodNumber
        );
        row.push(entry?.subject_name || "—");
      } else {
        // Break column - empty cell, styled via column styles
        row.push("");
      }
    }
    body.push(row);
  }

  autoTable(doc, {
    startY: curY,
    head: [headerRow],
    body: body,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      halign: "center",
      valign: "middle",
      lineWidth: 0.3,
      lineColor: [80, 80, 80],
    },
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    columnStyles: {
      0: { fontStyle: "bold", halign: "left", cellWidth: 18 },
      ...Object.fromEntries(
        breakColIndices.map((ci) => [
          ci,
          {
            cellWidth: 14,
            fillColor: C.muted as [number, number, number],
            fontStyle: "bold" as const,
            fontSize: 6,
          },
        ])
      ),
    },
    didParseCell: (data) => {
      // Style break columns in body
      if (breakColIndices.includes(data.column.index) && data.section === "body") {
        data.cell.styles.fillColor = C.muted;
      }
      // Style break column headers
      if (breakColIndices.includes(data.column.index) && data.section === "head") {
        data.cell.styles.fillColor = [180, 180, 180];
        data.cell.styles.textColor = [40, 40, 40];
        data.cell.styles.fontSize = 6;
      }
    },
    alternateRowStyles: {
      fillColor: C.background as [number, number, number],
    },
  });

  // Footer
  drawPageFooter(doc, { schoolName: options.schoolName, reportTitle }, marginL, marginR, contentW, 1);

  doc.save(`${fileBaseName}.pdf`);
}
