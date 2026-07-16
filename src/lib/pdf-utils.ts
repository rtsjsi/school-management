import type { jsPDF } from "jspdf";

/** Standard PDF layout constants (mm) - prevents overlap, consistent spacing */
export const PDF_LAYOUT = {
  margin: 20,
  /** Line height for body text */
  lineHeight: 6.5,
  /** Line height for small text */
  lineHeightSmall: 5.5,
  /** Gap after section headers */
  sectionGap: 10,
  /** Gap between major blocks */
  blockGap: 12,
  /** Label column width */
  labelWidth: 44,
  /** Value column max width for wrapping */
  valueMaxWidth: 75,
  /** Full width for centered/wrapped text */
  contentWidth: 170,
  /** Font sizes */
  fontSizeTitle: 18,
  fontSizeSubtitle: 10,
  fontSizeHeading: 14,
  fontSizeBody: 10,
  fontSizeSmall: 9,
} as const;

/**
 * Draw text with wrapping. Returns final y position.
 */
export function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight?: number
): number {
  const lh = lineHeight ?? PDF_LAYOUT.lineHeight;
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  lines.forEach((line: string) => {
    doc.text(line, x, y);
    y += lh;
  });
  return y;
}

/**
 * Fetch an image URL and convert it to a base64 data-URL suitable for jsPDF.addImage().
 * Returns null on any failure so callers can gracefully degrade.
 */
export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
