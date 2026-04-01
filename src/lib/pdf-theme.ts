import { jsPDF } from "jspdf";

/**
 * Shared colour palette and drawing helpers for all report PDFs.
 * RGB values are derived from the app's HSL theme in globals.css.
 */

export type RGB = [number, number, number];

export const C = {
  primary:      [31, 63, 122]   as RGB,   // hsl(210 59% 30%)
  white:        [255, 255, 255] as RGB,
  foreground:   [17, 20, 25]    as RGB,   // hsl(210 25% 9%)
  mutedFg:      [90, 97, 107]   as RGB,   // hsl(210 12% 40%)
  border:       [221, 226, 233] as RGB,   // hsl(210 16% 90%)
  background:   [247, 249, 252] as RGB,   // hsl(210 20% 98%)
  secondary:    [237, 241, 245] as RGB,   // hsl(210 18% 94%)
  muted:        [239, 242, 246] as RGB,   // hsl(210 16% 95%)
  accent:       [225, 232, 240] as RGB,   // hsl(210 30% 94%)
  green600:     [22, 163, 74]   as RGB,   // tailwind green-600
  destructive:  [220, 38, 38]   as RGB,   // hsl(0 84% 60%) — app destructive
};

export function fmtINR(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

export function drawRoundedRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number, r: number,
  fill: RGB,
  stroke?: RGB,
) {
  if (stroke) {
    doc.setDrawColor(...stroke);
    doc.setLineWidth(0.3);
  }
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, r, r, stroke ? "FD" : "F");
}

export function drawSummaryCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string,
  value: string,
  sub: string | null,
  valueColor: RGB,
) {
  drawRoundedRect(doc, x, y, w, h, 2, C.white, C.border);

  doc.setFontSize(7);
  doc.setTextColor(...C.mutedFg);
  doc.setFont("helvetica", "normal");
  doc.text(label, x + 4, y + 6);

  doc.setFontSize(12);
  doc.setTextColor(...valueColor);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 4, y + 13.5);

  if (sub) {
    doc.setFontSize(7);
    doc.setTextColor(...C.mutedFg);
    doc.setFont("helvetica", "normal");
    doc.text(sub, x + 4, y + 18);
  }
}

export function drawPdfHeader(
  doc: jsPDF,
  opts: { schoolName?: string; reportTitle: string },
  marginL: number, marginR: number, contentW: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  let curY = 10;

  drawRoundedRect(doc, marginL, curY, contentW, 14, 2, C.primary);

  doc.setFontSize(13);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.text(opts.schoolName?.trim() || opts.reportTitle, marginL + 5, curY + 6);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(opts.reportTitle, marginL + 5, curY + 11);

  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
  doc.setFontSize(7.5);
  doc.text(`Generated: ${dateStr}`, pageW - marginR - 5, curY + 6, { align: "right" });

  curY += 18;
  return curY;
}

export function drawFilterStrip(
  doc: jsPDF,
  subtitle: string,
  curY: number,
  marginL: number, contentW: number,
): number {
  if (!subtitle.trim()) return curY;
  drawRoundedRect(doc, marginL, curY, contentW, 7.5, 1.5, C.secondary, C.border);
  doc.setFontSize(7.5);
  doc.setTextColor(...C.mutedFg);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle.trim(), marginL + 4, curY + 5);
  return curY + 10;
}

export function drawPageFooter(
  doc: jsPDF,
  opts: { schoolName?: string; reportTitle: string },
  marginL: number, marginR: number, contentW: number,
  pageNumber: number,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();

  const lineY = pageH - 9;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(marginL, lineY, pageW - marginR, lineY);

  doc.setFontSize(7);
  doc.setTextColor(...C.mutedFg);
  doc.setFont("helvetica", "normal");
  doc.text(opts.schoolName?.trim() || opts.reportTitle, marginL, pageH - 6);
  doc.text(`Page ${pageNumber} of ${pageCount}`, pageW - marginR, pageH - 6, { align: "right" });

  if (pageNumber > 1) {
    drawRoundedRect(doc, marginL, 4, contentW, 7.5, 1.5, C.secondary);
    doc.setFontSize(7);
    doc.setTextColor(...C.mutedFg);
    doc.text(
      `${opts.schoolName?.trim() || opts.reportTitle}  —  ${opts.reportTitle} (continued)`,
      marginL + 4,
      9,
    );
  }
}
