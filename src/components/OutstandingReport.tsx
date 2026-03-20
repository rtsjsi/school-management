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
import { AcademicYearSelect } from "@/components/AcademicYearSelect";
import { fetchStandards } from "@/lib/lov";

const QUARTERS = [1, 2, 3, 4] as const;

type OutstandingRow = {
  student_id: string;
  full_name: string;
  standard: string;
  division: string;
  roll_number?: number;
  student_id_display?: string;
  quarter: number;
  quarter_label?: string;
  fee_type: string;
  total: number;
  paid: number;
  outstanding: number;
};

export default function OutstandingReport() {
  const [academicYear, setAcademicYear] = useState("");
  const [quarter, setQuarter] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<{ id: string; full_name: string; standard?: string }[]>([]);
  const [standards, setStandards] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<OutstandingRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/students?limit=500&exclude_rte=1")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStandards().then(setStandards).catch(() => setStandards([]));
  }, []);

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("academicYear", academicYear);
    if (quarter) params.set("quarter", quarter);
    if (standardFilter) params.set("standard", standardFilter);
    if (studentId) params.set("studentId", studentId);

    fetch(`/api/outstanding-report?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.data ?? []);
      })
      .catch(() => {
        setData([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (academicYear) fetchReport();
  }, [academicYear]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold">Outstanding Fees Report</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <AcademicYearSelect
              id="outstanding-report-academic-year"
              label="Academic Year *"
              value={academicYear}
              onChange={setAcademicYear}
            />
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
              <Label>Standard</Label>
              <Select value={standardFilter || "all"} onValueChange={(v) => setStandardFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All standards</SelectItem>
                  {standards.map((c) => (
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
                      {s.full_name} {s.standard ? `(${s.standard})` : ""}
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

          {data !== null && (
            <div className="border rounded-lg overflow-x-auto">
              {data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Student</TableHead>
                      <TableHead>GR No.</TableHead>
                      <TableHead>Standard</TableHead>
                      <TableHead>Division</TableHead>
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
                        <TableCell>{row.standard}</TableCell>
                        <TableCell>{row.division || "—"}</TableCell>
                        <TableCell>{row.quarter_label ?? `Q${row.quarter}`}</TableCell>
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
                  {academicYear
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
