import { jsPDF } from "jspdf";
import { PDF_LAYOUT } from "./pdf-utils";
import { calculatePercentage } from "./grade-utils";

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
  doc.text(data.standard ?? "—", colRight + labelW, y);
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
  const examInfo = [data.examName, data.examType, data.heldAt ? new Date(data.heldAt).toLocaleDateString("en-IN").replace(/\//g, "-") : ""].filter(Boolean).join(" – ");
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

  const marksForCalc = data.subjects.map(sub => ({
    score: sub.score,
    maxScore: sub.maxScore,
    isAbsent: sub.isAbsent,
    isGradeBased: sub.maxScore === 0 && sub.grade !== undefined
  }));

  const { totalObtained, totalMax, percentage } = calculatePercentage(marksForCalc);

  for (const sub of data.subjects) {
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

  doc.setFont("helvetica", "normal");
  doc.text(`Percentage: ${percentage !== "—" ? percentage + "%" : "—"}`, margin, y);
  y += lh + blockGap;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  doc.text("Teacher", margin + 35, y);
  doc.text("Principal", w - margin - 45, y);
  y += 6;
  doc.line(margin, y, margin + 55, y);
  doc.line(w - margin - 55, y, w - margin, y);

  return doc.output("blob");
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

export function generateMultiExamReportCardPDF(data: MultiExamReportCardData): Blob {
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
  doc.text(data.reportTitle.toUpperCase(), w / 2, y, { align: "center" });
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
  doc.text(data.standard ?? "—", colRight + labelW, y);
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

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  // Table Setup
  const examCount = data.exams.length;
  // Columns: Subject, Exam 1..N, Total
  // We allocate fixed widths for exams and total, the rest for subject
  const examColW = 15;
  const totalColW = 20;
  const subjectColW = PDF_LAYOUT.contentWidth - (examColW * examCount) - totalColW;
  
  let currentX = margin;
  
  doc.setFont("helvetica", "bold");
  doc.text("Subject", currentX + 2, y + lh/2);
  currentX += subjectColW;
  
  data.exams.forEach(ex => {
    const exLines = doc.splitTextToSize(ex.name, examColW - 2);
    exLines.forEach((line: string, i: number) => {
      doc.text(line, currentX + examColW/2, y + i * lh, { align: "center" });
    });
    currentX += examColW;
  });
  
  doc.text("Total", currentX + totalColW/2, y + lh/2, { align: "center" });
  
  y += (lh * 2) + 2;
  doc.setFont("helvetica", "normal");
  doc.line(margin, y, w - margin, y);
  y += lh;

  let grandTotalObtained = 0;
  let grandTotalMax = 0;

  for (const sub of data.subjects) {
    let rowX = margin;
    const subLines = doc.splitTextToSize(sub.subjectName, subjectColW - 4);
    
    // Draw subject name
    subLines.forEach((line: string, i: number) => {
      doc.text(line, rowX + 2, y + i * lh);
    });
    rowX += subjectColW;
    
    // Draw exams
    data.exams.forEach(ex => {
      const examData = sub.exams.find(e => e.examId === ex.id);
      let display = "—";
      if (examData) {
        if (examData.isAbsent) display = "AB";
        else if (examData.isGradeBased) display = examData.grade || "—";
        else display = examData.score !== null ? String(examData.score) : "—";
      }
      doc.text(display, rowX + examColW/2, y, { align: "center" });
      rowX += examColW;
    });
    
    // Draw Total
    let totalDisplay = "—";
    if (sub.totalMax === 0 && sub.finalGrade) {
      totalDisplay = sub.finalGrade;
    } else if (sub.totalMax > 0) {
      totalDisplay = `${sub.totalScore ?? 0}/${sub.totalMax}`;
      grandTotalObtained += (sub.totalScore ?? 0);
      grandTotalMax += sub.totalMax;
    }
    
    doc.text(totalDisplay, rowX + totalColW/2, y, { align: "center" });
    
    y += Math.max(lh * subLines.length, lh);
  }

  doc.line(margin, y, w - margin, y);
  y += lh;
  
  doc.setFont("helvetica", "bold");
  doc.text("Overall Total", margin + subjectColW + (examCount * examColW) - 20, y);
  doc.text(`${grandTotalObtained} / ${grandTotalMax}`, w - margin - totalColW/2, y, { align: "center" });
  y += lh + blockGap;

  let percentage = grandTotalMax > 0 ? ((grandTotalObtained / grandTotalMax) * 100).toFixed(2) : "—";
  doc.setFont("helvetica", "normal");
  doc.text(`Percentage: ${percentage !== "—" ? percentage + "%" : "—"}`, margin, y);
  y += lh + blockGap;

  doc.line(margin, y, w - margin, y);
  y += blockGap;

  doc.text("Teacher", margin + 35, y);
  doc.text("Principal", w - margin - 45, y);
  y += 6;
  doc.line(margin, y, margin + 55, y);
  doc.line(w - margin - 55, y, w - margin, y);

  return doc.output("blob");
}
