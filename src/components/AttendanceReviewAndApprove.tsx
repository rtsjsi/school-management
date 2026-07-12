"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Lock,
  RefreshCw,
  Save,
  Unlock,
  PencilLine,
  AlertCircle,
} from "lucide-react";

const STATUSES = ["present", "absent", "half_day", "leave", "holiday", "week_off"] as const;

const getStatusColor = (status: string) => {
  switch (status) {
    case "present": return "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "absent": return "bg-rose-100/50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400";
    case "half_day": return "bg-amber-100/50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    case "leave": return "bg-blue-100/50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
    case "holiday": return "bg-purple-100/50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400";
    case "week_off": return "bg-slate-100/50 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400";
    default: return "";
  }
};

type DayRow = { empId: string; empName: string; date: string; status: string; in_time?: string; out_time?: string; source: string; isManual?: boolean };

export default function AttendanceReviewAndApprove() {
  const { toast } = useToast();
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<{
    monthYear: string;
    workingDays: number;
    isApproved: boolean;
    currentUserRole?: string;
    approvedAt?: string;
    employees: { id: string; full_name: string; presentDays: number }[];
    dailyData: { date: string; rows: DayRow[] }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { status: string; in_time?: string; out_time?: string }>>({});
  
  // Track which cell is currently being edited to avoid rendering 1000s of Select components
  const [activeCell, setActiveCell] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    setActiveCell(null);
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

  const getCellKey = (empId: string, date: string) => `${empId}::${date}`;

  const getStatus = (row: DayRow) => {
    const key = getCellKey(row.empId, row.date);
    return edits[key]?.status ?? row.status;
  };

  const handleStatusChange = (empId: string, date: string, status: string) => {
    const key = getCellKey(empId, date);
    setEdits((p) => ({ ...p, [key]: { ...p[key], status } }));
    setActiveCell(null); // Close the dropdown after selection
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
      
      // Update local state instead of refetching
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          dailyData: prev.dailyData.map((day) => ({
            ...day,
            rows: day.rows.map((row) => {
              const key = getCellKey(row.empId, row.date);
              const edit = edits[key];
              if (edit) {
                return { ...row, status: edit.status, isManual: true };
              }
              return row;
            }),
          })),
        };
      });
      
      setEdits({});
      toast({ title: "Corrections saved", description: `${updates.length} attendance correction(s) saved successfully.` });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!data) return;
    setApproving(true);
    setError(null);
    const updates = Object.entries(edits).map(([key, v]) => {
      const [empId, attendance_date] = key.split("::");
      return { employee_id: empId, attendance_date, status: v.status };
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
        body: JSON.stringify({ action: "finalize", monthYear: data.monthYear }),
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

  const handleUnfreeze = async () => {
    if (!data) return;
    if (!confirm("Are you sure you want to unfreeze this month? All auto-calculated attendance will be reset, but manual corrections will be kept.")) return;
    setApproving(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unfreeze", monthYear: data.monthYear }),
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
  
  const totalPresentDays = data ? data.employees.reduce((acc, emp) => acc + emp.presentDays, 0) : 0;

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="bg-muted/30 pb-4 border-b border-border/50 sticky top-0 z-40 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Review Month</Label>
              <Input 
                type="month" 
                value={monthYear} 
                onChange={(e) => setMonthYear(e.target.value)} 
                className="h-9 w-[180px] sm:w-[200px] bg-background"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-9 px-3 gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              {loading ? "Loading..." : "Load Data"}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {data && !data.isApproved && hasEdits && (
              <Button onClick={handleSaveEdits} disabled={saving} variant="secondary" size="sm" className="h-9 gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save Corrections"}
              </Button>
            )}
            {data && !data.isApproved && (
              <Button onClick={handleFinalize} disabled={approving || hasEdits} variant="default" size="sm" className="h-9 gap-2" title={hasEdits ? "Save corrections first" : ""}>
                <CheckCircle2 className="h-4 w-4" />
                {approving ? "Finalizing…" : "Finalize Month"}
              </Button>
            )}
            {data && data.isApproved && data.currentUserRole === "principal" && (
              <Button onClick={handleUnfreeze} disabled={approving} variant="destructive" size="sm" className="h-9 gap-2">
                <Unlock className="h-4 w-4" />
                {approving ? "Unfreezing…" : "Unfreeze Month"}
              </Button>
            )}
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

        {data?.isApproved && (
          <Alert className="mb-6 bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400">
            <Lock className="h-4 w-4 !text-emerald-600 dark:!text-emerald-400" />
            <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-400">Month Finalized</AlertTitle>
            <AlertDescription className="text-emerald-700/90 dark:text-emerald-400/80">
              This month's attendance has been locked for payroll processing. Editing is disabled.
            </AlertDescription>
          </Alert>
        )}

        {!data && loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground animate-pulse">
            Loading attendance records...
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-muted/40 border-border/50 shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-md dark:bg-blue-900/30 dark:text-blue-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Working Days</p>
                    <p className="text-2xl font-bold">{data.workingDays}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/40 border-border/50 shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-md dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold">{data.employees.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/40 border-border/50 shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Present Days</p>
                    <p className="text-2xl font-bold">{totalPresentDays}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-md border border-border/60 overflow-hidden shadow-sm">
              <div className="flex-1 overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="sticky top-0 left-0 bg-muted/95 backdrop-blur-sm z-30 min-w-[180px] shadow-[1px_1px_0_hsl(var(--border))] font-semibold">
                        Employee
                      </TableHead>
                      {data.dailyData.slice(0, 31).map((d) => (
                        <TableHead key={d.date} className="sticky top-0 bg-muted/95 backdrop-blur-sm z-20 text-center min-w-[70px] text-xs font-semibold shadow-[0_1px_0_hsl(var(--border))] px-1">
                          {new Date(d.date).getDate()}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.employees.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="sticky left-0 bg-background z-10 font-medium shadow-[1px_0_0_hsl(var(--border))]">
                          <div className="flex flex-col">
                            <span className="truncate">{emp.full_name}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">{emp.presentDays} present days</span>
                          </div>
                        </TableCell>
                        {data.dailyData.slice(0, 31).map((dayData) => {
                          const row = dayData.rows.find((r) => r.empId === emp.id);
                          if (!row) return <TableCell key={dayData.date} className="text-center text-muted-foreground/30">—</TableCell>;
                          
                          const status = getStatus(row);
                          const cellKey = getCellKey(emp.id, dayData.date);
                          const isEditable = !data.isApproved && row.source !== "holiday" && row.source !== "weekend";
                          const isActive = activeCell === cellKey;
                          const isEdited = edits[cellKey] !== undefined;
                          
                          return (
                            <TableCell 
                              key={dayData.date} 
                              className={cn(
                                "text-center p-1 relative h-12 transition-all cursor-default", 
                                getStatusColor(status),
                                isEditable && !isActive && "hover:brightness-95 hover:shadow-inner cursor-pointer"
                              )}
                              onClick={() => {
                                if (isEditable && !isActive) setActiveCell(cellKey);
                              }}
                            >
                              {(row.isManual || isEdited) && (
                                <div className="absolute top-0.5 right-0.5 text-foreground/40" title="Manual Override">
                                  <PencilLine className="h-2.5 w-2.5" />
                                </div>
                              )}
                              
                              {isActive ? (
                                <Select
                                  defaultOpen={true}
                                  value={status}
                                  onValueChange={(v) => handleStatusChange(row.empId, row.date, v)}
                                  onOpenChange={(open) => { if (!open) setActiveCell(null); }}
                                >
                                  <SelectTrigger className="h-8 text-[11px] border-0 p-1 bg-background shadow-md font-medium w-full absolute inset-x-1 top-2 z-50">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="z-50 min-w-[120px]">
                                    {STATUSES.map((s) => (
                                      <SelectItem key={s} value={s} className="text-[11px]">
                                        {s.replace("_", " ")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center font-medium">
                                  <span className="text-[10px] uppercase tracking-tighter max-w-[60px] truncate">{status.replace("_", " ")}</span>
                                </div>
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
