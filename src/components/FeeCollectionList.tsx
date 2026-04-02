"use client";

import { useState, useEffect } from "react";
import { generateReceiptPDF, amountInWords } from "@/lib/receipt-pdf";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { updateFeeCollection } from "@/app/(workspace)/dashboard/fees/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Pencil, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { formatFeeCollectionDisplayDate } from "@/lib/utils";

type CollectionRow = {
  id: string;
  receipt_number: string;
  student_name?: string;
  student_standard?: string;
  student_division?: string;
  student_roll_number?: number;
  student_gr_no?: string;
  amount: number;
  fee_type: string;
  quarter: number;
  academic_year: string;
  payment_mode: string;
  collection_date: string;
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

type SchoolInfo = { name: string; address: string; logoUrl?: string | null };
type PaymentMode = "cash" | "cheque" | "online";
type EditFormState = {
  payment_mode: PaymentMode;
  cheque_number: string;
  cheque_bank: string;
  cheque_date: string;
  online_transaction_id: string;
  online_transaction_ref: string;
  modification_remarks: string;
};

async function getReceiptData(row: CollectionRow) {
  const res = await fetch(`/api/receipt-data?id=${row.id}`);
  if (!res.ok) return null;
  return res.json();
}

async function printReceipt(row: CollectionRow, school: SchoolInfo) {
  getReceiptData(row).then(async (data) => {
    if (!data) {
      generateAndPrintFallback(row, school);
      return;
    }
    const pdfBlob = await generateReceiptPDF({
      receiptNumber: data.receiptNumber,
      studentName: data.studentName,
      amount: data.amount,
      paymentMode: data.paymentMode,
      quarter: data.quarter,
      academicYear: data.academicYear,
      feeType: data.feeType,
      collectedAt: data.collectedAt,
      amountInWords: amountInWords(data.amount),
      collectedBy: data.collectedBy,
      policyNotes: DEFAULT_POLICY_NOTES,
      chequeNumber: data.chequeNumber,
      chequeBank: data.chequeBank,
      chequeDate: data.chequeDate,
      onlineTransactionId: data.onlineTransactionId,
      onlineTransactionRef: data.onlineTransactionRef,
      schoolName: school.name,
      schoolAddress: school.address,
      schoolLogoUrl: school.logoUrl ?? undefined,
      standard: data.standard,
      division: data.division,
      rollNumber: data.rollNumber,
      grNo: data.grNo,
      totalFees: data.totalFees,
      outstandingAfterPayment: data.outstandingAfterPayment,
    });
    const url = URL.createObjectURL(pdfBlob);
    const w = window.open(url, "_blank");
    if (w) w.onload = () => w.print();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}

async function generateAndPrintFallback(row: CollectionRow, school: SchoolInfo) {
  const pdfBlob = await generateReceiptPDF({
    receiptNumber: row.receipt_number,
    studentName: row.student_name ?? "—",
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    quarter: row.quarter,
    academicYear: row.academic_year,
    feeType: row.fee_type,
    collectedAt: new Date(`${row.collection_date}T12:00:00`).toISOString(),
    amountInWords: amountInWords(Number(row.amount)),
    collectedBy: row.collected_by,
    policyNotes: DEFAULT_POLICY_NOTES,
    chequeNumber: row.cheque_number,
    chequeBank: row.cheque_bank,
    chequeDate: row.cheque_date,
    onlineTransactionId: row.online_transaction_id,
    onlineTransactionRef: row.online_transaction_ref,
    schoolName: school.name,
    schoolAddress: school.address,
    schoolLogoUrl: school.logoUrl ?? undefined,
    standard: row.student_standard,
    division: row.student_division,
    rollNumber: row.student_roll_number,
    grNo: row.student_gr_no,
  });
  const url = URL.createObjectURL(pdfBlob);
  const w = window.open(url, "_blank");
  if (w) w.onload = () => w.print();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function downloadReceipt(row: CollectionRow, school: SchoolInfo) {
  getReceiptData(row).then(async (data) => {
    if (!data) {
      downloadFallback(row, school);
      return;
    }
    const pdfBlob = await generateReceiptPDF({
      receiptNumber: data.receiptNumber,
      studentName: data.studentName,
      amount: data.amount,
      paymentMode: data.paymentMode,
      quarter: data.quarter,
      academicYear: data.academicYear,
      feeType: data.feeType,
      collectedAt: data.collectedAt,
      amountInWords: amountInWords(data.amount),
      collectedBy: data.collectedBy,
      policyNotes: DEFAULT_POLICY_NOTES,
      chequeNumber: data.chequeNumber,
      chequeBank: data.chequeBank,
      chequeDate: data.chequeDate,
      onlineTransactionId: data.onlineTransactionId,
      onlineTransactionRef: data.onlineTransactionRef,
      schoolName: school.name,
      schoolAddress: school.address,
      schoolLogoUrl: school.logoUrl ?? undefined,
      standard: data.standard,
      division: data.division,
      rollNumber: data.rollNumber,
      grNo: data.grNo,
      totalFees: data.totalFees,
      outstandingAfterPayment: data.outstandingAfterPayment,
    });
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${data.receiptNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

async function downloadFallback(row: CollectionRow, school: SchoolInfo) {
  const pdfBlob = await generateReceiptPDF({
    receiptNumber: row.receipt_number,
    studentName: row.student_name ?? "—",
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    quarter: row.quarter,
    academicYear: row.academic_year,
    feeType: row.fee_type,
    collectedAt: new Date(`${row.collection_date}T12:00:00`).toISOString(),
    amountInWords: amountInWords(Number(row.amount)),
    collectedBy: row.collected_by,
    policyNotes: DEFAULT_POLICY_NOTES,
    chequeNumber: row.cheque_number,
    chequeBank: row.cheque_bank,
    chequeDate: row.cheque_date,
    onlineTransactionId: row.online_transaction_id,
    onlineTransactionRef: row.online_transaction_ref,
    schoolName: school.name,
    schoolAddress: school.address,
    schoolLogoUrl: school.logoUrl ?? undefined,
    standard: row.student_standard,
    division: row.student_division,
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
  const school = useSchoolSettings();
  const { toast } = useToast();
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    payment_mode: "cash",
    cheque_number: "",
    cheque_bank: "",
    cheque_date: "",
    online_transaction_id: "",
    online_transaction_ref: "",
    modification_remarks: "",
  });

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

  const openEdit = (row: CollectionRow) => {
    setEditingRowId(row.id);
    setEditForm({
      payment_mode: (row.payment_mode as PaymentMode) || "cash",
      cheque_number: row.cheque_number ?? "",
      cheque_bank: row.cheque_bank ?? "",
      cheque_date: row.cheque_date ?? "",
      online_transaction_id: row.online_transaction_id ?? "",
      online_transaction_ref: row.online_transaction_ref ?? "",
      modification_remarks: "",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingRowId) return;
    setSaving(true);
    const result = await updateFeeCollection(editingRowId, {
      paymentMode: editForm.payment_mode,
      chequeNumber: editForm.cheque_number,
      chequeBank: editForm.cheque_bank,
      chequeDate: editForm.cheque_date,
      onlineTransactionId: editForm.online_transaction_id,
      onlineTransactionRef: editForm.online_transaction_ref,
      modificationRemarks: editForm.modification_remarks,
    });
    setSaving(false);

    if (!result.ok) {
      toast({
        variant: "destructive",
        title: "Could not update collection",
        description: result.error,
      });
      return;
    }

    toast({
      title: "Collection updated",
      description: "Payment details were updated successfully.",
    });
    setEditOpen(false);
    setEditingRowId(null);
    loadCollections();
    window.dispatchEvent(new Event("fee-collection-added"));
  };

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const toggleRow = (id: string) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) return null;
  if (collections.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-4 sm:pt-6">
        <h3 className="font-medium mb-3 text-sm sm:text-base">Latest 20 collections</h3>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">Receipt</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden sm:table-cell">Qtr</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="w-20 sm:w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.flatMap((row) => [
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs hidden sm:table-cell">{row.receipt_number}</TableCell>
                  <TableCell className="font-medium">
                    {row.student_name ?? "—"}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRow(row.id)}
                      className="ml-1 h-7 px-1.5 sm:hidden"
                    >
                      {expandedRows[row.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      <span className="text-[10px]">Details</span>
                    </Button>
                  </TableCell>
                  <TableCell>{Number(row.amount).toLocaleString()}</TableCell>
                  <TableCell className="hidden sm:table-cell">Q{row.quarter}</TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {formatFeeCollectionDisplayDate(row.collection_date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5 sm:gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                        onClick={() => openEdit(row)}
                        aria-label="Edit payment details"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                        onClick={() =>
                          downloadReceipt(row, {
                            name: school.name,
                            address: school.address,
                            logoUrl: school.logoUrl,
                          })
                        }
                        aria-label="Download receipt"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8 hidden sm:inline-flex"
                        onClick={() =>
                          printReceipt(row, {
                            name: school.name,
                            address: school.address,
                            logoUrl: school.logoUrl,
                          })
                        }
                        aria-label="Print receipt"
                      >
                        <Printer className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>,
                expandedRows[row.id] ? (
                  <TableRow key={`${row.id}-details`} className="sm:hidden bg-muted/30">
                    <TableCell colSpan={3} className="text-xs space-y-1">
                      <div><span className="text-muted-foreground">Receipt:</span> {row.receipt_number}</div>
                      <div><span className="text-muted-foreground">Quarter:</span> Q{row.quarter} &middot; {row.academic_year}</div>
                      <div><span className="text-muted-foreground">Date:</span> {formatFeeCollectionDisplayDate(row.collection_date)}</div>
                      <div><span className="text-muted-foreground">Mode:</span> {row.payment_mode}</div>
                    </TableCell>
                  </TableRow>
                ) : null,
              ])}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Collection Payment Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select
                value={editForm.payment_mode}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    payment_mode: value as PaymentMode,
                  }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.payment_mode === "cheque" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cheque Number</Label>
                  <Input
                    className="h-9"
                    value={editForm.cheque_number}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, cheque_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cheque Date</Label>
                  <DatePicker
                    value={editForm.cheque_date}
                    onChange={(isoDate) => setEditForm((prev) => ({ ...prev, cheque_date: isoDate }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Bank</Label>
                  <Input
                    className="h-9"
                    value={editForm.cheque_bank}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, cheque_bank: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {editForm.payment_mode === "online" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Transaction ID</Label>
                  <Input
                    className="h-9"
                    value={editForm.online_transaction_id}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        online_transaction_id: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transaction Ref</Label>
                  <Input
                    className="h-9"
                    value={editForm.online_transaction_ref}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        online_transaction_ref: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Modification Remarks</Label>
              <Textarea
                rows={3}
                value={editForm.modification_remarks}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    modification_remarks: e.target.value,
                  }))
                }
                placeholder="Enter reason for updating payment details"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
