import { jsPDF } from "jspdf";
import { PDF_LAYOUT, urlToDataUrl } from "./pdf-utils";
import { calculatePercentage } from "./grade-utils";

// ── Design Tokens ──────────────────────────────────────────────────────────
const COLORS = {
  navy: [26, 54, 93] as [number, number, number],        // #1a365d – primary header bg
  navyLight: [44, 82, 130] as [number, number, number],   // #2c5282 – accent / banner
  gold: [196, 167, 91] as [number, number, number],       // #c4a75b – accent stripe
  white: [255, 255, 255] as [number, number, number],
  offWhite: [248, 249, 250] as [number, number, number],  // #f8f9fa – alt row
  lightGray: [241, 243, 245] as [number, number, number], // #f1f3f5 – info box bg
  midGray: [206, 212, 218] as [number, number, number],   // #ced4da – borders
  darkText: [33, 37, 41] as [number, number, number],     // #212529
  mutedText: [108, 117, 125] as [number, number, number], // #6c757d
  // Term / annual cards: match the red letterhead on the pre-printed sheet
  brand: [156, 33, 43] as [number, number, number],       // #9c212b
  brandLight: [200, 120, 126] as [number, number, number], // lighter red for header dividers
};

const LOGO_SIZE = 16; // mm

/**
 * Term 1, Term 2, and annual cards print on pre-printed A4 stock.
 * The letterhead occupies the top 5 cm, so student content starts at 50 mm.
 * Everything below that must finish on the same sheet.
 */
const PREPRINTED_CONTENT_TOP = 50;
const PAGE_CONTENT_BOTTOM = 291;
/** Space above each section heading (mm) — kept small. */
const HEADING_TOP_GAP = 0;
/** Space between a section heading and the content under it (mm). */
const HEADING_BOTTOM_GAP = 2;
/** Space between the grade scale line and the co-scholastic table (mm). */
const SCALE_BOTTOM_GAP = 1.5;

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface ReportCardSubject {
  subjectName: string;
  maxScore: number;
  score: number | null;
  grade?: string | null;
  isAbsent: boolean;
}

export interface ReportCardData {
  schoolName?: string;
  schoolAddress?: string;
  schoolLogoUrl?: string;
  principalSignatureUrl?: string;
  studentName: string;
  standard?: string;
  division?: string;
  rollNumber?: number | string;
  studentId?: string;
  academicYear?: string;
  examName: string;
  examType?: string;
  heldAt?: string;
  subjects: ReportCardSubject[];
}

export interface MultiExamReportCardSubject {
  subjectName: string;
  exams: {
    examId: string;
    score: number | null;
    maxScore: number;
    grade?: string | null;
    isAbsent: boolean;
    isGradeBased: boolean;
  }[];
  totalScore: number | null;
  totalMax: number;
  finalGrade?: string | null;
}

export type MultiExamReportKind = "term-1" | "term-2" | "annual";

export interface TermReportMetrics {
  height: string | null;
  weight: string | null;
  workingDays: number | null;
  presentDays: number | null;
}

export interface MultiExamReportCardData {
  schoolName?: string;
  schoolAddress?: string;
  schoolLogoUrl?: string;
  principalSignatureUrl?: string;
  studentName: string;
  standard?: string;
  division?: string;
  rollNumber?: number | string;
  studentId?: string;
  academicYear?: string;
  reportTitle: string;
  reportKind: MultiExamReportKind;
  termMetrics: {
    "Term-1": TermReportMetrics;
    "Term-2": TermReportMetrics;
  };
  exams: {
    id: string;
    name: string;
    term?: string | null;
  }[];
  subjects: MultiExamReportCardSubject[];
}

// ── Helper: draw page border ────────────────────────────────────────────────

function drawPageBorder(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const m = 8;
  doc.setDrawColor(...COLORS.navy);
  doc.setLineWidth(0.6);
  doc.rect(m, m, w - m * 2, h - m * 2);
  // Inner line
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.3);
  doc.rect(m + 2, m + 2, w - m * 2 - 4, h - m * 2 - 4);
}

// ── Helper: draw header with logo ───────────────────────────────────────────

async function drawHeader(
  doc: jsPDF,
  schoolName: string,
  schoolAddress: string,
  title: string,
  logoUrl?: string
): Promise<number> {
  const w = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = w - margin * 2;
  let y = 18;

  // Try to load logo
  const logoDataUrl = logoUrl ? await urlToDataUrl(logoUrl) : null;

  // ── School Name Row ──
  const textStartX = logoDataUrl ? margin + LOGO_SIZE + 6 : w / 2;
  const textAlign = logoDataUrl ? "left" : "center";

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin + 2, y - 4, LOGO_SIZE, LOGO_SIZE);
    } catch {
      // Graceful degradation — continue without logo
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.navy);

  if (logoDataUrl) {
    // Left-aligned beside logo
    doc.text(schoolName.toUpperCase(), textStartX, y, { align: textAlign as any });
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.mutedText);
    const addrLines = doc.splitTextToSize(schoolAddress, contentW - LOGO_SIZE - 10);
    addrLines.forEach((line: string) => {
      doc.text(line, textStartX, y);
      y += 4;
    });
  } else {
    // Centered (no logo)
    doc.text(schoolName.toUpperCase(), w / 2, y, { align: "center" });
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.mutedText);
    const addrLines = doc.splitTextToSize(schoolAddress, contentW);
    addrLines.forEach((line: string) => {
      doc.text(line, w / 2, y, { align: "center" });
      y += 4;
    });
  }

  // Ensure y is below logo
  y = Math.max(y, 18 + LOGO_SIZE - 2);
  y += 3;

  // ── Gold accent stripe ──
  doc.setFillColor(...COLORS.gold);
  doc.rect(margin, y, contentW, 1, "F");
  y += 4;

  // ── Title banner ──
  const bannerH = 9;
  doc.setFillColor(...COLORS.navy);
  doc.rect(margin, y, contentW, bannerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.white);
  doc.text(title.toUpperCase(), w / 2, y + bannerH / 2 + 1.5, { align: "center" });
  y += bannerH + 5;

  return y;
}

