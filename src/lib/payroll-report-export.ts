import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  C,
  drawPdfHeader,
  drawFilterStrip,
  drawPageFooter,
  drawSummaryCard,
} from "@/lib/pdf-theme";

export type PayrollPdfColumn = { key: string; header: string; width?: number };

export function exportPayrollReportPdf(opts: {
  title: string;
  schoolName?: string;
  subtitle?: string;
  fileBase: string;
  columns: PayrollPdfColumn[];
  rows: Record<string, unknown>[];
  summary?: { label: string; value: string }[];
}): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 10;
  const marginR = 10;
  const contentW = pageW - marginL - marginR;

  let curY = drawPdfHeader(
    doc,
    { schoolName: opts.schoolName, reportTitle: opts.title },
    marginL,
    marginR,
    contentW
  );

  if (opts.subtitle?.trim()) {
    curY = drawFilterStrip(doc, opts.subtitle, curY, marginL, contentW);
  }

  const cards = opts.summary?.slice(0, 4) ?? [];
  if (cards.length > 0) {
    const gap = 3;
    const cardW = (contentW - gap * (cards.length - 1)) / cards.length;
    const cardH = 18;
    cards.forEach((c, i) => {
      drawSummaryCard(
        doc,
        marginL + i * (cardW + gap),
        curY,
        cardW,
        cardH,
        c.label,
        c.value,
        null,
        C.primary
      );
    });
    curY += cardH + 6;
  }

  autoTable(doc, {
    startY: curY,
    head: [opts.columns.map((c) => c.header)],
    body: opts.rows.map((row) =>
      opts.columns.map((c) => {
        const v = row[c.key];
        if (v == null || v === "") return "—";
        if (typeof v === "number") {
          return Number.isInteger(v) ? String(v) : v.toFixed(1);
        }
        return String(v);
      })
    ),
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: C.primary, fontSize: 7.5, textColor: C.white },
    margin: { left: marginL, right: marginR },
    didDrawPage: (data) => {
      drawPageFooter(
        doc,
        { schoolName: opts.schoolName, reportTitle: opts.title },
        marginL,
        marginR,
        contentW,
        data.pageNumber
      );
    },
  });

  doc.save(`${opts.fileBase}.pdf`);
}

export async function exportPayrollReportExcel(opts: {
  sheetName: string;
  fileBase: string;
  columns: PayrollPdfColumn[];
  rows: Record<string, unknown>[];
}): Promise<void> {
  const XLSX = await import("xlsx");
  const exportRows = opts.rows.map((row) => {
    const out: Record<string, string | number> = {};
    for (const col of opts.columns) {
      const v = row[col.key];
      if (v == null || v === "") out[col.header] = "—";
      else if (typeof v === "number") out[col.header] = v;
      else out[col.header] = String(v);
    }
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(exportRows);
  ws["!cols"] = opts.columns.map((c) => ({ wch: c.width ?? 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName.slice(0, 31));
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.fileBase}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
