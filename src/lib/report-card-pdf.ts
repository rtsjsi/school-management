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
};

const LOGO_SIZE = 16; // mm

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
  exams: {
    id: string;
    name: string;
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
  }
): number {
  const w = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = w - margin * 2;
  const lh = 6;
  const padX = 5;
  const padY = 4;

  // Compute height needed
  const rows = 3 + (data.examInfo ? 1 : 0);
  const boxH = padY * 2 + rows * lh + 2;

  // Background box
  doc.setFillColor(...COLORS.lightGray);
  doc.setDrawColor(...COLORS.midGray);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");

  let iy = y + padY + lh;
  const colLeft = margin + padX;
  const colRight = w / 2 + 12;
  const labelW = 32;

  doc.setFontSize(9);

  // Row 1: Name / Standard
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Name:", colLeft, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  const nameVal = data.studentName || "—";
  const nameLines = doc.splitTextToSize(nameVal, colRight - colLeft - labelW - 5);
  nameLines.forEach((line: string, i: number) => {
    doc.text(line, colLeft + labelW, iy + i * lh);
  });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Standard:", colRight, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  doc.text(data.standard ?? "—", colRight + labelW, iy);
  iy += Math.max(lh * nameLines.length, lh);

  // Row 2: Division / Roll No
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Division:", colLeft, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  doc.text(data.division ?? "—", colLeft + labelW, iy);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Roll No.:", colRight, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.rollNumber ?? "—"), colRight + labelW, iy);
  iy += lh;

  // Row 3: GR No / Academic Year
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("GR No.:", colLeft, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  doc.text(data.studentId ?? "—", colLeft + labelW, iy);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Acad. Year:", colRight, iy);
  doc.setTextColor(...COLORS.darkText);
  doc.setFont("helvetica", "normal");
  doc.text(data.academicYear ?? "—", colRight + labelW, iy);
  iy += lh;

  // Row 4: Exam info (optional)
  if (data.examInfo) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.mutedText);
    doc.text("Exam:", colLeft, iy);
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
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...COLORS.mutedText);
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  doc.text(`Generated on ${today}`, 14, h - 12);
  if (academicYear) {
    doc.text(`Academic Year: ${academicYear}`, w - 14, h - 12, { align: "right" });
  }
}

// ── Helper: draw signature section ──────────────────────────────────────────

async function drawSignatures(
  doc: jsPDF,
  y: number,
  principalSigUrl?: string
): Promise<number> {
  const w = doc.internal.pageSize.getWidth();
  const margin = 14;

  y += 8;

  // Try to load principal signature
  const sigDataUrl = principalSigUrl ? await urlToDataUrl(principalSigUrl) : null;

  if (sigDataUrl) {
    try {
      doc.addImage(sigDataUrl, "PNG", w - margin - 45, y - 10, 30, 10);
    } catch {
      // Graceful degradation
    }
  }

  // Signature lines
  doc.setDrawColor(...COLORS.midGray);
  doc.setLineWidth(0.3);
  doc.line(margin + 10, y, margin + 60, y);
  doc.line(w - margin - 60, y, w - margin - 10, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.mutedText);
  doc.text("Class Teacher", margin + 35, y, { align: "center" });
  doc.text("Principal", w - margin - 35, y, { align: "center" });

  return y + 6;
}

// ══════════════════════════════════════════════════════════════════════════
// SINGLE EXAM REPORT CARD
// ══════════════════════════════════════════════════════════════════════════