// ── Helper: draw student info box ───────────────────────────────────────────

function drawStudentInfo(
  doc: jsPDF,
  y: number,
  data: {
    studentName: string;
    standard?: string;
    division?: string;
    rollNumber?: number | string;
    studentId?: string;
    academicYear?: string;
    examInfo?: string;
    examLabel?: string;
    plainBox?: boolean;
  }
): number {
  const w = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = w - margin * 2;
  const lh = 6;
  const padX = 5;
  const padY = 4;
  const colLeft = margin + padX;
  const colRight = w / 2 + 12;
  const labelW = 32;
  const nameMaxW = Math.max(20, colRight - colLeft - labelW - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const nameLines = doc.splitTextToSize(data.studentName || "—", nameMaxW) as string[];
  const nameRows = Math.max(1, nameLines.length);
  const rows = nameRows + 2 + (data.examInfo ? 1 : 0);
  const boxH = padY * 2 + rows * lh + 2;

  // Box: filled on plain cards, outline only on pre-printed paper (keeps the watermark visible)
  doc.setDrawColor(...(data.plainBox ? COLORS.brand : COLORS.midGray));
  doc.setLineWidth(data.plainBox ? 0.35 : 0.2);
  if (data.plainBox) {
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, "S");
  } else {
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");
  }

  let iy = y + padY + lh;
  const colLeftUsed = colLeft;
  const colRightUsed = colRight;

  doc.setFontSize(9);

  // Row 1: Name / Standard
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Name", colLeftUsed, iy);
  doc.text(":", colLeftUsed + 20, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  nameLines.forEach((line: string, i: number) => {
    doc.text(line, colLeftUsed + labelW, iy + i * lh);
  });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Standard", colRight, iy);
  doc.text(":", colRight + 20, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  doc.text(data.standard ?? "—", colRight + labelW, iy);
  iy += Math.max(lh * nameLines.length, lh);

  // Row 2: Division / Roll No
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Division", colLeft, iy);
  doc.text(":", colLeft + 20, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  doc.text(data.division ?? "—", colLeft + labelW, iy);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Roll No.", colRight, iy);
  doc.text(":", colRight + 20, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.rollNumber ?? "—"), colRight + labelW, iy);
  iy += lh;

  // Row 3: GR No / Academic Year
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("GR No.", colLeft, iy);
  doc.text(":", colLeft + 20, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  doc.text(data.studentId ?? "—", colLeft + labelW, iy);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Year", colRight, iy);
  doc.text(":", colRight + 20, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  doc.text(data.academicYear ?? "—", colRight + labelW, iy);
  iy += lh;

  // Row 4: Exam info (optional)
  if (data.examInfo) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.mutedText);
    doc.text(data.examLabel ?? "Exam", colLeft, iy);
    doc.text(":", colLeft + 20, iy);
    doc.setTextColor(...COLORS.darkText);
    doc.setFont("helvetica", "normal");
    const examLines = doc.splitTextToSize(data.examInfo, contentW - padX * 2 - labelW);
    examLines.forEach((line: string, i: number) => {
      doc.text(line, colLeft + labelW, iy + i * lh);
    });
    iy += Math.max(lh * examLines.length, lh);
  }

  return y + boxH + 5;
}

// ── Helper: draw footer ─────────────────────────────────────────────────────

function drawFooter(doc: jsPDF, academicYear?: string) {
  // Removed "Generated on" and "Academic Year:" from footer as per user request
}

// ── Helper: draw signature section ──────────────────────────────────────────

async function drawSignatures(
  doc: jsPDF,
  y: number,
  principalSigUrl?: string,
  layout?: { margin: number; before: number; after: number; maxH: number }
): Promise<number> {
  const w = doc.internal.pageSize.getWidth();
  const margin = layout?.margin ?? 14;
  const before = layout?.before ?? 8;
  const maxH = layout?.maxH ?? 16;
  const tail = layout?.after ?? 10;

  y += before;

  // Try to load principal signature
  const sigDataUrl = principalSigUrl ? await urlToDataUrl(principalSigUrl) : null;

  if (sigDataUrl) {
    try {
      const img = await new Promise<HTMLImageElement | null>((resolve) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => resolve(null);
        el.src = sigDataUrl;
      });
      const maxW = 38;
      let drawW = 30;
      let drawH = Math.min(12, maxH);
      if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const aspect = img.naturalWidth / img.naturalHeight;
        drawW = maxH * aspect;
        drawH = maxH;
        if (drawW > maxW) {
          drawW = maxW;
          drawH = maxW / aspect;
        }
      }
      const format = sigDataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
      const principalLineCenter = w - margin - 35;
      doc.addImage(
        sigDataUrl,
        format,
        principalLineCenter - drawW / 2,
        y - drawH - 1,
        drawW,
        drawH
      );
    } catch {
      // Graceful degradation
    }
  }

  // Signature lines
  doc.setDrawColor(...COLORS.midGray);
  doc.setLineWidth(0.3);
  doc.line(margin + 10, y, margin + 60, y);
  doc.line(w - margin - 60, y, w - margin - 10, y);
  const labelGap = Math.min(4, tail);
  y += labelGap;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Class Teacher", margin + 35, y, { align: "center" });
  doc.text("Principal", w - margin - 35, y, { align: "center" });

  return y + (tail - labelGap);
}

