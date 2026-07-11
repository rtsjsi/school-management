"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Employee = { id: string; full_name: string };

type PunchRow = {
  id: string;
  employee_id: string;
  punch_date: string;
  punch_time: string;
  punch_type: string;
  is_late: boolean;
  is_early_departure: boolean;
  source: string;
  created_at: string;
  employees: { full_name: string } | { full_name: string }[] | null;
};

function getEmployeeName(row: PunchRow): string {
  if (Array.isArray(row.employees)) {
    return (row.employees[0] as { full_name: string })?.full_name ?? "—";
  }
  return (row.employees as { full_name: string } | null)?.full_name ?? "—";
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    return new Date(timeStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return timeStr;
  }
}

export function AttendanceDailyRegister() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [punches, setPunches] = useState<PunchRow[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (empId: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (empId && empId !== "all") params.set("employeeId", empId);
      const res = await fetch(`/api/attendance-punches?${params.toString()}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setEmployees(json.employees ?? []);
      setPunches(json.punches ?? []);
    } catch (e) {
      setError((e as Error).message || "Failed to load punch data");
      setPunches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedEmployee);
  }, [selectedEmployee, fetchData]);

  const handleEmployeeChange = (value: string) => {
    setSelectedEmployee(value);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Attendance Punch Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 min-w-[220px]">
            <Label>Employee</Label>
            <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchData(selectedEmployee)}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading punch data…</p>
        )}

        {/* Results */}
        {!loading && punches.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Showing {punches.length} record{punches.length !== 1 ? "s" : ""}
              {selectedEmployee !== "all" &&
                ` for ${employees.find((e) => e.id === selectedEmployee)?.full_name ?? "selected employee"}`}
            </p>
            <div className="rounded-md border overflow-auto" style={{ maxHeight: 500 }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_hsl(var(--border))]">
                      Employee
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_hsl(var(--border))]">
                      Date
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_hsl(var(--border))]">
                      Time
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_hsl(var(--border))]">
                      Type
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_hsl(var(--border))]">
                      Flags
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_hsl(var(--border))]">
                      Source
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {punches.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{getEmployeeName(row)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(row.punch_date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatTime(row.punch_time)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={row.punch_type === "IN" ? "default" : "secondary"}
                          className={
                            row.punch_type === "IN"
                              ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100/70"
                              : "bg-slate-100/50 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400 hover:bg-slate-100/70"
                          }
                        >
                          {row.punch_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.is_late && (
                          <span className="text-destructive text-xs font-medium mr-1">Late</span>
                        )}
                        {row.is_early_departure && (
                          <span className="text-destructive text-xs font-medium">Early</span>
                        )}
                        {!row.is_late && !row.is_early_departure && "—"}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground text-xs">
                        {row.source ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && punches.length === 0 && !error && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No punch records found.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