export async function generateReportCardPDF(data: ReportCardData): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = w - margin * 2;

  drawPageBorder(doc);

  const schoolName = data.schoolName ?? "SCHOOL NAME";
  const schoolAddress = data.schoolAddress ?? "Address";

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
  doc.text("Max", colMax, y + headerH / 2 + 1.2, { align: "center" });
  doc.text("Marks", colMarks, y + headerH / 2 + 1.2, { align: "center" });
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

  // Performance label
  if (percentage !== "—") {
    const pctNum = parseFloat(percentage);
    let perfLabel = "";
    let perfColor: [number, number, number] = COLORS.darkText;
    if (pctNum >= 90) { perfLabel = "Outstanding"; perfColor = [25, 135, 84]; }
    else if (pctNum >= 75) { perfLabel = "Excellent"; perfColor = [13, 110, 253]; }
    else if (pctNum >= 60) { perfLabel = "Very Good"; perfColor = [13, 110, 253]; }
    else if (pctNum >= 45) { perfLabel = "Good"; perfColor = [255, 153, 0]; }
    else if (pctNum >= 33) { perfLabel = "Pass"; perfColor = [255, 153, 0]; }
    else { perfLabel = "Needs Improvement"; perfColor = [220, 53, 69]; }

    doc.setTextColor(...perfColor);
    doc.text(perfLabel, w - margin - 6, y + resultH / 2 + 1.5, { align: "right" });
  }
  y += resultH + 4;

  // ── Signatures ──
  await drawSignatures(doc, y, data.principalSignatureUrl);

  // ── Footer ──
  drawFooter(doc, data.academicYear);

  return doc.output("blob");
}

// ══════════════════════════════════════════════════════════════════════════
// MULTI-EXAM REPORT CARD
// ══════════════════════════════════════════════════════════════════════════

