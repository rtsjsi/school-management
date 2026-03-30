import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
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

function totalAmount(rows: FeeReportExportRow[]): number {
  return rows.reduce((sum, r) => sum + Number(r.amount), 0);
}

/** One row in the fee collection Excel sheet (data, blank separator, or total). */
type FeeCollectionExcelRow = {
  Receipt: string;
  Student: string;
  Standard: string;
  Division: string;
  Roll: string | number;
  "GR No": string;
  Amount: string | number;
  Type: string;
  Quarter: string;
  "Academic year": string;
  Mode: string;
  Date: string;
  "Collected by": string;
};

const emptyExcelRow = (): FeeCollectionExcelRow => ({
  Receipt: "",
  Student: "",
  Standard: "",
  Division: "",
  Roll: "",
  "GR No": "",
  Amount: "",
  Type: "",
  Quarter: "",
  "Academic year": "",
  Mode: "",
  Date: "",
  "Collected by": "",
});

export function exportFeeCollectionExcel(rows: FeeReportExportRow[], fileBase: string): void {
  const sheetData: FeeCollectionExcelRow[] = rows.map((row) => ({
    Receipt: row.receipt_number,
    Student: row.student_name ?? "",
    Standard: row.student_standard ?? "",
    Division: row.student_division ?? "",
    Roll: row.student_roll_number ?? "",
    "GR No": row.student_gr_no ?? "",
    Amount: row.amount,
    Type: getFeeTypeLabel(row.fee_type),
    Quarter: `Q${row.quarter}`,
    "Academic year": row.academic_year,
    Mode: row.payment_mode,
    Date: formatFeeCollectionDisplayDate(row.collection_date, ""),
    "Collected by": row.collected_by ?? "",
  }));

  const total = totalAmount(rows);
  sheetData.push(emptyExcelRow());
  sheetData.push({
    ...emptyExcelRow(),
    Receipt: "Total amount",
    Amount: total,
  });

  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Collections");
  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}

export function exportFeeCollectionPdf(
  rows: FeeReportExportRow[],
  fileBase: string,
  opts: { schoolName?: string; subtitle?: string }
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text(opts.schoolName?.trim() || "Fee collection report", 14, 12);
  let startY = 18;
  if (opts.subtitle?.trim()) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(opts.subtitle.trim(), 14, 18);
    doc.setTextColor(0, 0, 0);
    startY = 24;
  }

  const tableFontSize = 7;

  const body = rows.map((row) => [
    row.receipt_number,
    String(row.student_name ?? "—").slice(0, 32),
    [row.student_standard, row.student_division].filter(Boolean).join(" ") || "—",
    String(row.amount),
    getFeeTypeLabel(row.fee_type),
    `Q${row.quarter}`,
    String(row.payment_mode),
    formatFeeCollectionDisplayDate(row.collection_date, ""),
    String(row.collected_by ?? "—").slice(0, 22),
  ]);

  const sum = totalAmount(rows);
  const foot: import("jspdf-autotable").RowInput[] = [
    [
      {
        content: `Total amount: ₹${sum.toLocaleString("en-IN")}`,
        colSpan: 9,
        styles: { halign: "right" },
      },
    ],
  ];

  autoTable(doc, {
    startY,
    head: [["Receipt", "Student", "Std / Div", "Amount", "Type", "Qtr", "Mode", "Date", "Collected by"]],
    body,
    foot,
    styles: {
      fontSize: tableFontSize,
      cellPadding: 1.5,
      font: "helvetica",
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: "bold",
      fontSize: tableFontSize,
      font: "helvetica",
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: tableFontSize,
      font: "helvetica",
      cellPadding: 1.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`${fileBase}.pdf`);
}
