import { jsPDF } from "jspdf";
import { PDF_LAYOUT } from "./pdf-utils";

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
  studentName: string;
  grade?: string;
  division?: string;
  rollNumber?: number | string;
  studentId?: string;
  academicYear?: string;
  examName: string;
  examType?: string;
  heldAt?: string;
  subjects: ReportCardSubject[];
}

export function generateReportCardPDF(data: ReportCardData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = PDF_LAYOUT.margin;
  const lh = PDF_LAYOUT.lineHeight;
  const blockGap = PDF_LAYOUT.blockGap;
  let y = 22;

  const schoolName = data.schoolName ?? "SCHOOL NAME";
  const schoolAddress = data.schoolAddress ?? "Address";

  doc.setFontSize(PDF_LAYOUT.fontSizeTitle);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName.toUpperCase(), w / 2, y, { align: "center" });
  y += lh + 2;

  doc.setFontSize(PDF_LAYOUT.fontSizeSubtitle);
  doc.setFont("helvetica", "normal");
  const addrLines = doc.splitTextToSize(schoolAddress.toUpperCase(), PDF_LAYOUT.contentWidth);
  addrLines.forEach((line: string) => {
    doc.text(line, w / 2, y, { align: "center" });
    y += lh;
  });
  y += blockGap;

  doc.setFontSize(PDF_LAYOUT.fontSizeHeading);
  doc.setFont("helvetica", "bold");
  doc.text("REPORT CARD", w / 2, y, { align: "center" });
  y += lh + blockGap;

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, w - margin, y);
  y += blockGap;

  const colLeft = margin;
  const colRight = w / 2 + 10;
  const labelW = PDF_LAYOUT.labelWidth;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_LAYOUT.fontSizeBody);

  doc.text("Name:", colLeft, y);
  const nameLines = doc.splitTextToSize(data.studentName, PDF_LAYOUT.valueMaxWidth);
  nameLines.forEach((line: string, i: number) => {
    doc.text(line, colLeft + labelW, y + i * lh);
  });
  doc.text("Standard:", colRight, y);
  doc.text(data.grade ?? "—", colRight + labelW, y);
  y += Math.max(lh * nameLines.length, lh);

  doc.text("Division:", colLeft, y);
  doc.text(data.division ?? "—", colLeft + labelW, y);
  doc.text("Roll No.:", colRight, y);
  doc.text(String(data.rollNumber ?? "—"), colRight + labelW, y);
  y += lh;

  doc.text("GR No.:", colLeft, y);
  doc.text(data.studentId ?? "—", colLeft + labelW, y);
  doc.text("Academic Year:", colRight, y);
  doc.text(data.academicYear ?? "—", colRight + labelW, y);
  y += lh + blockGap;

  doc.setFont("helvetica", "bold");
  doc.text("Exam:", colLeft, y);
  doc.setFont("helvetica", "normal");
  const examInfo = [data.examName, data.examType, data.heldAt ? new Date(data.heldAt).toLocaleDateString("en-IN") : ""].filter(Boolean).join(" – ");
  const examLines = doc.splitTextToSize(examInfo, PDF_LAYOUT.contentWidth - labelW);
  examLines.forEach((line: string, i: number) => {
    doc.text(line, colLeft + labelW, y + i * lh);
  });
  y += Math.max(lh * examLines.length, lh) + blockGap;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  const colSubject = margin + 5;
  const colMax = w - margin - 50;
  const colMarks = w - margin - 25;
  const subjectMaxWidth = colMax - colSubject - 15;

  doc.setFont("helvetica", "bold");
  doc.text("Subject", colSubject, y);
  doc.text("Max", colMax, y, { align: "right" });
  doc.text("Marks", colMarks, y, { align: "right" });
  y += lh + 2;

  doc.setFont("helvetica", "normal");
  doc.line(margin, y, w - margin, y);
  y += lh;

  let totalMax = 0;
  let totalObtained = 0;

  for (const sub of data.subjects) {
    totalMax += sub.maxScore;
    const obtained = sub.isAbsent ? 0 : (sub.score ?? 0);
    totalObtained += obtained;
    const displayMarks = sub.isAbsent
      ? "Absent"
      : sub.grade != null
        ? sub.grade
        : sub.score != null
          ? String(sub.score)
          : "—";

    const subLines = doc.splitTextToSize(sub.subjectName, subjectMaxWidth);
    subLines.forEach((line: string, i: number) => {
      doc.text(line, colSubject, y + i * lh);
    });
    doc.text(sub.maxScore > 0 ? String(sub.maxScore) : "—", colMax, y, { align: "right" });
    doc.text(displayMarks, colMarks, y, { align: "right" });
    y += Math.max(lh * subLines.length, lh);
  }

  doc.line(margin, y, w - margin, y);
  y += lh;

  doc.setFont("helvetica", "bold");
  doc.text("Total", colSubject, y);
  doc.text(String(totalMax), colMax, y, { align: "right" });
  doc.text(String(totalObtained), colMarks, y, { align: "right" });
  y += lh + blockGap;

  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "—";
  doc.setFont("helvetica", "normal");
  doc.text(`Percentage: ${percentage}%`, margin, y);
  y += lh + blockGap;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  doc.text("Class Teacher", margin + 35, y);
  doc.text("Principal", w - margin - 45, y);
  y += 6;
  doc.line(margin, y, margin + 55, y);
  doc.line(w - margin - 55, y, w - margin, y);

  return doc.output("blob");
}
