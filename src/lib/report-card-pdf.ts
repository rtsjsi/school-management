import { jsPDF } from "jspdf";

export interface ReportCardSubject {
  subjectName: string;
  maxScore: number;
  score: number | null;
  isAbsent: boolean;
}

export interface ReportCardData {
  schoolName?: string;
  schoolAddress?: string;
  studentName: string;
  grade?: string;
  section?: string;
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
  const margin = 20;
  let y = 25;

  const schoolName = data.schoolName ?? "SCHOOL NAME";
  const schoolAddress = data.schoolAddress ?? "Address";

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName.toUpperCase(), w / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(schoolAddress.toUpperCase(), w / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("REPORT CARD", w / 2, y, { align: "center" });
  y += 15;

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, w - margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text("Name:", margin, y);
  doc.text(data.studentName, margin + 45, y);
  doc.text("Grade:", margin + 100, y);
  doc.text(data.grade ?? "—", margin + 125, y);
  y += 7;

  doc.text("Section:", margin, y);
  doc.text(data.section ?? "—", margin + 45, y);
  doc.text("Roll No.:", margin + 100, y);
  doc.text(String(data.rollNumber ?? "—"), margin + 125, y);
  y += 7;

  doc.text("GR No.:", margin, y);
  doc.text(data.studentId ?? "—", margin + 45, y);
  doc.text("Academic Year:", margin + 100, y);
  doc.text(data.academicYear ?? "—", margin + 125, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Exam:", margin, y);
  doc.setFont("helvetica", "normal");
  const examInfo = [data.examName, data.examType, data.heldAt ? new Date(data.heldAt).toLocaleDateString("en-IN") : ""].filter(Boolean).join(" – ");
  doc.text(examInfo, margin + 45, y);
  y += 12;

  doc.line(margin, y, w - margin, y);
  y += 8;

  const colSubject = margin + 5;
  const colMax = w - margin - 50;
  const colMarks = w - margin - 25;

  doc.setFont("helvetica", "bold");
  doc.text("Subject", colSubject, y);
  doc.text("Max", colMax, y, { align: "right" });
  doc.text("Marks", colMarks, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.line(margin, y, w - margin, y);
  y += 6;

  let totalMax = 0;
  let totalObtained = 0;

  for (const sub of data.subjects) {
    totalMax += sub.maxScore;
    const obtained = sub.isAbsent ? 0 : (sub.score ?? 0);
    totalObtained += obtained;
    const displayMarks = sub.isAbsent ? "Absent" : (sub.score != null ? String(sub.score) : "—");

    doc.text(sub.subjectName, colSubject, y);
    doc.text(String(sub.maxScore), colMax, y, { align: "right" });
    doc.text(displayMarks, colMarks, y, { align: "right" });
    y += 7;
  }

  doc.line(margin, y, w - margin, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Total", colSubject, y);
  doc.text(String(totalMax), colMax, y, { align: "right" });
  doc.text(String(totalObtained), colMarks, y, { align: "right" });
  y += 10;

  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "—";
  doc.setFont("helvetica", "normal");
  doc.text(`Percentage: ${percentage}%`, margin, y);
  y += 15;

  doc.line(margin, y, w - margin, y);
  y += 15;

  doc.text("Class Teacher", margin + 30, y);
  doc.text("Principal", w - margin - 40, y);
  y += 5;
  doc.line(margin, y, margin + 50, y);
  doc.line(w - margin - 50, y, w - margin, y);

  return doc.output("blob");
}
