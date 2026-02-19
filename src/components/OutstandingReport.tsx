"use client";

import { useState, useEffect } from "react";
import { getFeeTypeLabel } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
import { AlertCircle } from "lucide-react";
import { fetchClasses, fetchFinancialYears } from "@/lib/lov";

const QUARTERS = [1, 2, 3, 4] as const;

type OutstandingRow = {
  student_id: string;
  full_name: string;
  grade: string;
  section: string;
  roll_number?: number;
  student_id_display?: string;
  quarter: number;
  fee_type: string;
  total: number;
  paid: number;
  outstanding: number;
};

type Summary = {
  totalOutstanding: number;
  defaulterCount: number;
  studentCount: number;
  byGrade: { grade: string; count: number; total: number }[];
};

export default function OutstandingReport() {
  const currentYear = new Date().getFullYear();
  const defaultAy = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

  const [academicYear, setAcademicYear] = useState(defaultAy);
  const [quarter, setQuarter] = useState("");
  const [grade, setGrade] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<{ id: string; full_name: string; grade?: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<OutstandingRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [academicYearUsed, setAcademicYearUsed] = useState("");
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
    fetchFinancialYears()
      .then((y) => {
        const list = y.map(({ id, name }) => ({ id, name }));
        if (list.length === 0) list.push({ id: "current", name: defaultAy });
        else if (!list.some((x) => x.name === defaultAy)) list.unshift({ id: "current", name: defaultAy });
        setYears(list);
      })
      .catch(() => setYears([{ id: "current", name: defaultAy }]));
  }, []);

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("academicYear", academicYear);
    if (quarter) params.set("quarter", quarter);
    if (grade) params.set("grade", grade);
    if (studentId) params.set("studentId", studentId);

    fetch(`/api/outstanding-report?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.data ?? []);
        setSummary(d.summary ?? null);
        setAcademicYearUsed(d.academicYear ?? academicYear);
      })
      .catch(() => {
        setData([]);
        setSummary(null);
        setAcademicYearUsed("");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (academicYear) fetchReport();
  }, []);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold">Outstanding Fees Report</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Academic Year *</Label>
              <Select
                value={academicYear || years[0]?.name || defaultAy}
                onValueChange={setAcademicYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.length > 0 ? (
                    years.map((y) => (
                      <SelectItem key={y.id} value={y.name}>
                        {y.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={defaultAy}>{defaultAy}</SelectItem>
                  )}
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
                  <SelectItem value="all">All quarters</SelectItem>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q} value={String(q)}>
                      Q{q}
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
                  <SelectItem value="all">All grades</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-4 space-y-2">
              <h3 className="font-medium">Summary ({academicYearUsed})</h3>
              <div className="flex flex-wrap gap-6">
                <span>
                  <strong>₹{summary.totalOutstanding.toLocaleString()}</strong> total outstanding
                </span>
                <span>
                  <strong>{summary.defaulterCount}</strong> dues
                </span>
                <span>
                  <strong>{summary.studentCount}</strong> student(s) with dues
                </span>
                {summary.byGrade.length > 0 && (
                  <span className="text-sm">
                    By grade:{" "}
                    {summary.byGrade
                      .map((g) => `${g.grade}: ₹${g.total.toLocaleString()} (${g.count})`)
                      .join(" | ")}
                  </span>
                )}
              </div>
            </div>
          )}

          {data !== null && (
            <div className="border rounded-lg overflow-x-auto">
              {data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Student</TableHead>
                      <TableHead>GR No.</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Quarter</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead className="font-semibold">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, i) => (
                      <TableRow key={`${row.student_id}-${row.quarter}-${row.fee_type}-${i}`}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {row.full_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.student_id_display ?? "—"}</TableCell>
                        <TableCell>{row.grade}</TableCell>
                        <TableCell>{row.section || "—"}</TableCell>
                        <TableCell>Q{row.quarter}</TableCell>
                        <TableCell>{getFeeTypeLabel(row.fee_type)}</TableCell>
                        <TableCell>{row.total.toLocaleString()}</TableCell>
                        <TableCell>{row.paid.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-destructive">
                          ₹{row.outstanding.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  {academicYearUsed
                    ? "All fees are up to date for the selected filters."
                    : "Select filters and generate report."}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
