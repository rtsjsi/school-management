"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

type ReportType = "monthly" | "absent";

export default function AttendanceReports() {
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  type SortKey = "employee_name" | "present" | "absent" | "percentage";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const sortedData = useMemo(() => {
    if (!data || !sortKey) return data;
    return [...data].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "employee_name":
          av = String(a.employee_name ?? "").toLowerCase();
          bv = String(b.employee_name ?? "").toLowerCase();
          break;
        case "present":
          av = Number(a.present ?? 0);
          bv = Number(b.present ?? 0);
          break;
        case "absent":
          av = Number(a.absent ?? 0);
          bv = Number(b.absent ?? 0);
          break;
        case "percentage":
          av = Number(a.percentage ?? 0);
          bv = Number(b.percentage ?? 0);
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortDir, sortKey]);
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Summary</SelectItem>
                <SelectItem value="absent">Absentee List</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {reportType === "monthly" && (
            <div className="space-y-2">
              <Label>Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          )}
          {reportType === "absent" && (
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker value={date} onChange={setDate} />
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
                <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("employee_name")}>
                  <span className="inline-flex items-center gap-1">Employee <SortIcon col="employee_name" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("present")}>
                  <span className="inline-flex items-center gap-1">Present <SortIcon col="present" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("absent")}>
                  <span className="inline-flex items-center gap-1">Absent <SortIcon col="absent" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("percentage")}>
                  <span className="inline-flex items-center gap-1">% <SortIcon col="percentage" /></span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sortedData ?? []).map((row: Record<string, unknown>, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{String(row.employee_name ?? "—")}</TableCell>
                  <TableCell>{Number(row.present ?? 0)}</TableCell>
                  <TableCell>{Number(row.absent ?? 0)}</TableCell>
                  <TableCell>{Number(row.percentage ?? 0).toFixed(1)}%</TableCell>
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
