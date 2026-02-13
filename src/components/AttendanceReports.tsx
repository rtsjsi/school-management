"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportType = "monthly" | "late" | "early" | "absent";

export default function AttendanceReports() {
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams({ type: reportType });
    if (reportType === "monthly") params.set("month", month);
    else params.set("date", date);
    fetch(`/api/attendance-reports?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Reports</CardTitle>
        <CardDescription>
          Monthly summary, late arrivals, early departures, absentee list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="monthly">Monthly Summary</option>
              <option value="late">Late Arrivals</option>
              <option value="early">Early Departures</option>
              <option value="absent">Absentee List</option>
            </select>
          </div>
          {reportType === "monthly" && (
            <div className="space-y-2">
              <Label>Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          )}
          {(reportType === "late" || reportType === "early" || reportType === "absent") && (
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          <Button onClick={fetchReport} disabled={loading}>
            {loading ? "Loading…" : "Generate"}
          </Button>
        </div>

        {data && Array.isArray(data) && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Early</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row: Record<string, unknown>, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{String(row.employee_name ?? "—")}</TableCell>
                  <TableCell>{Number(row.present ?? 0)}</TableCell>
                  <TableCell>{Number(row.absent ?? 0)}</TableCell>
                  <TableCell>{Number(row.percentage ?? 0).toFixed(1)}%</TableCell>
                  <TableCell>{Number(row.late_count ?? 0)}</TableCell>
                  <TableCell>{Number(row.early_count ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && Array.isArray(data) && data.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No data for this report.</p>
        )}
      </CardContent>
    </Card>
  );
}
