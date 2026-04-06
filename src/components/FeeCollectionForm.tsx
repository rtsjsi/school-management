"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  is_rte_quota?: boolean | null;
  fee_concession_amount?: number | null;
};

function formatStudentDisplay(s: StudentOption): string {
  const cls = s.standard
    ? ` (${s.standard}${s.division ? "-" + s.division : ""})`
    : "";
  const gr = s.gr_number ? ` · ${s.gr_number}` : "";
  const rte = s.is_rte_quota ? " · RTE" : "";
  return `${s.full_name}${cls}${gr}${rte}`;
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
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(1);
  const [quarterSummary, setQuarterSummary] = useState<
    Record<1 | 2 | 3 | 4, { net: number; paid: number }>
  >({
    1: { net: 0, paid: 0 },
    2: { net: 0, paid: 0 },
    3: { net: 0, paid: 0 },
    4: { net: 0, paid: 0 },
  });
  const [form, setForm] = useState({
    student_id: "",
    academic_year: "",
    payment_mode: "",
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
  const [paymentMethodSelectKey, setPaymentMethodSelectKey] = useState(0);
  const [rtePopupOpen, setRtePopupOpen] = useState(false);
  const [rtePopupStudentName, setRtePopupStudentName] = useState("");
  const studentComboRef = useRef<HTMLDivElement>(null);

  const showRtePopup = (studentName: string) => {
    setRtePopupStudentName(studentName);
    setRtePopupOpen(true);
  };

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

  useEffect(() => {
    if (form.payment_mode !== "cash") return;
    setForm((p) => (p.collection_date === todayIso ? p : { ...p, collection_date: todayIso }));
  }, [form.payment_mode, todayIso]);

  const selectedStudent = students.find((s) => s.id === form.student_id);

  useEffect(() => {
    if (!selectedStudent?.standard || !form.academic_year) {
      setQuarterSummary({
        1: { net: 0, paid: 0 },
        2: { net: 0, paid: 0 },
        3: { net: 0, paid: 0 },
        4: { net: 0, paid: 0 },
      });
      setSelectedQuarter(1);
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
        setQuarterSummary({
          1: { net: 0, paid: 0 },
          2: { net: 0, paid: 0 },
          3: { net: 0, paid: 0 },
          4: { net: 0, paid: 0 },
        });
        setSelectedQuarter(1);
        return;
      }
      const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
      const lines = linesWithNetAfterConcession(items, selectedStudent.fee_concession_amount ?? null);
      const netByQuarter: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      for (const line of lines) {
        if (line.quarter >= 1 && line.quarter <= 4) {
          netByQuarter[line.quarter as 1 | 2 | 3 | 4] += Number(line.net ?? 0);
        }
      }

      const { data: paidRows } = await supabase
        .from("fee_collections")
        .select("quarter, amount")
        .eq("student_id", form.student_id)
        .eq("academic_year", form.academic_year)
        .eq("fee_type", COLLECTION_FEE_TYPE);

      const paidByQuarter: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      for (const row of paidRows ?? []) {
        const q = Number(row.quarter);
        if (q >= 1 && q <= 4) {
          paidByQuarter[q as 1 | 2 | 3 | 4] += Number(row.amount ?? 0);
        }
      }

      setQuarterSummary({
        1: { net: netByQuarter[1], paid: paidByQuarter[1] },
        2: { net: netByQuarter[2], paid: paidByQuarter[2] },
        3: { net: netByQuarter[3], paid: paidByQuarter[3] },
        4: { net: netByQuarter[4], paid: paidByQuarter[4] },
      });

      const firstDueQuarter = ([1, 2, 3, 4] as const).find(
        (q) => netByQuarter[q] - paidByQuarter[q] > 0
      );
      setSelectedQuarter(firstDueQuarter ?? 1);
    })();
  }, [selectedStudent?.standard, selectedStudent?.fee_concession_amount, form.student_id, form.academic_year]);

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
    if (selectedStudent?.is_rte_quota) {
      setError(null);
      showRtePopup(selectedStudent.full_name);
      return;
    }
    const amountDueForQuarter = Math.max(0, quarterSummary[selectedQuarter].net - quarterSummary[selectedQuarter].paid);
    const amount = Number(amountDueForQuarter.toFixed(2));
    if (amount <= 0) {
      const message =
        "No due fees for selected quarter. Please select a quarter with pending due fees.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: message,
      });
      return;
    }
    if (!form.payment_mode) {
      const message = "Please select a payment method.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Missing payment method",
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
        .eq("quarter", selectedQuarter)
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
          quarter: selectedQuarter,
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
        const { data: paidRows } = await supabase
          .from("fee_collections")
          .select("amount, receipt_number")
          .eq("student_id", form.student_id)
          .eq("academic_year", form.academic_year)
          .order("receipt_number", { ascending: true });
        const currentReceipt = receiptNumber ?? "";
        let totalPaidAsOf = 0;
        for (const r of paidRows ?? []) {
          if ((r.receipt_number ?? "") <= currentReceipt) {
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
        quarter: selectedQuarter,
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
        academic_year: form.academic_year,
        payment_mode: "",
        cheque_number: "",
        cheque_bank: "",
        cheque_date: "",
        online_transaction_id: "",
        online_transaction_ref: "",
        collection_date: todayIso,
      });
      setPaymentMethodSelectKey((k) => k + 1);
      setSelectedQuarter(1);
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
            <Label className="text-xs font-medium text-muted-foreground">
              Collection Date
            </Label>
            {form.payment_mode === "cash" ? (
              <p className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm font-medium tabular-nums text-foreground w-[11rem]">
                {new Date(form.collection_date + "T12:00:00").toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            ) : (
              <div className="w-[11rem]">
                <DatePicker
                  value={form.collection_date}
                  onChange={(isoDate) => setForm((p) => ({ ...p, collection_date: isoDate }))}
                  className="h-9 text-sm"
                />
              </div>
            )}
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
                          if (s.is_rte_quota) {
                            setError(null);
                            showRtePopup(s.full_name);
                            setStudentSuggestionsOpen(false);
                            return;
                          }
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
            <div className="flex gap-3 flex-wrap items-center" role="group" aria-label="Quarter">
              {([1, 2, 3, 4] as const).map((q) => (
                (() => {
                  const due = quarterSummary[q].net - quarterSummary[q].paid;
                  const isDisabled = due <= 0;
                  return (
                <label
                  key={q}
                  className={cn(
                    "flex items-center gap-1 text-sm",
                    selectedQuarter === q ? "text-foreground font-medium" : "text-muted-foreground",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Checkbox
                    checked={selectedQuarter === q}
                    disabled={isDisabled}
                    onCheckedChange={(checked) => {
                      if (checked && !isDisabled) setSelectedQuarter(q);
                    }}
                  />
                  Q{q}
                </label>
                  );
                })()
              ))}
            </div>
          </div>
          <div className="space-y-1 w-full sm:w-36 sm:ml-auto shrink-0">
            <Label htmlFor="amount" className="text-xs font-medium text-muted-foreground">
              Due ₹ *
            </Label>
            <Input
              id="amount"
              type="number"
              min={0}
              step={0.01}
              value={Math.max(0, quarterSummary[selectedQuarter].net - quarterSummary[selectedQuarter].paid)}
              readOnly
              title={concessionTitle}
              className={cn(
                "h-9 text-base font-semibold tabular-nums bg-muted/80 border-transparent",
                concessionTitle && "cursor-help"
              )}
              placeholder="0"
            />
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Quarter</th>
                <th className="text-right px-3 py-2 font-medium">Net Fees</th>
                <th className="text-right px-3 py-2 font-medium">Paid Fees</th>
              </tr>
            </thead>
            <tbody>
              {([1, 2, 3, 4] as const).map((q) => (
                <tr key={q} className="border-t">
                  <td className="px-3 py-2">Q{q}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {quarterSummary[q].net.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {quarterSummary[q].paid.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 border-t border-border/50">
          <div className="space-y-1">
            <Label htmlFor="payment_mode" className="text-xs font-medium text-muted-foreground">
              Payment Method *
            </Label>
            <Select
              key={paymentMethodSelectKey}
              value={form.payment_mode || undefined}
              onValueChange={(v) => setForm((p) => ({ ...p, payment_mode: v }))}
            >
              <SelectTrigger id="payment_mode" className="h-9 text-sm">
                <SelectValue placeholder="Select payment method" />
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
                <DatePicker
                  value={form.cheque_date}
                  onChange={(isoDate) => setForm((p) => ({ ...p, cheque_date: isoDate }))}
                  className="h-9 text-sm"
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

      <Dialog open={rtePopupOpen} onOpenChange={setRtePopupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>RTE Student</DialogTitle>
            <DialogDescription>
              {rtePopupStudentName
                ? `${rtePopupStudentName} is under RTE quota, so no fee collection is required.`
                : "This student is under RTE quota, so no fee collection is required."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setRtePopupOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
