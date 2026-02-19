"use client";

import { useState, useEffect } from "react";
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

type ReportType = "daily" | "monthly" | "student" | "payment_mode";

export default function FeeReports() {
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/students?limit=500")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .catch(() => {});
  }, []);

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (reportType === "daily") params.set("date", date);
    if (reportType === "monthly") params.set("month", month);
    if (reportType === "student" && studentId) params.set("studentId", studentId);
    fetch(`/api/fee-reports?type=${reportType}&${params}`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="student">Student-wise</SelectItem>
                  <SelectItem value="payment_mode">Mode-wise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reportType === "daily" && (
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            )}
            {reportType === "monthly" && (
              <div className="space-y-2">
                <Label>Month</Label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
            )}
            {reportType === "student" && (
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={fetchReport} disabled={loading}>
              {loading ? "Loading…" : "Generate"}
            </Button>
          </div>

          {data && (
            <div className="border rounded-lg overflow-x-auto">
              {reportType === "payment_mode" && Array.isArray(data) && data.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row: Record<string, unknown>, i) => (
                      <TableRow key={i}>
                        <TableCell className="capitalize">{String(row.payment_mode ?? "—")}</TableCell>
                        <TableCell>{Number(row.count ?? 0)}</TableCell>
                        <TableCell>{Number(row.total ?? 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {(reportType === "daily" || reportType === "monthly" || reportType === "student") && Array.isArray(data) && data.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row: Record<string, unknown>, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{String(row.receipt_number ?? "—")}</TableCell>
                        <TableCell>{String(row.student_name ?? "—")}</TableCell>
                        <TableCell>{Number(row.amount ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="capitalize">{String(row.fee_type ?? "—")}</TableCell>
                        <TableCell className="capitalize">{String(row.payment_mode ?? "—")}</TableCell>
                        <TableCell>{row.collected_at ? new Date(row.collected_at as string).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {Array.isArray(data) && data.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center">No data for this report.</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
