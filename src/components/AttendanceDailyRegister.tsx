"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Users, FileDigit, ScanFace, AlertCircle } from "lucide-react";

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
    <Card className="shadow-sm border-border/60">
      <CardHeader className="bg-muted/30 pb-4 border-b border-border/50 sticky top-0 z-40 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-[220px]">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</Label>
              <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
                <SelectTrigger className="h-9 bg-background">
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
              size="sm"
              onClick={handleRefresh}
              disabled={loading || selectedEmployee === "all"}
              className="h-9 px-3 gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              {loading ? "Loading…" : "Load Punches"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {warning && (
          <Alert className="mb-6 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
            <AlertTitle className="font-semibold text-amber-800 dark:text-amber-400">Warning</AlertTitle>
            <AlertDescription className="text-amber-700/90 dark:text-amber-400/80">
              {warning}
            </AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground animate-pulse">
            Loading punch data...
          </div>
        )}

        {!loading && hasFetched && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-muted/40 border-border/50 shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-md dark:bg-blue-900/30 dark:text-blue-400">
                    <ScanFace className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Punch Records</p>
                    <p className="text-2xl font-bold">{punches.length}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/40 border-border/50 shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-md dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Employee Name</p>
                    <p className="text-lg font-bold truncate max-w-[200px]" title={employees.find((e) => e.id === selectedEmployee)?.full_name ?? "Selected Employee"}>
                      {employees.find((e) => e.id === selectedEmployee)?.full_name ?? "Selected Employee"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {enrollNo && (
                <Card className="bg-muted/40 border-border/50 shadow-none">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md dark:bg-emerald-900/30 dark:text-emerald-400">
                      <FileDigit className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Biometric Enroll No</p>
                      <p className="text-2xl font-bold">{enrollNo}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {punches.length > 0 && (
              <div className="rounded-md border border-border/60 overflow-hidden shadow-sm">
                <div className="flex-1 overflow-auto max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 shadow-[0_1px_0_hsl(var(--border))] font-semibold">
                          Date
                        </TableHead>
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 shadow-[0_1px_0_hsl(var(--border))] font-semibold">
                          Time
                        </TableHead>
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 shadow-[0_1px_0_hsl(var(--border))] font-semibold">
                          Direction
                        </TableHead>
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 shadow-[0_1px_0_hsl(var(--border))] font-semibold">
                          Verify Method
                        </TableHead>
                        <TableHead className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 shadow-[0_1px_0_hsl(var(--border))] font-semibold">
                          Machine
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {punches.map((row) => (
                        <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="whitespace-nowrap font-medium">
                            {formatDate(row.punched_at)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
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
                          <TableCell className="text-muted-foreground text-xs font-mono">
                            {row.verify_method ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">
                            {row.machine_no}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {punches.length === 0 && !error && !warning && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-lg bg-muted/10 border-dashed">
                <ScanFace className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-lg font-medium">No Punch Records</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  We couldn't find any biometric punch records for {employees.find((e) => e.id === selectedEmployee)?.full_name ?? "this employee"} in the system.
                </p>
              </div>
            )}
          </div>
        )}

        {!loading && !hasFetched && !error && !warning && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium">Select an Employee</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Choose an employee from the dropdown menu above and click Load Punches to view their biometric attendance records.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
