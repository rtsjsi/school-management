"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUSES = ["present", "absent", "half_day", "leave", "holiday", "week_off"] as const;

type DayRow = { empId: string; empName: string; date: string; status: string; in_time?: string; out_time?: string; source: string };

export default function AttendanceReviewAndApprove() {
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<{
    monthYear: string;
    workingDays: number;
    isApproved: boolean;
    approvedAt?: string;
    employees: { id: string; full_name: string; presentDays: number }[];
    dailyData: { date: string; rows: DayRow[] }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { status: string; in_time?: string; out_time?: string }>>({});

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/attendance-review?monthYear=${monthYear}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setEdits({});
      })
      .catch((e) => {
        setError(e.message || "Failed to load");
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYear]);

  const getCellKey = (empId: string, date: string) => `${empId}::${date}`;

  const getStatus = (row: DayRow) => {
    const key = getCellKey(row.empId, row.date);
    return edits[key]?.status ?? row.status;
  };

  const handleStatusChange = (empId: string, date: string, status: string) => {
    const key = getCellKey(empId, date);
    setEdits((p) => ({ ...p, [key]: { ...p[key], status } }));
  };

  const handleSaveEdits = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    const updates = Object.entries(edits).map(([key, v]) => {
      const [empId, attendance_date] = key.split("::");
      return { employee_id: empId, attendance_date, status: v.status, in_time: v.in_time, out_time: v.out_time };
    });
    try {
      const res = await fetch("/api/attendance-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", monthYear: data.monthYear, updates }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setEdits({});
      fetchData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!data) return;
    setApproving(true);
    setError(null);
    const updates = Object.entries(edits).map(([key, v]) => {
      const [empId, attendance_date] = key.split("::");
      return { employee_id: empId, attendance_date, status: v.status, in_time: v.in_time, out_time: v.out_time };
    });
    try {
      if (updates.length > 0) {
        await fetch("/api/attendance-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", monthYear: data.monthYear, updates }),
        });
      }
      const res = await fetch("/api/attendance-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", monthYear: data.monthYear }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      fetchData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApproving(false);
    }
  };

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div className="space-y-2">
            <Label>Month</Label>
            <Input type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          {data && !data.isApproved && hasEdits && (
            <Button onClick={handleSaveEdits} disabled={saving}>
              {saving ? "Saving…" : "Save Corrections"}
            </Button>
          )}
          {data && !data.isApproved && (
            <Button onClick={handleApprove} disabled={approving}>
              {approving ? "Approving…" : "Approve Month"}
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md mb-4">{error}</p>
        )}

        {data?.isApproved && (
          <Badge className="mb-4" variant="default">
            Approved on {data.approvedAt ? new Date(data.approvedAt).toLocaleString() : "—"}
          </Badge>
        )}

        {loading && <p className="text-sm text-muted-foreground py-4">Loading…</p>}

        {data && !loading && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Working days: {data.workingDays} | Employees: {data.employees.length}
            </p>
            <div className="flex flex-col min-w-0" style={{ maxHeight: 400 }}>
              <div className="flex-1 min-h-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">Employee</TableHead>
                    {data.dailyData.slice(0, 31).map((d) => (
                      <TableHead key={d.date} className="text-center min-w-[70px] text-xs">
                        {new Date(d.date).getDate()}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {emp.full_name}
                        <span className="text-xs text-muted-foreground ml-1">({emp.presentDays}d)</span>
                      </TableCell>
                      {data.dailyData.slice(0, 31).map((dayData) => {
                        const row = dayData.rows.find((r) => r.empId === emp.id);
                        if (!row) return <TableCell key={dayData.date}>—</TableCell>;
                        const status = getStatus(row);
                        const isEditable = row.source !== "holiday" && row.source !== "weekend";
                        return (
                          <TableCell key={dayData.date} className="text-center p-1">
                            {isEditable ? (
                              <Select
                                value={status}
                                onValueChange={(v) => handleStatusChange(row.empId, row.date, v)}
                              >
                                <SelectTrigger className="h-8 text-xs border-0 p-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">{status}</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
