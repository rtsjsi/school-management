"use client";

import { useState, useEffect } from "react";
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

type RawPunchRow = {
  id: string;
  enroll_no: string;
  punched_at: string;
  direction: string;
  verify_method: string | null;
  machine_no: number;
  received_at: string;
};

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

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function AttendanceDailyRegister() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [punches, setPunches] = useState<RawPunchRow[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [enrollNo, setEnrollNo] = useState<string | null>(null);

  // Load employee list on mount (no punch data)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/attendance-punches?employeesOnly=true");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setEmployees(json.employees ?? []);
      } catch {
        // silently fail, employees will be empty
      }
    })();
  }, []);

  const handleRefresh = async () => {
    if (selectedEmployee === "all") return;
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const params = new URLSearchParams({ employeeId: selectedEmployee });
      const res = await fetch(`/api/attendance-punches?${params.toString()}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setPunches(json.punches ?? []);
      setEnrollNo(json.enrollNo ?? null);
      setWarning(json.warning ?? null);
      setHasFetched(true);
    } catch (e) {
      setError((e as Error).message || "Failed to load punch data");
      setPunches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (value: string) => {
    setSelectedEmployee(value);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Biometric Punch Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 min-w-[220px]">
            <Label>Employee</Label>
            <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
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
            onClick={handleRefresh}
            disabled={loading || selectedEmployee === "all"}
          >
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
        )}

        {/* Warning (e.g. no enroll number mapped) */}
        {warning && (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/30 p-2 rounded-md">
            {warning}
          </p>
        )}

        {/* Enroll number info */}
        {hasFetched && enrollNo && (
          <p className="text-xs text-muted-foreground">
            Biometric Enroll No: <span className="font-medium">{enrollNo}</span>
          </p>
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
                      Date
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_hsl(var(--border))]">
                      Time
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_hsl(var(--border))]">
                      Direction
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_hsl(var(--border))]">
                      Verify Method
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_hsl(var(--border))]">
                      Machine
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {punches.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(row.punched_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatTime(row.punched_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={row.direction === "IN" ? "default" : "secondary"}
                          className={
                            row.direction === "IN"
                              ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100/70"
                              : "bg-slate-100/50 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400 hover:bg-slate-100/70"
                          }
                        >
                          {row.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.verify_method ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.machine_no}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && punches.length === 0 && !error && !warning && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {hasFetched
              ? "No punch records found for this employee."
              : "Select an employee and click Refresh to view punch records."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