// ══════════════════════════════════════════════════════════════════════════
// SINGLE EXAM REPORT CARD
// ══════════════════════════════════════════════════════════════════════════

async function renderSingleExamReportCard(
  doc: jsPDF,
  data: ReportCardData,
  options?: { newPage?: boolean }
): Promise<void> {
  if (options?.newPage) {
    doc.addPage();
  }

  const w = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = w - margin * 2;

  drawPageBorder(doc);

  const schoolName = (data.schoolName ?? "SCHOOL NAME") + " - GU033";
  const schoolAddress = "Affiliated to CISCE (ICSE / ISC).\n" + (data.schoolAddress ?? "Address");

  let y = await drawHeader(doc, schoolName, schoolAddress, "REPORT CARD", data.schoolLogoUrl);

  // ── Exam info string ──
  const examInfo = [
    data.examName,
    data.examType,
    data.heldAt ? new Date(data.heldAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
  ]
    .filter(Boolean)
    .join(" – ");

  y = drawStudentInfo(doc, y, {
    studentName: data.studentName,
    standard: data.standard,
    division: data.division,
    rollNumber: data.rollNumber,
    studentId: data.studentId,
    academicYear: data.academicYear,
    examInfo,
  });

  // ── Calculate totals ──
  const marksForCalc = data.subjects.map((sub) => ({
    score: sub.score,
    maxScore: sub.maxScore,
    isAbsent: sub.isAbsent,
    isGradeBased: sub.maxScore === 0 && sub.grade !== undefined,
  }));
  const { totalObtained, totalMax, percentage } = calculatePercentage(marksForCalc);

  // ── Marks Table ──
  const colSubject = margin;
  const colMax = w - margin - 50;
  const colMarks = w - margin - 25;
  const colGrade = w - margin;
  const rowH = 7;
  const headerH = 8;
  const hasGrades = data.subjects.some((s) => s.grade != null);

  // Table header
  doc.setFillColor(...COLORS.navy);
  doc.rect(margin, y, contentW, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text("Subject", colSubject + 4, y + headerH / 2 + 1.2);
  doc.text("Max. Marks", colMax, y + headerH / 2 + 1.2, { align: "center" });
  doc.text("Marks Obt.", colMarks, y + headerH / 2 + 1.2, { align: "center" });
  if (hasGrades) {
    doc.text("Grade", colGrade - 4, y + headerH / 2 + 1.2, { align: "center" });
  }
  y += headerH;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (let i = 0; i < data.subjects.length; i++) {
    const sub = data.subjects[i];
    const isAlt = i % 2 === 0;

    // Measure multi-line subject name
    const subjectMaxW = colMax - colSubject - 20;
    const subLines = doc.splitTextToSize(sub.subjectName, subjectMaxW);
    const thisRowH = Math.max(rowH, subLines.length * 5 + 2);

    // Row background
    if (isAlt) {
      doc.setFillColor(...COLORS.offWhite);
      doc.rect(margin, y, contentW, thisRowH, "F");
    }

    // Row border bottom
    doc.setDrawColor(...COLORS.midGray);
    doc.setLineWidth(0.15);
    doc.line(margin, y + thisRowH, w - margin, y + thisRowH);

    // Subject name
    doc.setTextColor(...COLORS.darkText);
    subLines.forEach((line: string, li: number) => {
      doc.text(line, colSubject + 4, y + 4 + li * 5);
    });

    // Max score
    doc.text(sub.maxScore > 0 ? String(sub.maxScore) : "—", colMax, y + 4, { align: "center" });

    // Obtained marks
    const displayMarks = sub.isAbsent
      ? "AB"
      : sub.score != null
        ? String(sub.score)
        : "—";

    if (sub.isAbsent) {
      doc.setTextColor(220, 53, 69); // red for absent
    } else {
      doc.setTextColor(...COLORS.darkText);
    }
    doc.text(displayMarks, colMarks, y + 4, { align: "center" });

    // Grade
    if (hasGrades) {
      doc.setTextColor(...COLORS.navyLight);
      doc.text(sub.grade ?? "—", colGrade - 4, y + 4, { align: "center" });
    }

    doc.setTextColor(...COLORS.darkText);
    y += thisRowH;
  }

  // ── Total row ──
  doc.setFillColor(...COLORS.navy);
  const totalRowH = 8;
  doc.rect(margin, y, contentW, totalRowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text("TOTAL", colSubject + 4, y + totalRowH / 2 + 1.2);
  doc.text(String(totalMax), colMax, y + totalRowH / 2 + 1.2, { align: "center" });
  doc.text(String(totalObtained), colMarks, y + totalRowH / 2 + 1.2, { align: "center" });
  y += totalRowH + 6;

  // ── Percentage / Result box ──
  const resultH = 10;
  doc.setFillColor(...COLORS.lightGray);
  doc.setDrawColor(...COLORS.midGray);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, contentW, resultH, 2, 2, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.navy);
  const pctText = percentage !== "—" ? `${percentage}%` : "—";
  doc.text(`Percentage: ${pctText}`, margin + 6, y + resultH / 2 + 1.5);

  // Removed performance label as per user request

  y += resultH + 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Remarks ____________________________________________________________________", margin + 6, y);
  y += 4;

  // ── Signatures ──
  await drawSignatures(doc, y, data.principalSignatureUrl);

  // ── Footer ──
  drawFooter(doc, data.academicYear);
}

export async function generateReportCardPDF(data: ReportCardData): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await renderSingleExamReportCard(doc, data);
  return doc.output("blob");
}

export async function generateClassReportCardPDF(students: ReportCardData[]): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  for (let i = 0; i < students.length; i++) {
    await renderSingleExamReportCard(doc, students[i], { newPage: i > 0 });
  }
  return doc.output("blob");
}