export async function generateMultiExamReportCardPDF(data: MultiExamReportCardData): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = w - margin * 2;

  drawPageBorder(doc);

  const schoolName = data.schoolName ?? "SCHOOL NAME";
  const schoolAddress = data.schoolAddress ?? "Address";

  let y = await drawHeader(doc, schoolName, schoolAddress, data.reportTitle, data.schoolLogoUrl);

  y = drawStudentInfo(doc, y, {
    studentName: data.studentName,
    standard: data.standard,
    division: data.division,
    rollNumber: data.rollNumber,
    studentId: data.studentId,
    academicYear: data.academicYear,
  });

  // ── Table Setup ──
  const examCount = data.exams.length;
  const totalColW = 22;
  const minExamColW = 18;
  const subjectColW = Math.max(contentW - minExamColW * examCount - totalColW, 40);
  const examColW = (contentW - subjectColW - totalColW) / examCount;

  const headerH = 10;
  const rowH = 7;

  // ── Table Header ──
  doc.setFillColor(...COLORS.navy);
  doc.rect(margin, y, contentW, headerH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.white);

  let hx = margin;
  doc.text("Subject", hx + 4, y + headerH / 2 + 1);
  hx += subjectColW;

  // Vertical divider lines in header
  doc.setDrawColor(...COLORS.navyLight);
  doc.setLineWidth(0.2);

  data.exams.forEach((ex) => {
    doc.line(hx, y, hx, y + headerH);
    const exLines = doc.splitTextToSize(ex.name, examColW - 3);
    exLines.forEach((line: string, i: number) => {
      doc.text(line, hx + examColW / 2, y + 3 + i * 3.5, { align: "center" });
    });
    hx += examColW;
  });

  doc.line(hx, y, hx, y + headerH);
  doc.text("Total", hx + totalColW / 2, y + headerH / 2 + 1, { align: "center" });

  y += headerH;

  // ── Table Rows ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  let grandTotalObtained = 0;
  let grandTotalMax = 0;

  for (let i = 0; i < data.subjects.length; i++) {
    const sub = data.subjects[i];
    const isAlt = i % 2 === 0;

    // Multi-line subject
    const subLines = doc.splitTextToSize(sub.subjectName, subjectColW - 6);
    const thisRowH = Math.max(rowH, subLines.length * 4.5 + 2);

    // Row background
    if (isAlt) {
      doc.setFillColor(...COLORS.offWhite);
      doc.rect(margin, y, contentW, thisRowH, "F");
    }

    // Row border
    doc.setDrawColor(...COLORS.midGray);
    doc.setLineWidth(0.1);
    doc.line(margin, y + thisRowH, w - margin, y + thisRowH);

    // Subject name
    doc.setTextColor(...COLORS.darkText);
    subLines.forEach((line: string, li: number) => {
      doc.text(line, margin + 4, y + 4 + li * 4.5);
    });

    // Exam scores
    let rx = margin + subjectColW;
    data.exams.forEach((ex) => {
      // Column divider
      doc.setDrawColor(...COLORS.midGray);
      doc.setLineWidth(0.1);
      doc.line(rx, y, rx, y + thisRowH);

      const examData = sub.exams.find((e) => e.examId === ex.id);
      let display = "—";
      if (examData) {
        if (examData.isAbsent) {
          display = "AB";
          doc.setTextColor(220, 53, 69);
        } else if (examData.isGradeBased) {
          display = examData.grade || "—";
          doc.setTextColor(...COLORS.navyLight);
        } else {
          display = examData.score !== null ? `${examData.score}/${examData.maxScore}` : "—";
          doc.setTextColor(...COLORS.darkText);
        }
      }
      doc.text(display, rx + examColW / 2, y + 4, { align: "center" });
      doc.setTextColor(...COLORS.darkText);
      rx += examColW;
    });

    // Column divider before total
    doc.setDrawColor(...COLORS.midGray);
    doc.line(rx, y, rx, y + thisRowH);

    // Total
    let totalDisplay = "—";
    if (sub.totalMax === 0 && sub.finalGrade) {
      totalDisplay = sub.finalGrade;
      doc.setTextColor(...COLORS.navyLight);
    } else if (sub.totalMax > 0) {
      totalDisplay = `${sub.totalScore ?? 0}/${sub.totalMax}`;
      grandTotalObtained += sub.totalScore ?? 0;
      grandTotalMax += sub.totalMax;
      doc.setTextColor(...COLORS.darkText);
    }
    doc.setFont("helvetica", "bold");
    doc.text(totalDisplay, rx + totalColW / 2, y + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.darkText);

    y += thisRowH;
  }

  // ── Grand Total Row ──
  const totalRowH = 8;
  doc.setFillColor(...COLORS.navy);
  doc.rect(margin, y, contentW, totalRowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text("GRAND TOTAL", margin + 4, y + totalRowH / 2 + 1.2);

  // Total in last column
  const totalX = margin + subjectColW + examCount * examColW;
  doc.text(`${grandTotalObtained}/${grandTotalMax}`, totalX + totalColW / 2, y + totalRowH / 2 + 1.2, { align: "center" });
  y += totalRowH + 6;

  // ── Percentage / Result box ──
  const percentage = grandTotalMax > 0 ? ((grandTotalObtained / grandTotalMax) * 100).toFixed(2) : "—";

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

  if (percentage !== "—") {
    const pctNum = parseFloat(percentage);
    let perfLabel = "";
    let perfColor: [number, number, number] = COLORS.darkText;
    if (pctNum >= 90) { perfLabel = "Outstanding"; perfColor = [25, 135, 84]; }
    else if (pctNum >= 75) { perfLabel = "Excellent"; perfColor = [13, 110, 253]; }
    else if (pctNum >= 60) { perfLabel = "Very Good"; perfColor = [13, 110, 253]; }
    else if (pctNum >= 45) { perfLabel = "Good"; perfColor = [255, 153, 0]; }
    else if (pctNum >= 33) { perfLabel = "Pass"; perfColor = [255, 153, 0]; }
    else { perfLabel = "Needs Improvement"; perfColor = [220, 53, 69]; }

    doc.setTextColor(...perfColor);
    doc.text(perfLabel, w - margin - 6, y + resultH / 2 + 1.5, { align: "right" });
  }
  y += resultH + 4;

  // ── Signatures ──
  await drawSignatures(doc, y, data.principalSignatureUrl);

  // ── Footer ──
  drawFooter(doc, data.academicYear);

  return doc.output("blob");
}
