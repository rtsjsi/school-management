"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Filter,
} from "lucide-react";

const STATUSES = ["present", "absent", "half_day", "casual_leave", "leave_without_pay", "holiday", "week_off"] as const;

const formatStatusLabel = (status: string) => status.replaceAll("_", " ");

const getStatusColor = (status: string) => {
  switch (status) {
    case "present": return "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "absent": return "bg-rose-100/50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400";
    case "half_day": return "bg-amber-100/50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    case "casual_leave": return "bg-blue-100/50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
    case "leave_without_pay": return "bg-orange-100/50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400";
    case "holiday": return "bg-purple-100/50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400";
    case "week_off": return "bg-slate-100/50 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400";
    default: return "";
  }
};

type DayRow = {
  empId: string;
  empName: string;
  date: string;
  status: string;
  in_time?: string;
  out_time?: string;
  source: string;
  isManual?: boolean;
  isLate?: boolean;
  isEarlyDeparture?: boolean;
  singlePunch?: boolean;
  workedHours?: number;
  needsAttention?: boolean;
  missingBioEnroll?: boolean;
};

type EmployeeRow = {
  id: string;
  full_name: string;
  presentDays: number;
  attendanceDays?: number;
  sandwichDeduction?: number;
  lateInCount?: number;
  lateInDeduction?: number;
  needsAttention?: boolean;
  missingBioEnroll?: boolean;
  biometric_enroll_no?: number | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
};

type PunchRow = {
  id: string;
  punched_at: string;
  direction: string;
  verify_method?: string | null;
  machine_no?: number | null;
};

function formatPunchTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default function AttendanceReviewAndApprove() {
  const { toast } = useToast();
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<{
    monthYear: string;
    workingDays: number;
    isApproved: boolean;
    currentUserRole?: string;
    approvedAt?: string;
    lateGraceMinutes?: number;
    employees: EmployeeRow[];
    dailyData: { date: string; rows: DayRow[] }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { status: string }>>({});
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);

  const [dayDetail, setDayDetail] = useState<DayRow | null>(null);
  const [dayPunches, setDayPunches] = useState<PunchRow[]>([]);
  const [dayPunchesLoading, setDayPunchesLoading] = useState(false);
  const [dayPunchesError, setDayPunchesError] = useState<string | null>(null);
  const [dayStatusDraft, setDayStatusDraft] = useState<string>("present");

  const clearLoaded = () => {
    setData(null);
    setEdits({});
    setError(null);
    setDayDetail(null);
  };

  const fetchData = () => {
    setLoading(true);
    setError(null);
    setDayDetail(null);
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

  const openDayDetail = async (row: DayRow) => {
    setDayDetail(row);
    setDayStatusDraft(getStatus(row));
    setDayPunches([]);
    setDayPunchesError(null);
    setDayPunchesLoading(true);
    try {
      const res = await fetch(
        `/api/attendance-punches?employeeId=${encodeURIComponent(row.empId)}&date=${encodeURIComponent(row.date)}`
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (json.warning) setDayPunchesError(json.warning);
      setDayPunches(json.punches ?? []);
    } catch (e) {
      setDayPunchesError((e as Error).message || "Failed to load punches");
    } finally {
      setDayPunchesLoading(false);
    }
  };

  const applyDayStatus = () => {
    if (!dayDetail) return;
    const key = getCellKey(dayDetail.empId, dayDetail.date);
    if (dayStatusDraft === dayDetail.status) {
      setEdits((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    } else {
      setEdits((p) => ({ ...p, [key]: { status: dayStatusDraft } }));
    }
    setDayDetail(null);
  };

  const handleSaveEdits = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    const updates = Object.entries(edits).map(([key, v]) => {
      const [empId, attendance_date] = key.split("::");
      return { employee_id: empId, attendance_date, status: v.status };
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
      toast({ title: "Corrections saved", description: `${updates.length} attendance correction(s) saved successfully.` });
      fetchData();
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

  const visibleEmployees = useMemo(() => {
    if (!data) return [];
    if (!needsAttentionOnly) return data.employees;
    return data.employees.filter((e) => e.needsAttention);
  }, [data, needsAttentionOnly]);

  const attentionCount = data?.employees.filter((e) => e.needsAttention).length ?? 0;
  const totalPresentDays = data ? data.employees.reduce((acc, emp) => acc + emp.presentDays, 0) : 0;
  const totalSandwich = data ? data.employees.reduce((acc, emp) => acc + (emp.sandwichDeduction ?? 0), 0) : 0;
  const totalLateDeduction = data ? data.employees.reduce((acc, emp) => acc + (emp.lateInDeduction ?? 0), 0) : 0;

  const firstInIso = dayPunches.find((p) => (p.direction ?? "").toUpperCase() === "IN")?.punched_at
    ?? dayPunches[0]?.punched_at;
  const outCandidates = dayPunches.filter((p) => (p.direction ?? "").toUpperCase() === "OUT");
  const lastOutIso = outCandidates.length
    ? outCandidates[outCandidates.length - 1].punched_at
    : dayPunches.length > 1
      ? dayPunches[dayPunches.length - 1].punched_at
      : undefined;

  const dayEditable =
    !!dayDetail &&
    !!data &&
    !data.isApproved &&
    dayDetail.source !== "holiday" &&
    dayDetail.source !== "weekend";

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
                onChange={(e) => {
                  setMonthYear(e.target.value);
                  clearLoaded();
                }}
                className="h-9 w-[180px] sm:w-[200px] bg-background"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-9 px-3 gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              {loading ? "Loading..." : "Load Data"}
            </Button>
            {data && (
              <Button
                variant={needsAttentionOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setNeedsAttentionOnly((v) => !v)}
                className="h-9 px-3 gap-2"
              >
                <Filter className="h-4 w-4" />
                Needs attention{attentionCount > 0 ? ` (${attentionCount})` : ""}
              </Button>
            )}
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
              This month&apos;s attendance has been locked for payroll processing. Editing is disabled.
              {typeof data.lateGraceMinutes === "number" && (
                <> Late grace: {data.lateGraceMinutes} min after shift start.</>
              )}
            </AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground animate-pulse">
            Loading attendance records...
          </div>
        )}

        {!loading && !data && !error && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Choose a review month and click Load Data to open the attendance grid.
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <p className="text-sm font-medium text-muted-foreground">
                      {needsAttentionOnly ? "Showing / Total" : "Total Employees"}
                    </p>
                    <p className="text-2xl font-bold">
                      {needsAttentionOnly
                        ? `${visibleEmployees.length} / ${data.employees.length}`
                        : data.employees.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/40 border-border/50 shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payable Present Days</p>
                    <p className="text-2xl font-bold">{totalPresentDays}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/40 border-border/50 shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Salary deductions</p>
                  <p className="text-sm">
                    Sandwich: <span className="font-semibold">{totalSandwich}</span>
                    {" · "}
                    Late IN (÷3): <span className="font-semibold">{totalLateDeduction}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Late after shift start + {data.lateGraceMinutes ?? 15} min grace. Single punch = half day. Click a day for punches.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Late IN
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Early OUT
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Single punch
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PencilLine className="h-3 w-3" /> Manual
              </span>
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
                          {new Date(d.date + "T12:00:00").getDate()}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={32} className="text-center text-muted-foreground py-10">
                          No employees match the current filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleEmployees.map((emp) => (
                        <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="sticky left-0 bg-background z-10 font-medium shadow-[1px_0_0_hsl(var(--border))]">
                            <div className="flex flex-col">
                              <span className="truncate">{emp.full_name}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {emp.presentDays} payable
                                {(emp.sandwichDeduction || emp.lateInDeduction)
                                  ? ` (−${(emp.sandwichDeduction ?? 0) + (emp.lateInDeduction ?? 0)} ded.)`
                                  : ""}
                              </span>
                              {(emp.lateInCount ?? 0) > 0 && (
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">
                                  {emp.lateInCount} late IN
                                </span>
                              )}
                              {emp.missingBioEnroll && (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-normal">
                                  Missing bio enroll
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {data.dailyData.slice(0, 31).map((dayData) => {
                            const row = dayData.rows.find((r) => r.empId === emp.id);
                            if (!row) {
                              return (
                                <TableCell key={dayData.date} className="text-center text-muted-foreground/30">
                                  —
                                </TableCell>
                              );
                            }

                            const status = getStatus(row);
                            const cellKey = getCellKey(emp.id, dayData.date);
                            const isEdited = edits[cellKey] !== undefined;

                            return (
                              <TableCell
                                key={dayData.date}
                                className={cn(
                                  "text-center p-1 relative h-12 transition-all cursor-pointer",
                                  getStatusColor(status),
                                  row.needsAttention && "ring-1 ring-inset ring-amber-400/50",
                                  "hover:brightness-95 hover:shadow-inner"
                                )}
                                title={[
                                  row.in_time ? `In ${row.in_time}` : null,
                                  row.out_time ? `Out ${row.out_time}` : null,
                                  row.singlePunch ? "Single punch" : null,
                                  row.isLate ? "Late IN" : null,
                                  row.isEarlyDeparture ? "Early OUT" : null,
                                  "Click for punch detail",
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                                onClick={() => openDayDetail(row)}
                              >
                                {(row.isManual || isEdited) && (
                                  <div className="absolute top-0.5 right-0.5 text-foreground/40" title="Manual Override">
                                    <PencilLine className="h-2.5 w-2.5" />
                                  </div>
                                )}
                                <div className="absolute bottom-0.5 left-0.5 flex gap-0.5">
                                  {row.isLate && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Late first IN" />
                                  )}
                                  {row.isEarlyDeparture && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" title="Early departure" />
                                  )}
                                  {row.singlePunch && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" title="Single punch" />
                                  )}
                                </div>

                                <div className="flex h-full w-full flex-col items-center justify-center font-medium">
                                  <span className="text-[10px] uppercase tracking-tighter max-w-[60px] truncate">
                                    {formatStatusLabel(status)}
                                  </span>
                                  {(row.in_time || row.out_time) && (
                                    <span className="text-[9px] text-muted-foreground/80 font-normal leading-none mt-0.5">
                                      {(row.in_time ?? "—").slice(0, 5)}
                                      {row.out_time ? `–${row.out_time.slice(0, 5)}` : ""}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!dayDetail} onOpenChange={(open) => { if (!open) setDayDetail(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dayDetail?.empName} · {dayDetail?.date}
            </DialogTitle>
            <DialogDescription>
              First IN and last OUT drive late / half-day / present. Late grace is{" "}
              {data?.lateGraceMinutes ?? 15} minutes after shift start.
            </DialogDescription>
          </DialogHeader>

          {dayDetail && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{formatStatusLabel(getStatus(dayDetail))}</Badge>
                {dayDetail.singlePunch && <Badge variant="secondary">Single punch → half day</Badge>}
                {dayDetail.isLate && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Late IN</Badge>}
                {dayDetail.isEarlyDeparture && (
                  <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Early OUT</Badge>
                )}
                {dayDetail.missingBioEnroll && (
                  <Badge variant="destructive">Missing bio enroll</Badge>
                )}
                {dayDetail.isManual && <Badge variant="outline">Manual</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">In (used)</p>
                  <p className="font-mono font-medium">{dayDetail.in_time ?? "—"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Out (used)</p>
                  <p className="font-mono font-medium">{dayDetail.out_time ?? "—"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Worked hours</p>
                  <p className="font-medium">{dayDetail.workedHours ?? 0}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium capitalize">{dayDetail.source}</p>
                </div>
              </div>

              {dayEditable && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Correct status</Label>
                  <Select value={dayStatusDraft} onValueChange={setDayStatusDraft}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold mb-2">Punches this day</p>
                {dayPunchesLoading && (
                  <p className="text-sm text-muted-foreground animate-pulse">Loading punches…</p>
                )}
                {dayPunchesError && !dayPunchesLoading && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">{dayPunchesError}</p>
                )}
                {!dayPunchesLoading && !dayPunchesError && dayPunches.length === 0 && (
                  <p className="text-sm text-muted-foreground">No punches recorded for this day.</p>
                )}
                {!dayPunchesLoading && dayPunches.length > 0 && (
                  <div className="rounded-md border overflow-hidden max-h-56 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs">Time (IST)</TableHead>
                          <TableHead className="text-xs">Direction</TableHead>
                          <TableHead className="text-xs">Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayPunches.map((p) => {
                          const isFirstIn = firstInIso === p.punched_at;
                          const isLastOut = lastOutIso === p.punched_at && !!lastOutIso;
                          return (
                            <TableRow
                              key={p.id}
                              className={cn(
                                (isFirstIn || isLastOut) && "bg-amber-50 dark:bg-amber-950/30"
                              )}
                            >
                              <TableCell className="font-mono text-xs">
                                {formatPunchTime(p.punched_at)}
                              </TableCell>
                              <TableCell className="text-xs uppercase">{p.direction}</TableCell>
                              <TableCell className="text-xs">
                                {isFirstIn && isLastOut
                                  ? "First IN / Last OUT"
                                  : isFirstIn
                                    ? "First IN"
                                    : isLastOut
                                      ? "Last OUT"
                                      : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDayDetail(null)}>
              Close
            </Button>
            {dayEditable && (
              <Button onClick={applyDayStatus}>
                Apply status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
