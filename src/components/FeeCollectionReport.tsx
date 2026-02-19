"use client";

import { useState, useEffect } from "react";
import { getFeeTypeLabel } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText } from "lucide-react";
import { fetchClasses, fetchFinancialYears } from "@/lib/lov";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;
const QUARTERS = [1, 2, 3, 4] as const;

type ReportRow = {
  id: string;
  receipt_number: string;
  student_name: string;
  student_grade?: string;
  student_section?: string;
  amount: number;
  fee_type: string;
  quarter: number;
  academic_year: string;
  payment_mode: string;
  collected_at: string;
  collected_by?: string;
};

type Summary = {
  totalCount: number;
  totalAmount: number;
  byMode: { payment_mode: string; count: number; total: number }[];
};

export default function FeeCollectionReport() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [useMonth, setUseMonth] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [quarter, setQuarter] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("");
  const [students, setStudents] = useState<{ id: string; full_name: string; grade?: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<ReportRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/students?limit=500")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    fetchFinancialYears().then((y) => setYears(y.map(({ id, name }) => ({ id, name })))).catch(() => setYears([]));
  }, []);

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (useMonth) {
      params.set("month", month);
    } else {
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
    }
    if (academicYear) params.set("academicYear", academicYear);
    if (quarter) params.set("quarter", quarter);
    if (paymentMode) params.set("paymentMode", paymentMode);
    if (studentId) params.set("studentId", studentId);
    if (grade) params.set("grade", grade);

    fetch(`/api/fee-reports?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.data ?? []);
        setSummary(d.summary ?? null);
      })
      .catch(() => {
        setData([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Fees Collection Report</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={useMonth ? "month" : "range"} onValueChange={(v) => setUseMonth(v === "month")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="range">Date range</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {useMonth ? (
              <div className="space-y-2">
                <Label>Month</Label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={academicYear || "all"} onValueChange={(v) => setAcademicYear(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.name}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quarter</Label>
              <Select value={quarter || "all"} onValueChange={(v) => setQuarter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q} value={String(q)}>
                      Q{q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode || "all"} onValueChange={(v) => setPaymentMode(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Select value={grade || "all"} onValueChange={(v) => setGrade(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId || "all"} onValueChange={(v) => setStudentId(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} {s.grade ? `(${s.grade})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReport} disabled={loading}>
                {loading ? "Loading…" : "Generate Report"}
              </Button>
            </div>
          </div>

          {summary && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <h3 className="font-medium">Summary</h3>
              <div className="flex flex-wrap gap-6">
                <span>
                  <strong>{summary.totalCount}</strong> collection(s)
                </span>
                <span>
                  <strong>₹{summary.totalAmount.toLocaleString()}</strong> total
                </span>
                {summary.byMode.map((m) => (
                  <span key={m.payment_mode} className="capitalize">
                    {m.payment_mode}: {m.count} (₹{m.total.toLocaleString()})
                  </span>
                ))}
              </div>
            </div>
          )}

          {data !== null && (
            <div className="border rounded-lg overflow-x-auto">
              {data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qtr</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Collected By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.receipt_number}</TableCell>
                        <TableCell className="font-medium">{row.student_name ?? "—"}</TableCell>
                        <TableCell>
                          {[row.student_grade, row.student_section].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell>{Number(row.amount).toLocaleString()}</TableCell>
                        <TableCell>{getFeeTypeLabel(row.fee_type)}</TableCell>
                        <TableCell>Q{row.quarter}</TableCell>
                        <TableCell className="capitalize">{row.payment_mode}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.collected_at ? new Date(row.collected_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.collected_by ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground text-center">No collections match the selected filters.</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