// ══════════════════════════════════════════════════════════════════════════
// MULTI-EXAM REPORT CARD
// ══════════════════════════════════════════════════════════════════════════

function isGradeSubject(subject: MultiExamReportCardSubject): boolean {
  return subject.exams.some((exam) => exam.isGradeBased);
}

type ReportRhythm = {
  margin: number;
  headingH: number;
  headingFont: number;
  scaleH: number;
  scaleFont: number;
  subjectColW: number;
  totalColW: number;
  rowH: number;
  rowFont: number;
  headerFont: number;
  headerLine: number;
  blockGap: number;
  remarksH: number;
  remarksFont: number;
  signatureBefore: number;
  signatureAfter: number;
};

function baseRhythm(): ReportRhythm {
  return {
    margin: 14,
    headingH: 5.2,
    headingFont: 9.5,
    scaleH: 4,
    scaleFont: 7,
    subjectColW: 40,
    totalColW: 18,
    rowH: 5.2,
    rowFont: 7.5,
    headerFont: 7,
    headerLine: 3.1,
    blockGap: 2.6,
    remarksH: 9,
    remarksFont: 8.5,
    signatureBefore: 12,
    signatureAfter: 7,
  };
}

function scaleRhythm(base: ReportRhythm, factor: number): ReportRhythm {
  const s = (n: number) => Math.round(n * factor * 10) / 10;
  const font = (n: number, min: number) => Math.max(min, s(n));
  return {
    ...base,
    headingH: Math.max(4, s(base.headingH)),
    headingFont: font(base.headingFont, 8),
    scaleH: Math.max(3.2, s(base.scaleH)),
    scaleFont: font(base.scaleFont, 6),
    rowH: Math.max(3.6, s(base.rowH)),
    rowFont: font(base.rowFont, 6),
    headerFont: font(base.headerFont, 5.5),
    headerLine: Math.max(2.4, s(base.headerLine)),
    blockGap: Math.max(1.2, s(base.blockGap)),
    remarksH: Math.max(7, s(base.remarksH)),
    remarksFont: font(base.remarksFont, 7),
    signatureBefore: Math.max(9, s(base.signatureBefore)),
    signatureAfter: Math.max(5, s(base.signatureAfter)),
  };
}

function textWidth(doc: jsPDF, text: string, font: "bold" | "normal", size: number) {
  doc.setFont("helvetica", font);
  doc.setFontSize(size);
  return doc.getTextWidth(text);
}

function tableColumns(
  doc: jsPDF,
  examNames: string[],
  subjectNames: string[],
  mode: "marks" | "grades",
  rhythm: ReportRhythm,
  boxW?: number
) {
  const w = doc.internal.pageSize.getWidth();
  const pageContentW = w - rhythm.margin * 2;
  const examCount = Math.max(examNames.length, 1);

  if (mode === "grades" && boxW) {
    const widestExam = Math.max(
      ...examNames.map((name) => textWidth(doc, name, "bold", rhythm.headerFont)),
      textWidth(doc, "100", "bold", rhythm.rowFont),
      0
    );
    const examColW = Math.max(widestExam + 6, examCount === 1 ? 24 : 18);
    const subjectColW = Math.max(24, boxW - examColW * examCount);
    return { w, contentW: boxW, subjectColW, examColW: (boxW - subjectColW) / examCount, totalColW: 0 };
  }

  if (mode === "grades") {
    const widestSubject = Math.max(
      textWidth(doc, "Subject", "bold", rhythm.headerFont),
      ...subjectNames.map((name) => textWidth(doc, name, "normal", rhythm.rowFont)),
      0
    );
    const widestExam = Math.max(
      ...examNames.map((name) => textWidth(doc, name, "bold", rhythm.headerFont)),
      textWidth(doc, "100", "bold", rhythm.rowFont),
      0
    );
    let subjectColW = widestSubject + 6;
    let examColW = widestExam + 6;
    let contentW = subjectColW + examColW * examCount;
    if (contentW > pageContentW) {
      subjectColW = Math.max(28, subjectColW - (contentW - pageContentW));
      contentW = subjectColW + examColW * examCount;
      if (contentW > pageContentW) {
        examColW = (pageContentW - subjectColW) / examCount;
        contentW = pageContentW;
      }
    }
    return { w, contentW, subjectColW, examColW, totalColW: 0 };
  }

  const totalColW = rhythm.totalColW;
  const subjectColW = Math.min(rhythm.subjectColW, Math.max(32, pageContentW - totalColW - examCount * 12));
  const examColW = (pageContentW - subjectColW - totalColW) / examCount;
  return { w, contentW: pageContentW, subjectColW, examColW, totalColW };
}

function examHeaderLayout(doc: jsPDF, names: string[], examColW: number, rhythm: ReportRhythm) {
  const width = Math.max(examColW - 1.8, 6);
  let font = rhythm.headerFont;
  const wrap = (size: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    return names.map((name) => doc.splitTextToSize(name, width) as string[]);
  };
  let lines = wrap(font);
  let maxLines = Math.max(1, ...lines.map((entry) => entry.length));
  while (maxLines > 1 && font > 6) {
    font = Math.round((font - 0.5) * 10) / 10;
    lines = wrap(font);
    maxLines = Math.max(1, ...lines.map((entry) => entry.length));
  }
  const lineH = Math.max(2.4, rhythm.headerLine * (font / rhythm.headerFont));
  const headerH = Math.max(rhythm.rowH, maxLines * lineH + 1.4);
  return { font, lineH, headerH, lines };
}

function subjectRowHeight(doc: jsPDF, name: string, subjectColW: number, rhythm: ReportRhythm) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(rhythm.rowFont);
  const lines = doc.splitTextToSize(name, Math.max(subjectColW - 4, 8)) as string[];
  if (lines.length <= 1) return rhythm.rowH;
  return Math.max(rhythm.rowH, lines.length * (rhythm.rowFont * 0.42) + 1.2);
}

