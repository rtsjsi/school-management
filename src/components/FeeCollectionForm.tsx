"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateReceiptPDF, amountInWords } from "@/lib/receipt-pdf";
import { AcademicYearSelect } from "@/components/AcademicYearSelect";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { useToast } from "@/hooks/use-toast";
import { annualNetFeeLiability, linesWithNetAfterConcession } from "@/lib/fee-concession";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;
/** Stored on `fee_collections` / receipt label; amount field sums all fee types for the quarter. */
const COLLECTION_FEE_TYPE = "education_fee";

const DEFAULT_POLICY_NOTES = [
  "(1) Fees will not be refunded in any case.",
  "(2) Fees are not transferable.",
  "(3) Cheque payment subject to realisation.",
];

type StudentOption = {
  id: string;
  full_name: string;
  standard?: string;
  division?: string;
  roll_number?: number;
  gr_number?: string;
  fee_concession_amount?: number | null;
};

function formatStudentDisplay(s: StudentOption): string {
  const cls = s.standard
    ? ` (${s.standard}${s.division ? "-" + s.division : ""})`
    : "";
  const gr = s.gr_number ? ` · ${s.gr_number}` : "";
  return `${s.full_name}${cls}${gr}`;
}

export default function FeeCollectionForm({
  students,
  collectorProfileId,
  collectorFullName,
}: {
  students: StudentOption[];
  /** Stored as fee_collections.collected_by (profiles.id) */
  collectorProfileId: string;
  /** Shown on receipt PDF (profiles.full_name) */
  collectorFullName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const todayIso = new Date().toISOString().slice(0, 10);
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
    collection_date: todayIso,
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
  const [studentInput, setStudentInput] = useState("");
  const [studentSuggestionsOpen, setStudentSuggestionsOpen] = useState(false);
  const studentComboRef = useRef<HTMLDivElement>(null);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (classFilter !== "all" && s.standard !== classFilter) return false;
      if (divisionFilter !== "all" && s.division !== divisionFilter) return false;
      return true;
    });
  }, [students, classFilter, divisionFilter]);

  const studentSuggestions = useMemo(() => {
    const q = studentInput.trim().toLowerCase();
    const base = filteredStudents;
    if (!q) return base.slice(0, 25);
    return base
      .filter((s) => {
        const blob = [s.full_name, s.gr_number, s.standard, s.division].filter(Boolean).join(" ").toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 50);
  }, [filteredStudents, studentInput]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (studentComboRef.current?.contains(e.target as Node)) return;
      setStudentSuggestionsOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

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
        .select("id, standards(name), fee_structure_items(fee_type, quarter, amount)")
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
      const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
      const lines = linesWithNetAfterConcession(items, selectedStudent.fee_concession_amount ?? null);
      const quarterNum = parseInt(form.quarter);
      const totalForQuarter = lines
        .filter((l) => l.quarter === quarterNum)
        .reduce((sum, l) => sum + l.net, 0);
      setStructureAmount(totalForQuarter > 0 ? totalForQuarter : null);
    })();
  }, [selectedStudent?.standard, selectedStudent?.fee_concession_amount, form.quarter, form.academic_year]);

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
    if (form.payment_mode === "cheque") {
      if (!form.cheque_number?.trim()) {
        const message = "Cheque number is required for cheque payment.";
        setError(message);
        toast({
          variant: "destructive",
          title: "Missing cheque details",
          description: message,
        });
        return;
      }
      if (!form.cheque_date?.trim()) {
        const message = "Cheque date is required for cheque payment.";
        setError(message);
        toast({
          variant: "destructive",
          title: "Missing cheque date",
          description: message,
        });
        return;
      }
    }
    if (form.payment_mode === "online" && !form.online_transaction_id?.trim()) {
      const message = "Transaction ID is required for online payment.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Missing transaction ID",
        description: message,
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const collectionDateIso = form.collection_date;
      if (!collectionDateIso) {
        const message = "Collection date is required.";
        setError(message);
        toast({
          variant: "destructive",
          title: "Invalid collection date",
          description: message,
        });
        setLoading(false);
        return;
      }

      const { data: existingCollections } = await supabase
        .from("fee_collections")
        .select("id")
        .eq("student_id", form.student_id)
        .eq("academic_year", form.academic_year)
        .eq("quarter", parseInt(form.quarter))
        .eq("fee_type", COLLECTION_FEE_TYPE)
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
          fee_type: COLLECTION_FEE_TYPE,
          quarter: parseInt(form.quarter),
          academic_year: form.academic_year,
          payment_mode: form.payment_mode,
          cheque_number: form.payment_mode === "cheque" ? form.cheque_number.trim() : null,
          cheque_bank: form.payment_mode === "cheque" ? form.cheque_bank.trim() || null : null,
          cheque_date:
            form.payment_mode === "cheque" && form.cheque_date.trim()
              ? form.cheque_date.trim()
              : null,
          online_transaction_id:
            form.payment_mode === "online" ? form.online_transaction_id.trim() : null,
          online_transaction_ref: form.payment_mode === "online" ? form.online_transaction_ref.trim() || null : null,
          receipt_number: receiptNumber,
          collection_date: collectionDateIso,
          collected_by: collectorProfileId,
        })
        .select("id, students(full_name), collection_date")
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
      let totalFees: number | undefined;
      const { data: structures } = await supabase
        .from("fee_structures")
        .select("id, standards(name), fee_structure_items(fee_type, quarter, amount)")
        .eq("academic_year", form.academic_year);
      const structure = (structures ?? []).find((st: { standards?: { name?: string } | { name?: string }[] | null }) => {
        const std = Array.isArray(st.standards)
          ? (st.standards[0] as { name?: string })?.name
          : (st.standards as { name?: string } | null)?.name;
        return std && std === (selectedStudent?.standard ?? "");
      });
      if (structure) {
        const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
        const totalDues = annualNetFeeLiability(items, selectedStudent?.fee_concession_amount ?? null);
        totalFees = totalDues;
        const collectionRow = collection as { id?: string; collection_date?: string };
        const { data: paidRows } = await supabase
          .from("fee_collections")
          .select("id, amount, collection_date")
          .eq("student_id", form.student_id)
          .eq("academic_year", form.academic_year)
          .order("collection_date", { ascending: true })
          .order("id", { ascending: true });
        const cid = collectionRow.id ?? "";
        const cTime = new Date(
          collectionRow.collection_date ? `${collectionRow.collection_date}T12:00:00` : Date.now()
        ).getTime();
        let totalPaidAsOf = 0;
        for (const r of paidRows ?? []) {
          const rTime = new Date(`${r.collection_date}T12:00:00`).getTime();
          if (rTime < cTime || (rTime === cTime && r.id <= cid)) {
            totalPaidAsOf += Number(r.amount);
          }
        }
        outstandingAfterPayment = Math.max(0, totalDues - totalPaidAsOf);
      }

      const pdfBlob = await generateReceiptPDF({
        receiptNumber,
        studentName,
        amount,
        paymentMode: form.payment_mode,
        quarter: parseInt(form.quarter),
        academicYear: form.academic_year,
        feeType: COLLECTION_FEE_TYPE,
        collectedAt: new Date(
          ((collection as { collection_date?: string })?.collection_date ?? todayIso) + "T12:00:00"
        ).toISOString(),
        amountInWords: amountInWords(amount),
        collectedBy: collectorFullName,
        policyNotes: DEFAULT_POLICY_NOTES,
        chequeNumber: form.payment_mode === "cheque" ? form.cheque_number : undefined,
        chequeBank: form.payment_mode === "cheque" ? form.cheque_bank : undefined,
        chequeDate: form.payment_mode === "cheque" && form.cheque_date ? form.cheque_date : undefined,
        onlineTransactionId: form.payment_mode === "online" ? form.online_transaction_id : undefined,
        onlineTransactionRef: form.payment_mode === "online" ? form.online_transaction_ref : undefined,
        schoolName: school.name,
        schoolAddress: school.address,
        schoolLogoUrl: school.logoUrl ?? undefined,
        standard: selectedStudent?.standard,
        division: selectedStudent?.division,
        rollNumber: selectedStudent?.roll_number,
        grNo: selectedStudent?.gr_number ?? selectedStudent?.id?.slice(0, 8),
        totalFees,
        outstandingAfterPayment,
      });

      const url = URL.createObjectURL(pdfBlob);
      let blobRevoked = false;
      const revokeBlob = () => {
        if (blobRevoked) return;
        blobRevoked = true;
        URL.revokeObjectURL(url);
      };

      // New tab + print keeps the system print dialog stable (hidden iframe + early revoke was closing it).
      const printWin = window.open(url, "_blank", "noopener,noreferrer");
      if (printWin) {
        let didPrint = false;
        const runPrint = () => {
          if (didPrint) return;
          didPrint = true;
          try {
            printWin.focus();
            printWin.print();
          } catch {
            /* ignore */
          }
        };
        printWin.addEventListener("afterprint", () => revokeBlob(), { once: true });
        printWin.addEventListener("load", runPrint, { once: true });
        setTimeout(runPrint, 600);
        setTimeout(() => revokeBlob(), 10 * 60 * 1000);
      } else {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          const cw = iframe.contentWindow;
          const teardown = () => {
            revokeBlob();
            iframe.remove();
          };
          if (cw) {
            cw.addEventListener("afterprint", teardown, { once: true });
            try {
              cw.focus();
              cw.print();
            } catch {
              teardown();
            }
          }
          setTimeout(teardown, 10 * 60 * 1000);
        };
      }

      setStudentInput("");
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
        collection_date: todayIso,
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

  const concessionTitle =
    selectedStudent && Number(selectedStudent.fee_concession_amount) > 0
      ? `Annual concession ₹${Number(selectedStudent.fee_concession_amount).toLocaleString("en-IN")} applied across all fee lines; amount shown is this quarter’s net total.`
      : undefined;

  return (
    <div className="rounded-lg border border-border/60 bg-background/80 shadow-sm">
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 overflow-visible">
        {error && (
          <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded-md">{error}</p>
        )}

        {/* Collection date (left) · Receipt no. (right, full number) */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 shrink-0">
            <Label htmlFor="collection_date" className="text-xs font-medium text-muted-foreground">
              Collection Date *
            </Label>
            <Input
              id="collection_date"
              type="date"
              value={form.collection_date}
              onChange={(e) => setForm((p) => ({ ...p, collection_date: e.target.value }))}
              className="h-9 text-sm w-[11rem]"
            />
          </div>
          <div className="space-y-1 min-w-0 max-w-full sm:max-w-[min(100%,24rem)] text-right ml-auto">
            <Label className="text-xs font-medium text-muted-foreground block">Receipt No.</Label>
            <p
              className="font-mono text-sm font-medium leading-snug break-all text-foreground min-h-[2.25rem] flex items-center justify-end sm:justify-end"
              title={receiptNumber || undefined}
            >
              {receiptNumber || "—"}
            </p>
          </div>
        </div>

        {/* Filters + student */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <div className="space-y-1 col-span-1">
            <Label className="text-xs font-medium text-muted-foreground">Std</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-9 text-sm">
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
          <div className="space-y-1 col-span-1">
            <Label className="text-xs font-medium text-muted-foreground">Div</Label>
            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger className="h-9 text-sm">
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
          <div className="space-y-1 col-span-2 sm:col-span-4 relative" ref={studentComboRef}>
            <Label htmlFor="student_search" className="text-xs font-medium text-muted-foreground">
              Student *
            </Label>
            <Input
              id="student_search"
              type="text"
              autoComplete="off"
              role="combobox"
              aria-expanded={studentSuggestionsOpen}
              aria-controls="student-suggestions-list"
              aria-autocomplete="list"
              placeholder="Type name, GR no., class…"
              value={studentInput}
              onChange={(e) => {
                const v = e.target.value;
                setStudentInput(v);
                setStudentSuggestionsOpen(true);
                if (form.student_id) {
                  const cur = students.find((x) => x.id === form.student_id);
                  if (cur && formatStudentDisplay(cur) !== v) {
                    setForm((p) => ({ ...p, student_id: "" }));
                  }
                }
              }}
              onFocus={() => setStudentSuggestionsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setStudentSuggestionsOpen(false);
              }}
              className="h-9 text-sm"
            />
            {studentSuggestionsOpen && (
              <ul
                id="student-suggestions-list"
                role="listbox"
                className="absolute left-0 right-0 top-full z-50 mt-0.5 max-h-52 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md py-1"
              >
                {studentSuggestions.length === 0 ? (
                  <li className="px-2 py-2 text-xs text-muted-foreground text-center">No match.</li>
                ) : (
                  studentSuggestions.map((s) => (
                    <li key={s.id} role="option" aria-selected={form.student_id === s.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                          form.student_id === s.id && "bg-accent/60"
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setForm((p) => ({ ...p, student_id: s.id }));
                          setStudentInput(formatStudentDisplay(s));
                          setStudentSuggestionsOpen(false);
                        }}
                      >
                        <span className="block truncate">{formatStudentDisplay(s)}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Year + quarter chips + net — core entry row */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-end">
          <div className="w-full sm:w-[11rem] shrink-0">
            <AcademicYearSelect
              value={form.academic_year}
              onChange={(v) => setForm((p) => ({ ...p, academic_year: v }))}
              id="academic_year"
              label="Year *"
              compact
            />
          </div>
          <div className="space-y-1 min-w-0 flex-1 sm:flex-initial">
            <span className="text-xs font-medium text-muted-foreground block">Quarter *</span>
            <div className="flex gap-1 flex-wrap" role="group" aria-label="Quarter">
              {([1, 2, 3, 4] as const).map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant={form.quarter === String(q) ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 min-w-[2.75rem] px-2 text-sm font-medium",
                    form.quarter === String(q) ? "" : "border-muted-foreground/25 text-muted-foreground"
                  )}
                  onClick={() => setForm((p) => ({ ...p, quarter: String(q) }))}
                >
                  Q{q}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1 w-full sm:w-36 sm:ml-auto shrink-0">
            <Label htmlFor="amount" className="text-xs font-medium text-muted-foreground">
              Net ₹ *
            </Label>
            <Input
              id="amount"
              type="number"
              min={0}
              step={0.01}
              value={form.amount}
              readOnly
              title={concessionTitle}
              className={cn(
                "h-9 text-base font-semibold tabular-nums bg-muted/80 border-transparent",
                concessionTitle && "cursor-help"
              )}
              placeholder={
                structureAmount === null && selectedStudent ? "—" : "0"
              }
            />
          </div>
        </div>

        {/* Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 border-t border-border/50">
          <div className="space-y-1">
            <Label htmlFor="payment_mode" className="text-xs font-medium text-muted-foreground">
              Pay *
            </Label>
            <Select
              value={form.payment_mode}
              onValueChange={(v) => setForm((p) => ({ ...p, payment_mode: v }))}
            >
              <SelectTrigger id="payment_mode" className="h-9 text-sm">
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
              <div className="space-y-1">
                <Label htmlFor="cheque_bank" className="text-xs font-medium text-muted-foreground">
                  Bank
                </Label>
                <Input
                  id="cheque_bank"
                  value={form.cheque_bank}
                  onChange={(e) => setForm((p) => ({ ...p, cheque_bank: e.target.value }))}
                  placeholder="Bank"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cheque_number" className="text-xs font-medium text-muted-foreground">
                  Chq # *
                </Label>
                <Input
                  id="cheque_number"
                  value={form.cheque_number}
                  onChange={(e) => setForm((p) => ({ ...p, cheque_number: e.target.value }))}
                  placeholder="No."
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cheque_date" className="text-xs font-medium text-muted-foreground">
                  Chq date *
                </Label>
                <Input
                  id="cheque_date"
                  type="date"
                  value={form.cheque_date}
                  onChange={(e) => setForm((p) => ({ ...p, cheque_date: e.target.value }))}
                  className="h-9 text-sm"
                  required
                />
              </div>
            </>
          )}

          {form.payment_mode === "online" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="online_txn_id" className="text-xs font-medium text-muted-foreground">
                  Txn ID *
                </Label>
                <Input
                  id="online_txn_id"
                  value={form.online_transaction_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, online_transaction_id: e.target.value }))
                  }
                  className="h-9 text-sm"
                  placeholder="ID"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="online_txn_ref" className="text-xs font-medium text-muted-foreground">
                  Ref
                </Label>
                <Input
                  id="online_txn_ref"
                  value={form.online_transaction_ref}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, online_transaction_ref: e.target.value }))
                  }
                  className="h-9 text-sm"
                  placeholder="Ref"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-start pt-1">
          <SubmitButton
            loading={loading}
            loadingLabel="Saving…"
            className="h-9 px-4 text-sm font-semibold shadow-none"
          >
            Save & print
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
