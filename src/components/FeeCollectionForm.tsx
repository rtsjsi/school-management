"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { generateReceiptPDF, amountInWords } from "@/lib/receipt-pdf";
import { AcademicYearSelect } from "@/components/AcademicYearSelect";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { useToast } from "@/hooks/use-toast";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;
const FEE_TYPE = "education_fee";
const DEFAULT_POLICY_NOTES = [
  "(1) Fees will not be refunded in any case.",
  "(2) Fees are not transferable.",
  "(3) Cheque payment subject to realisation.",
];

type StudentOption = { id: string; full_name: string; standard?: string; division?: string; roll_number?: number; student_id?: string };

export default function FeeCollectionForm({
  students,
  receivedBy,
}: {
  students: StudentOption[];
  receivedBy?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [structureAmount, setStructureAmount] = useState<number | null>(null);
  const [form, setForm] = useState({
    student_id: "",
    amount: "",
    quarter: "1",
    academic_year: "",
    payment_mode: "cash" as string,
    cheque_number: "",
    cheque_bank: "",
    cheque_date: "",
    online_transaction_id: "",
    online_transaction_ref: "",
    collection_date: new Date().toISOString().slice(0, 10),
  });

  const school = useSchoolSettings();
  const classes = useMemo(() => {
    const standards = Array.from(new Set(students.map((s) => s.standard).filter(Boolean))) as string[];
    return standards.sort((a, b) => a.localeCompare(b));
  }, [students]);

  const divisions = useMemo(() => {
    const secs = Array.from(new Set(students.map((s) => s.division).filter(Boolean))) as string[];
    return secs.sort((a, b) => a.localeCompare(b));
  }, [students]);

  const [classFilter, setClassFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (classFilter !== "all" && s.standard !== classFilter) return false;
      if (divisionFilter !== "all" && s.division !== divisionFilter) return false;
      return true;
    });
  }, [students, classFilter, divisionFilter]);

  useEffect(() => {
    fetch("/api/receipt-number")
      .then((r) => r.json())
      .then((d) => d.receiptNumber && setReceiptNumber(d.receiptNumber))
      .catch(() => {});
  }, []);

  const selectedStudent = students.find((s) => s.id === form.student_id);

  useEffect(() => {
    if (!selectedStudent?.standard || !form.academic_year) {
      setStructureAmount(null);
      return;
    }
    const supabase = createClient();
    (async () => {
      const { data: structures } = await supabase
        .from("fee_structures")
        .select("id, standards(name), fee_structure_items(quarter, amount)")
        .eq("academic_year", form.academic_year);
      const structure = (structures ?? []).find((st: { standards?: { name?: string } | { name?: string }[] | null }) => {
        const std = Array.isArray(st.standards)
          ? (st.standards[0] as { name?: string })?.name
          : (st.standards as { name?: string } | null)?.name;
        return std && std === (selectedStudent.standard ?? "");
      });
      if (!structure) {
        setStructureAmount(null);
        return;
      }
      const items = (structure.fee_structure_items as { quarter: number; amount: number }[]) ?? [];
      const quarterNum = parseInt(form.quarter);
      const totalForQuarter = items
        .filter((i) => i.quarter === quarterNum)
        .reduce((sum, i) => sum + Number(i.amount ?? 0), 0);
      setStructureAmount(totalForQuarter > 0 ? totalForQuarter : null);
    })();
  }, [selectedStudent?.standard, form.quarter, form.academic_year]);

  useEffect(() => {
    if (structureAmount != null) {
      setForm((p) => ({ ...p, amount: String(structureAmount) }));
    } else {
      setForm((p) => ({ ...p, amount: "" }));
    }
  }, [structureAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.student_id) {
      const message = "Please select a student.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Missing student",
        description: message,
      });
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) {
      const message =
        "Amount is required. Ensure fee structure exists for this student's standard and quarter.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: message,
      });
      return;
    }
    if (form.payment_mode === "cheque" && !form.cheque_number?.trim()) {
      const message = "Cheque number is required for cheque payment.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Missing cheque details",
        description: message,
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const collectedAt = form.collection_date
        ? new Date(form.collection_date + "T12:00:00").toISOString()
        : new Date().toISOString();

      let enrollmentId: string | null = null;
      const { data: ayRow } = await supabase
        .from("academic_years")
        .select("id")
        .eq("name", form.academic_year)
        .maybeSingle();
      if (ayRow?.id) {
        const { data: enrollRow } = await supabase
          .from("student_enrollments")
          .select("id")
          .eq("student_id", form.student_id)
          .eq("academic_year_id", ayRow.id)
          .maybeSingle();
        enrollmentId = enrollRow?.id ?? null;
      }

      const { data: existingCollections } = await supabase
        .from("fee_collections")
        .select("id")
        .eq("student_id", form.student_id)
        .eq("academic_year", form.academic_year)
        .eq("quarter", parseInt(form.quarter))
        .eq("fee_type", FEE_TYPE)
        .limit(1);

      if (existingCollections && existingCollections.length > 0) {
        const message =
          "Fees for this quarter and academic year have already been collected for this student.";
        setError(message);
        toast({
          variant: "destructive",
          title: "Duplicate collection",
          description: message,
        });
        setLoading(false);
        return;
      }

      const { data: collection, error: err } = await supabase
        .from("fee_collections")
        .insert({
          student_id: form.student_id,
          amount,
          fee_type: FEE_TYPE,
          quarter: parseInt(form.quarter),
          academic_year: form.academic_year,
          payment_mode: form.payment_mode,
          concession_amount: 0,
          period_label: null,
          cheque_number: form.payment_mode === "cheque" ? form.cheque_number.trim() : null,
          cheque_bank: form.payment_mode === "cheque" ? form.cheque_bank.trim() || null : null,
          cheque_date: form.payment_mode === "cheque" && form.cheque_date ? form.cheque_date : null,
          online_transaction_id: form.payment_mode === "online" ? form.online_transaction_id.trim() || null : null,
          online_transaction_ref: form.payment_mode === "online" ? form.online_transaction_ref.trim() || null : null,
          receipt_number: receiptNumber,
          collected_at: collectedAt,
          collected_by: receivedBy ?? null,
          enrollment_id: enrollmentId,
        })
        .select("id, students(full_name), collected_at")
        .single();

      if (err) {
        setError(err.message);
        toast({
          variant: "destructive",
          title: "Could not collect fee",
          description: err.message,
        });
        return;
      }

      const studentName = Array.isArray(collection?.students)
        ? (collection?.students[0] as { full_name?: string })?.full_name ?? "—"
        : (collection?.students as { full_name?: string } | null)?.full_name ?? "—";

      const selectedStudent = students.find((s) => s.id === form.student_id);

      let outstandingAfterPayment: number | undefined;
      const { data: structures } = await supabase
        .from("fee_structures")
        .select("id, standards(name), fee_structure_items(quarter, amount)")
        .eq("academic_year", form.academic_year);
      const structure = (structures ?? []).find((st: { standards?: { name?: string } | { name?: string }[] | null }) => {
        const std = Array.isArray(st.standards)
          ? (st.standards[0] as { name?: string })?.name
          : (st.standards as { name?: string } | null)?.name;
        return std && std === (selectedStudent?.standard ?? "");
      });
      if (structure) {
        const items = (structure.fee_structure_items as { quarter: number; amount: number }[]) ?? [];
        const totalDues = items.reduce((s, i) => s + Number(i.amount), 0);
        const { data: paidRows } = await supabase
          .from("fee_collections")
          .select("amount")
          .eq("student_id", form.student_id)
          .eq("academic_year", form.academic_year);
        const totalPaid = (paidRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
        const outstanding = Math.max(0, totalDues - totalPaid);
        if (outstanding > 0) outstandingAfterPayment = outstanding;
      }

      const pdfBlob = generateReceiptPDF({
        receiptNumber,
        studentName,
        amount,
        paymentMode: form.payment_mode,
        quarter: parseInt(form.quarter),
        academicYear: form.academic_year,
        feeType: FEE_TYPE,
        collectedAt: new Date((collection as { collected_at?: string })?.collected_at ?? Date.now()).toISOString(),
        amountInWords: amountInWords(amount),
        receivedBy,
        policyNotes: DEFAULT_POLICY_NOTES,
        chequeNumber: form.payment_mode === "cheque" ? form.cheque_number : undefined,
        chequeBank: form.payment_mode === "cheque" ? form.cheque_bank : undefined,
        chequeDate: form.payment_mode === "cheque" && form.cheque_date ? form.cheque_date : undefined,
        onlineTransactionId: form.payment_mode === "online" ? form.online_transaction_id : undefined,
        onlineTransactionRef: form.payment_mode === "online" ? form.online_transaction_ref : undefined,
        schoolName: school.name,
        schoolAddress: school.address,
        standard: selectedStudent?.standard,
        division: selectedStudent?.division,
        rollNumber: selectedStudent?.roll_number,
        grNo: selectedStudent?.student_id ?? selectedStudent?.id?.slice(0, 8),
        outstandingAfterPayment,
      });

      const url = URL.createObjectURL(pdfBlob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.print();
        } catch {
          window.open(url, "_blank");
        }
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(iframe);
        }, 1000);
      };

      setForm({
        student_id: "",
        amount: "",
        quarter: "1",
        academic_year: form.academic_year,
        payment_mode: "cash",
        cheque_number: "",
        cheque_bank: "",
        cheque_date: "",
        online_transaction_id: "",
        online_transaction_ref: "",
        collection_date: new Date().toISOString().slice(0, 10),
      });
      fetch("/api/receipt-number")
        .then((r) => r.json())
        .then((d) => d.receiptNumber && setReceiptNumber(d.receiptNumber))
        .catch(() => {});

      window.dispatchEvent(new CustomEvent("fee-collection-added"));
      router.refresh();
    } catch {
      const message = "Something went wrong.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Unexpected error",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Receipt No.</Label>
              <Input value={receiptNumber} readOnly className="bg-muted font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Collected By</Label>
              <Input value={receivedBy ?? "—"} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="collection_date">Collection Date *</Label>
              <Input
                id="collection_date"
                type="date"
                value={form.collection_date}
                onChange={(e) => setForm((p) => ({ ...p, collection_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Standard</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Division</Label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student">Student *</Label>
              <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="student"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={studentPickerOpen}
                    className="w-full justify-between font-normal h-10 px-3"
                  >
                    <span className="truncate text-left">
                      {selectedStudent
                        ? `${selectedStudent.full_name}${
                            selectedStudent.standard
                              ? ` (${selectedStudent.standard}${
                                  selectedStudent.division ? "-" + selectedStudent.division : ""
                                })`
                              : ""
                          }`
                        : "Search or select student…"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[min(100vw-2rem,28rem)]" align="start">
                  <Command>
                    <CommandInput placeholder="Type name, GR no., standard…" />
                    <CommandList>
                      <CommandEmpty>No student matches filters.</CommandEmpty>
                      <CommandGroup>
                        {filteredStudents.map((s) => {
                          const searchBlob = [s.full_name, s.student_id, s.standard, s.division]
                            .filter(Boolean)
                            .join(" ");
                          return (
                            <CommandItem
                              key={s.id}
                              value={searchBlob}
                              onSelect={() => {
                                setForm((p) => ({ ...p, student_id: s.id }));
                                setStudentPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  form.student_id === s.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="truncate">
                                {s.full_name}
                                {s.standard
                                  ? ` (${s.standard}${s.division ? "-" + s.division : ""})`
                                  : ""}
                                {s.student_id ? ` · ${s.student_id}` : ""}
                              </span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AcademicYearSelect
              value={form.academic_year}
              onChange={(v) => setForm((p) => ({ ...p, academic_year: v }))}
              id="academic_year"
              label="Academic Year *"
            />
            <div className="space-y-1.5">
              <Label htmlFor="quarter">Quarter *</Label>
              <Select
                value={form.quarter}
                onValueChange={(v) => setForm((p) => ({ ...p, quarter: v }))}
              >
                <SelectTrigger id="quarter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                  <SelectItem value="3">Q3</SelectItem>
                  <SelectItem value="4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (from fee structure) *</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                value={form.amount}
                readOnly
                className="bg-muted"
                placeholder={
                  structureAmount === null && selectedStudent
                    ? "No structure for this standard / quarter"
                    : "0.00"
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment_mode">Payment Mode *</Label>
              <Select
                value={form.payment_mode}
                onValueChange={(v) => setForm((p) => ({ ...p, payment_mode: v }))}
              >
                <SelectTrigger id="payment_mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.payment_mode === "cheque" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cheque_number">Cheque Number *</Label>
                  <Input
                    id="cheque_number"
                    value={form.cheque_number}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, cheque_number: e.target.value }))
                    }
                    placeholder="e.g. 123456"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cheque_bank">Bank</Label>
                  <Input
                    id="cheque_bank"
                    value={form.cheque_bank}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, cheque_bank: e.target.value }))
                    }
                    placeholder="Bank name"
                  />
                </div>
              </>
            )}

            {form.payment_mode === "online" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="online_txn_id">Transaction ID</Label>
                  <Input
                    id="online_txn_id"
                    value={form.online_transaction_id}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, online_transaction_id: e.target.value }))
                    }
                    placeholder="Txn ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="online_txn_ref">Reference</Label>
                  <Input
                    id="online_txn_ref"
                    value={form.online_transaction_ref}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, online_transaction_ref: e.target.value }))
                    }
                    placeholder="Reference no"
                  />
                </div>
              </>
            )}
          </div>

          {form.payment_mode === "cheque" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-start-2 md:col-span-1">
                <Label htmlFor="cheque_date">Cheque Date</Label>
                <Input
                  id="cheque_date"
                  type="date"
                  value={form.cheque_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, cheque_date: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          <div className="flex justify-start">
            <SubmitButton loading={loading} loadingLabel="Saving & printing receipt…">
              Collect Fee & Print Receipt
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