function tableBlockHeight(
  doc: jsPDF,
  examNames: string[],
  subjectNames: string[],
  mode: "marks" | "grades",
  rhythm: ReportRhythm,
  boxW?: number
) {
  const cols = tableColumns(doc, examNames, subjectNames, mode, rhythm, boxW);
  const header = examHeaderLayout(doc, examNames, cols.examColW, rhythm);
  const rows = subjectNames.reduce((sum, name) => sum + subjectRowHeight(doc, name, cols.subjectColW, rhythm), 0);
  const summary = mode === "marks" ? rhythm.rowH * 2 : 0;
  return header.headerH + rows + summary;
}

function drawMultiExamSubjectTable(
  doc: jsPDF,
  startY: number,
  exams: { id: string; name: string }[],
  subjects: MultiExamReportCardSubject[],
  mode: "marks" | "grades",
  rhythm: ReportRhythm,
  box?: { x: number; width: number }
): { y: number; grandTotalObtained: number; grandTotalMax: number } {
  const { contentW, subjectColW, examColW, totalColW } = tableColumns(
    doc,
    exams.map((exam) => exam.name),
    subjects.map((subject) => subject.subjectName),
    mode,
    rhythm,
    box?.width
  );
  const margin = box?.x ?? rhythm.margin;
  const showTotal = mode === "marks" && totalColW > 0;

  // Marks text size: shrink only when the widest "score/max" would not fit its column.
  let cellFont = rhythm.rowFont;
  if (mode === "marks") {
    let widest = 0;
    for (const sub of subjects) {
      for (const entry of sub.exams) {
        if (entry.score === null) continue;
        widest = Math.max(widest, textWidth(doc, `${entry.score}/${entry.maxScore}`, "bold", rhythm.rowFont));
      }
    }
    const room = examColW - 2;
    if (widest > room && widest > 0) {
      cellFont = Math.max(5.5, Math.round(((rhythm.rowFont * room) / widest) * 4) / 4);
    }
  }
  const header = examHeaderLayout(doc, exams.map((exam) => exam.name), examColW, rhythm);
  const headerH = header.headerH;

  const drawHeader = (y: number) => {
    doc.setFillColor(...COLORS.brand);
    doc.rect(margin, y, contentW, headerH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(header.font);
    doc.setTextColor(...COLORS.white);

    let hx = margin;
    doc.text("Subject", hx + 3, y + headerH / 2 + 0.8);
    hx += subjectColW;

    doc.setDrawColor(...COLORS.brandLight);
    doc.setLineWidth(0.2);
    exams.forEach((_ex, examIndex) => {
      doc.line(hx, y, hx, y + headerH);
      const exLines = header.lines[examIndex] ?? [""];
      const blockH = exLines.length * header.lineH;
      const lineY = y + (headerH - blockH) / 2 + header.lineH * 0.75;
      exLines.forEach((line: string, i: number) => {
        doc.text(line, hx + examColW / 2, lineY + i * header.lineH, { align: "center" });
      });
      hx += examColW;
    });

    if (showTotal) {
      doc.line(hx, y, hx, y + headerH);
      doc.text("Total", hx + totalColW / 2, y + headerH / 2 + 0.8, { align: "center" });
    }
    return y + headerH;
  };

  let y = drawHeader(startY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(rhythm.rowFont);

  let grandTotalObtained = 0;
  let grandTotalMax = 0;
  const examTotals = exams.map(() => ({ obtained: 0, max: 0 }));

  for (let i = 0; i < subjects.length; i++) {
    const sub = subjects[i];
    const subLines = doc.splitTextToSize(sub.subjectName, Math.max(subjectColW - 4, 8)) as string[];
    const lineStep = rhythm.rowFont * 0.42;
    const thisRowH = subjectRowHeight(doc, sub.subjectName, subjectColW, rhythm);

    // No row shading: the sheet has a watermark that should show through.
    doc.setDrawColor(...COLORS.midGray);
    doc.setLineWidth(0.1);
    doc.line(margin, y + thisRowH, margin + contentW, y + thisRowH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(rhythm.rowFont);
    doc.setTextColor(...COLORS.darkText);
    const subjectBlockH = subLines.length * lineStep;
    const subjectStartY = y + (thisRowH - subjectBlockH) / 2 + lineStep * 0.72;
    subLines.forEach((line, li) => {
      doc.text(line, margin + 3, subjectStartY + li * lineStep);
    });

    const cellY = y + thisRowH / 2 + 0.7;
    let rx = margin + subjectColW;
    exams.forEach((ex, examIndex) => {
      doc.setDrawColor(...COLORS.midGray);
      doc.setLineWidth(0.1);
      doc.line(rx, y, rx, y + thisRowH);

      const examData = sub.exams.find((entry) => entry.examId === ex.id);
      if (mode === "marks" && examData) {
        if (examData.isAbsent) {
          examTotals[examIndex].max += Number(examData.maxScore) || 0;
        } else if (examData.score !== null) {
          examTotals[examIndex].obtained += Number(examData.score) || 0;
          examTotals[examIndex].max += Number(examData.maxScore) || 0;
        }
      }
      let display = "—";
      if (examData?.isAbsent) {
        display = "AB";
        doc.setTextColor(220, 53, 69);
      } else if (mode === "grades") {
        display = examData?.grade || "—";
        doc.setTextColor(...COLORS.darkText);
      } else if (examData && examData.score !== null) {
        display = `${examData.score}/${examData.maxScore}`;
        doc.setTextColor(...COLORS.darkText);
      } else {
        doc.setTextColor(...COLORS.darkText);
      }
      doc.setFontSize(mode === "marks" ? cellFont : rhythm.rowFont);
      doc.text(display, rx + examColW / 2, cellY, { align: "center" });
      doc.setTextColor(...COLORS.darkText);
      rx += examColW;
    });

    if (showTotal) {
      doc.setDrawColor(...COLORS.midGray);
      doc.line(rx, y, rx, y + thisRowH);

      let totalDisplay = "—";
      if (sub.totalMax > 0 && sub.totalScore != null) {
        totalDisplay = `${sub.totalScore}/${sub.totalMax}`;
        grandTotalObtained += sub.totalScore;
        grandTotalMax += sub.totalMax;
      }
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.darkText);
      doc.text(totalDisplay, rx + totalColW / 2, cellY, { align: "center" });
      doc.setFont("helvetica", "normal");
    }

    y += thisRowH;
  }

  if (mode === "marks") {
    const totalRowH = rhythm.rowH;
    const labelY = (rowY: number) => rowY + totalRowH / 2 + 0.7;
    const marksLabel = (obtained: number, max: number) => (max > 0 ? `${obtained}/${max}` : "—");
    const percentLabel = (obtained: number, max: number) =>
      max > 0 ? `${((obtained / max) * 100).toFixed(2)}%` : "—";

    const drawSummaryRow = (rowY: number, label: string, valueFor: (obtained: number, max: number) => string) => {
      doc.setDrawColor(...COLORS.midGray);
      doc.setLineWidth(0.1);
      doc.line(margin, rowY + totalRowH, margin + contentW, rowY + totalRowH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(rhythm.rowFont);
      doc.setTextColor(...COLORS.darkText);
      doc.text(label, margin + 3, labelY(rowY));
      let x = margin + subjectColW;
      examTotals.forEach((total) => {
        doc.line(x, rowY, x, rowY + totalRowH);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.darkText);
        const text = valueFor(total.obtained, total.max);
        const natural = textWidth(doc, text, "bold", cellFont);
        const fitted = natural > examColW - 2 ? Math.max(5, (cellFont * (examColW - 2)) / natural) : cellFont;
        doc.setFontSize(fitted);
        doc.text(text, x + examColW / 2, labelY(rowY), { align: "center" });
        x += examColW;
      });
      if (showTotal) {
        doc.line(x, rowY, x, rowY + totalRowH);
        doc.setFontSize(cellFont);
        doc.text(valueFor(grandTotalObtained, grandTotalMax), x + totalColW / 2, labelY(rowY), { align: "center" });
      }
    };

    drawSummaryRow(y, "TOTAL", marksLabel);
    y += totalRowH;
    drawSummaryRow(y, "PERCENTAGE", percentLabel);
    y += totalRowH;
  }

  doc.setDrawColor(...COLORS.brand);
  doc.setLineWidth(0.35);
  doc.rect(margin, startY, contentW, y - startY);

  return { y, grandTotalObtained, grandTotalMax };
}

function drawSectionHeading(doc: jsPDF, y: number, title: string, rhythm: ReportRhythm): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(rhythm.headingFont);
  doc.setTextColor(...COLORS.brand);
  doc.text(title, rhythm.margin, y + HEADING_TOP_GAP + rhythm.headingH - 1.4);
  return y + HEADING_TOP_GAP + rhythm.headingH + HEADING_BOTTOM_GAP;
}

function isTermPaper(name: string): boolean {
  return /term/i.test(name) && !/class\s*test/i.test(name);
}

function gradeForTerm(
  data: MultiExamReportCardData,
  subject: MultiExamReportCardSubject,
  term: string
): string | null {
  const termExams = data.exams.filter((exam) => exam.term === term);
  const termPaper = termExams.find((exam) => isTermPaper(exam.name)) ?? termExams[termExams.length - 1];
  if (!termPaper) return null;
  const entry = subject.exams.find((exam) => exam.examId === termPaper.id);
  if (!entry || entry.isAbsent) return null;
  return entry.grade?.trim() || null;
}

function coScholasticColumns(kind: MultiExamReportKind): { id: string; label: string }[] {
  if (kind === "term-1") return [{ id: "Term-1", label: "Term-1" }];
  if (kind === "term-2") return [{ id: "Term-2", label: "Term-2" }];
  return [
    { id: "Term-1", label: "Term-1" },
    { id: "Term-2", label: "Term-2" },
    { id: "Final", label: "Final" },
  ];
}

function drawGradeScale(doc: jsPDF, y: number, rhythm: ReportRhythm): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(rhythm.scaleFont);
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Grade:  A (80-100)    B (60-79)    C (40-59)    D (below 40)", rhythm.margin, y + rhythm.scaleH - 1.1);
  return y + rhythm.scaleH + SCALE_BOTTOM_GAP;
}

