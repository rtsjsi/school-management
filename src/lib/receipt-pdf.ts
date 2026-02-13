import { jsPDF } from "jspdf";

interface ReceiptData {
  receiptNumber: string;
  studentName: string;
  amount: number;
  paymentMode: string;
  quarter: number;
  academicYear: string;
  feeType: string;
  collectedAt: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeDate?: string;
  onlineTransactionId?: string;
  onlineTransactionRef?: string;
}

export function generateReceiptPDF(data: ReceiptData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SCHOOL FEE RECEIPT", w / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Official Receipt", w / 2, y, { align: "center" });
  y += 15;

  doc.setDrawColor(0, 0, 0);
  doc.line(15, y, w - 15, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Receipt No:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.receiptNumber, 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Date:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.collectedAt, 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Student:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.studentName, 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Fee Type:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.feeType.charAt(0).toUpperCase() + data.feeType.slice(1), 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Quarter:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Q${data.quarter} (${data.academicYear})`, 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Amount:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Rs. ${data.amount.toLocaleString()}`, 80, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Payment Mode:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.paymentMode.charAt(0).toUpperCase() + data.paymentMode.slice(1), 80, y);
  y += 10;

  if (data.paymentMode === "cheque" && (data.chequeNumber || data.chequeBank || data.chequeDate)) {
    doc.setFont("helvetica", "bold");
    doc.text("Cheque Details:", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const chequeParts = [data.chequeNumber && `No: ${data.chequeNumber}`, data.chequeBank && `Bank: ${data.chequeBank}`, data.chequeDate && `Date: ${data.chequeDate}`].filter(Boolean);
    doc.text(chequeParts.join(", "), 20, y);
    y += 10;
  }

  if (data.paymentMode === "online" && (data.onlineTransactionId || data.onlineTransactionRef)) {
    doc.setFont("helvetica", "bold");
    doc.text("Transaction Details:", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const txnParts = [data.onlineTransactionId && `Txn ID: ${data.onlineTransactionId}`, data.onlineTransactionRef && `Ref: ${data.onlineTransactionRef}`].filter(Boolean);
    doc.text(txnParts.join(", "), 20, y);
    y += 10;
  }

  y += 15;
  doc.line(15, y, w - 15, y);
  y += 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("This is a computer-generated receipt. Please retain for your records.", w / 2, y, { align: "center" });

  return doc.output("blob");
}
