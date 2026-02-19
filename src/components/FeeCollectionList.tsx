"use client";

import { useState, useEffect } from "react";
import { generateReceiptPDF, amountInWords } from "@/lib/receipt-pdf";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Printer } from "lucide-react";

type CollectionRow = {
  id: string;
  receipt_number: string;
  student_name?: string;
  student_grade?: string;
  student_section?: string;
  student_roll_number?: number;
  student_gr_no?: string;
  amount: number;
  fee_type: string;
  quarter: number;
  academic_year: string;
  payment_mode: string;
  collected_at: string;
  collected_by?: string;
  cheque_number?: string;
  cheque_bank?: string;
  cheque_date?: string;
  online_transaction_id?: string;
  online_transaction_ref?: string;
};

const DEFAULT_POLICY_NOTES = [
  "(1) Fees will not be refunded in any case.",
  "(2) Fees are not transferable.",
  "(3) Cheque payment subject to realisation.",
];

function printReceipt(row: CollectionRow) {
  const pdfBlob = generateReceiptPDF({
    receiptNumber: row.receipt_number,
    studentName: row.student_name ?? "—",
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    quarter: row.quarter,
    academicYear: row.academic_year,
    feeType: row.fee_type,
    collectedAt: row.collected_at,
    amountInWords: amountInWords(Number(row.amount)),
    receivedBy: row.collected_by,
    policyNotes: DEFAULT_POLICY_NOTES,
    chequeNumber: row.cheque_number,
    chequeBank: row.cheque_bank,
    chequeDate: row.cheque_date,
    onlineTransactionId: row.online_transaction_id,
    onlineTransactionRef: row.online_transaction_ref,
    schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "School",
    schoolAddress: process.env.NEXT_PUBLIC_SCHOOL_ADDRESS ?? "",
    grade: row.student_grade,
    section: row.student_section,
    rollNumber: row.student_roll_number,
    grNo: row.student_gr_no,
  });
  const url = URL.createObjectURL(pdfBlob);
  const w = window.open(url, "_blank");
  if (w) w.onload = () => w.print();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function downloadReceipt(row: CollectionRow) {
  const pdfBlob = generateReceiptPDF({
    receiptNumber: row.receipt_number,
    studentName: row.student_name ?? "—",
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    quarter: row.quarter,
    academicYear: row.academic_year,
    feeType: row.fee_type,
    collectedAt: row.collected_at,
    amountInWords: amountInWords(Number(row.amount)),
    receivedBy: row.collected_by,
    policyNotes: DEFAULT_POLICY_NOTES,
    chequeNumber: row.cheque_number,
    chequeBank: row.cheque_bank,
    chequeDate: row.cheque_date,
    onlineTransactionId: row.online_transaction_id,
    onlineTransactionRef: row.online_transaction_ref,
    schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "School",
    schoolAddress: process.env.NEXT_PUBLIC_SCHOOL_ADDRESS ?? "",
    grade: row.student_grade,
    section: row.student_section,
    rollNumber: row.student_roll_number,
    grNo: row.student_gr_no,
  });
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${row.receipt_number}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FeeCollectionList() {
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCollections = () => {
    fetch("/api/fee-reports?limit=20")
      .then((r) => r.json())
      .then((d) => setCollections(d.data ?? []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    const handler = () => loadCollections();
    window.addEventListener("fee-collection-added", handler);
    return () => window.removeEventListener("fee-collection-added", handler);
  }, []);

  if (loading) return null;
  if (collections.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-medium mb-3">Latest 20 collections</h3>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Qtr</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.receipt_number}</TableCell>
                  <TableCell className="font-medium">{row.student_name ?? "—"}</TableCell>
                  <TableCell>{Number(row.amount).toLocaleString()}</TableCell>
                  <TableCell>Q{row.quarter}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.collected_at ? new Date(row.collected_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadReceipt(row)}
                        aria-label="Download receipt"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => printReceipt(row)}
                        aria-label="Print receipt"
                      >
                        <Printer className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