function drawRemarks(doc: jsPDF, y: number, rhythm: ReportRhythm): number {
  const w = doc.internal.pageSize.getWidth();
  const margin = rhythm.margin;
  const contentW = w - margin * 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(rhythm.remarksFont);
  doc.setTextColor(...COLORS.darkText);
  // Label and underline share one baseline.
  const baseline = y + rhythm.remarksH - 2.4;
  const label = "Remarks:";
  doc.text(label, margin, baseline);
  const lineStart = margin + doc.getTextWidth(label) + 2;
  doc.setDrawColor(...COLORS.darkText);
  doc.setLineWidth(0.2);
  doc.line(lineStart, baseline + 0.6, margin + contentW, baseline + 0.6);
  return y + rhythm.remarksH;
}

function metricCell(
  metrics: MultiExamReportCardData["termMetrics"],
  columnId: string,
  pick: (term: TermReportMetrics) => string | number | null,
  final: "blank" | "sum"
): string | null {
  if (columnId === "Final") {
    if (final === "blank") return null;
    const first = pick(metrics["Term-1"]);
    const second = pick(metrics["Term-2"]);
    if (first == null && second == null) return null;
    return String((Number(first) || 0) + (Number(second) || 0));
  }
  if (columnId !== "Term-1" && columnId !== "Term-2") return null;
  const value = pick(metrics[columnId]);
  return value == null || value === "" ? null : String(value);
}

function coScholasticMetricRows(data: MultiExamReportCardData): MultiExamReportCardSubject[] {
  const columns = coScholasticColumns(data.reportKind);
  const rows: { name: string; pick: (term: TermReportMetrics) => string | number | null; final: "blank" | "sum" }[] = [
    { name: "Height (cm)", pick: (term) => term.height, final: "blank" },
    { name: "Weight (kg)", pick: (term) => term.weight, final: "blank" },
    { name: "Total working days", pick: (term) => term.workingDays, final: "sum" },
    { name: "Present Days", pick: (term) => term.presentDays, final: "sum" },
  ];
  return rows.map((row) => ({
    subjectName: row.name,
    totalScore: null,
    totalMax: 0,
    exams: columns.map((column) => ({
      examId: column.id,
      score: null,
      maxScore: 0,
      grade: metricCell(data.termMetrics, column.id, row.pick, row.final),
      isAbsent: false,
      isGradeBased: true,
    })),
  }));
}

function studentInfoBlockHeight(doc: jsPDF, studentName: string, hasReportRow = false): number {
  const margin = 14;
  const lh = 6;
  const padY = 4;
  const w = doc.internal.pageSize.getWidth();
  const colLeft = margin + 5;
  const colRight = w / 2 + 12;
  const labelW = 32;
  const nameMaxW = Math.max(20, colRight - colLeft - labelW - 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const nameLines = Math.max(1, (doc.splitTextToSize(studentName || "—", nameMaxW) as string[]).length);
  const rows = nameLines + 2 + (hasReportRow ? 1 : 0);
  return padY * 2 + rows * lh + 2 + 5;
}

const TERM1_HALF_ID = "__term1_half";
const TERM2_HALF_ID = "__term2_half";
const FINAL_RESULT_ID = "__final_result";

/**
 * Scholastic table content. Annual cards add Term-1 50%, Term-2 50% and
 * Final Result columns (marks and out-of both halved / summed) and drop the plain Total column.
 */
function buildScholasticTable(
  data: MultiExamReportCardData,
  markSubjects: MultiExamReportCardSubject[],
  rhythm: ReportRhythm
) {
  if (data.reportKind !== "annual") {
    return {
      exams: data.exams.map((exam) => ({ id: exam.id, name: exam.name })),
      subjects: markSubjects,
      rhythm,
    };
  }

  const termSums = (subject: MultiExamReportCardSubject, term: string) => {
    let score = 0;
    let max = 0;
    let found = false;
    for (const exam of data.exams.filter((entry) => entry.term === term)) {
      const entry = subject.exams.find((item) => item.examId === exam.id);
      if (!entry) continue;
      if (entry.isAbsent) {
        max += Number(entry.maxScore) || 0;
        found = true;
      } else if (entry.score !== null) {
        score += Number(entry.score) || 0;
        max += Number(entry.maxScore) || 0;
        found = true;
      }
    }
    return found ? { score: score / 2, max: max / 2 } : null;
  };

  const subjects = markSubjects.map((subject) => {
    const first = termSums(subject, "Term-1");
    const second = termSums(subject, "Term-2");
    const final =
      first || second
        ? {
            score: (first?.score ?? 0) + (second?.score ?? 0),
            max: (first?.max ?? 0) + (second?.max ?? 0),
          }
        : null;
    const cell = (examId: string, value: { score: number; max: number } | null) => ({
      examId,
      score: value ? value.score : null,
      maxScore: value ? value.max : 0,
      isAbsent: false,
      isGradeBased: false,
    });
    return {
      ...subject,
      exams: [
        ...subject.exams,
        cell(TERM1_HALF_ID, first),
        cell(TERM2_HALF_ID, second),
        cell(FINAL_RESULT_ID, final),
      ],
    };
  });

  return {
    exams: [
      ...data.exams.map((exam) => ({ id: exam.id, name: exam.name })),
      { id: TERM1_HALF_ID, name: "Term-1 50%" },
      { id: TERM2_HALF_ID, name: "Term-2 50%" },
      { id: FINAL_RESULT_ID, name: "Final Result" },
    ],
    subjects,
    // No plain Total column; slimmer subject column leaves room for 9 result columns
    rhythm: { ...rhythm, totalColW: 0, subjectColW: 34 },
  };
}

const CO_SCHOLASTIC_GAP = 4; // mm between the two side-by-side tables

function splitInHalf<T>(items: T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

function coScholasticHalfWidth(doc: jsPDF, rhythm: ReportRhythm) {
  const pageContentW = doc.internal.pageSize.getWidth() - rhythm.margin * 2;
  return (pageContentW - CO_SCHOLASTIC_GAP) / 2;
}

function measureReportCard(doc: jsPDF, data: MultiExamReportCardData, rhythm: ReportRhythm): number {
  const markSubjects = data.subjects.filter((subject) => !isGradeSubject(subject));
  const gradeSubjects = data.subjects.filter((subject) => isGradeSubject(subject));
  let height = studentInfoBlockHeight(doc, data.studentName, Boolean(data.reportTitle));
  if (markSubjects.length > 0) {
    height += HEADING_TOP_GAP + rhythm.headingH + HEADING_BOTTOM_GAP;
    const scholastic = buildScholasticTable(data, markSubjects, rhythm);
    height += tableBlockHeight(
      doc,
      scholastic.exams.map((exam) => exam.name),
      scholastic.subjects.map((subject) => subject.subjectName),
      "marks",
      scholastic.rhythm
    );
    height += rhythm.blockGap;
  }
  height += HEADING_TOP_GAP + rhythm.headingH + HEADING_BOTTOM_GAP + rhythm.scaleH + SCALE_BOTTOM_GAP;
  const gradeExamNames = coScholasticColumns(data.reportKind).map((column) => column.label);
  const gradeNames = [
    ...gradeSubjects.map((subject) => subject.subjectName),
    "Height (cm)",
    "Weight (kg)",
    "Total working days",
    "Present Days",
  ];
  const [leftNames, rightNames] = splitInHalf(gradeNames);
  const halfW = coScholasticHalfWidth(doc, rhythm);
  height += Math.max(
    tableBlockHeight(doc, gradeExamNames, leftNames, "grades", rhythm, halfW),
    tableBlockHeight(doc, gradeExamNames, rightNames, "grades", rhythm, halfW)
  );
  height += rhythm.blockGap + rhythm.remarksH + rhythm.signatureBefore + rhythm.signatureAfter;
  return height;
}

function chooseReportRhythm(doc: jsPDF, data: MultiExamReportCardData): ReportRhythm {
  const available = PAGE_CONTENT_BOTTOM - PREPRINTED_CONTENT_TOP;
  const base = baseRhythm();
  const maxFactor = 1.3;

  // Grow into spare space (capped), otherwise shrink until everything fits.
  const grown = scaleRhythm(base, maxFactor);
  if (measureReportCard(doc, data, grown) <= available) return grown;

  let best = scaleRhythm(base, 0.62);
  let low = 0.62;
  let high = maxFactor;
  for (let attempt = 0; attempt < 12; attempt++) {
    const mid = (low + high) / 2;
    const rhythm = scaleRhythm(base, mid);
    if (measureReportCard(doc, data, rhythm) <= available) {
      best = rhythm;
      low = mid;
    } else {
      high = mid;
    }
  }
  return best;
}

async function renderMultiExamReportCard(
  doc: jsPDF,
  data: MultiExamReportCardData,
  options?: { newPage?: boolean }
): Promise<void> {
  if (options?.newPage) {
    doc.addPage();
  }
  const pagesAtStart = doc.getNumberOfPages();

  const rhythm = chooseReportRhythm(doc, data);

  // Letterhead is already printed in the top 5 cm of the sheet.
  let y = PREPRINTED_CONTENT_TOP;

  y = drawStudentInfo(doc, y, {
    studentName: data.studentName,
    standard: data.standard,
    division: data.division,
    rollNumber: data.rollNumber,
    studentId: data.studentId,
    academicYear: data.academicYear,
    examInfo: data.reportTitle,
    examLabel: "Report",
    plainBox: true,
  });

  const markSubjects = data.subjects.filter((subject) => !isGradeSubject(subject));
  const gradeSubjects = data.subjects.filter((subject) => isGradeSubject(subject));

  if (markSubjects.length > 0) {
    y = drawSectionHeading(doc, y, "Scholastic Performance", rhythm);
    const scholastic = buildScholasticTable(data, markSubjects, rhythm);
    const marksTable = drawMultiExamSubjectTable(
      doc,
      y,
      scholastic.exams,
      scholastic.subjects,
      "marks",
      scholastic.rhythm
    );
    y = marksTable.y + rhythm.blockGap;
  }

  y = drawSectionHeading(doc, y, "Co-Scholastic Performance", rhythm);
  y = drawGradeScale(doc, y, rhythm);
  const columns = coScholasticColumns(data.reportKind);
  const gradeExams = columns.map((column) => ({ id: column.id, name: column.label }));
  const gradeRows = [
    ...gradeSubjects.map((subject) => ({
      ...subject,
      exams: columns.map((column) => ({
        examId: column.id,
        score: null,
        maxScore: 0,
        grade: column.id === "Final" ? gradeForTerm(data, subject, "Term-2") : gradeForTerm(data, subject, column.id),
        isAbsent: false,
        isGradeBased: true,
      })),
    })),
    ...coScholasticMetricRows(data),
  ];
  const [leftRows, rightRows] = splitInHalf(gradeRows);
  const halfW = coScholasticHalfWidth(doc, rhythm);
  const leftTable = drawMultiExamSubjectTable(doc, y, gradeExams, leftRows, "grades", rhythm, {
    x: rhythm.margin,
    width: halfW,
  });
  const rightTable =
    rightRows.length > 0
      ? drawMultiExamSubjectTable(doc, y, gradeExams, rightRows, "grades", rhythm, {
          x: rhythm.margin + halfW + CO_SCHOLASTIC_GAP,
          width: halfW,
        })
      : leftTable;
  y = Math.max(leftTable.y, rightTable.y) + rhythm.blockGap;

  y = drawRemarks(doc, y, rhythm);

  y = await drawSignatures(doc, y, data.principalSignatureUrl, {
    margin: rhythm.margin,
    before: rhythm.signatureBefore,
    after: rhythm.signatureAfter,
    maxH: Math.max(8, rhythm.signatureBefore - 1),
  });

  drawFooter(doc, data.academicYear);

  if (doc.getNumberOfPages() !== pagesAtStart || y > PAGE_CONTENT_BOTTOM + 0.6) {
    throw new Error("Report card must stay on one page");
  }
}

export async function generateMultiExamReportCardPDF(data: MultiExamReportCardData): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await renderMultiExamReportCard(doc, data);
  return doc.output("blob");
}

export async function generateClassMultiExamReportCardPDF(students: MultiExamReportCardData[]): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  for (let i = 0; i < students.length; i++) {
    await renderMultiExamReportCard(doc, students[i], { newPage: i > 0 });
  }
  return doc.output("blob");
}
