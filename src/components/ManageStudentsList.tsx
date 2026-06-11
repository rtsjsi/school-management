"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown, BookOpen, UserPlus, LogOut, ChevronDown, ChevronUp, MoreVertical, Eye, Pencil } from "lucide-react";
import { fetchStandards, fetchAllDivisions } from "@/lib/lov";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StudentEntryForm from "@/components/StudentEntryForm";
import { StudentEditDialog } from "@/components/StudentEditDialog";
import { StudentViewDialog } from "@/components/StudentViewDialog";
import { DatePicker } from "@/components/ui/date-picker";
import { computeCompleteness } from "@/lib/student-completeness";

type StudentRow = {
  id: string;
  gr_number?: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  standard?: string;
  division?: string;
  roll_number?: number;
  status?: string;
  admission_date?: string;
  date_of_birth?: string;
  is_rte_quota?: boolean;
  father_name?: string;
  mother_name?: string;
  parent_name?: string;
  parent_contact?: string;
  mother_contact?: string;
  parent_email?: string;
  guardian_name?: string;
  guardian_contact?: string;
  notes?: string;
  created_at?: string;
};

type EnrolmentRow = {
  id: string;
  academicYear: string;
  standard: string;
  division: string;
  status: string;
  createdAt: string | null;
};

type ExitFormState = {
  exit_date: string;
  reason: string;
  notes: string;
};

function StudentEnrolmentsDialog({
  studentId,
  studentName,
  grNumber,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  studentId: string;
  studentName: string;
  grNumber?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : localOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EnrolmentRow[]>([]);
  type SortKey = "academicYear" | "standard" | "division" | "status" | "createdAt";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const supabase = createClient();

  const loadEnrolments = async () => {
    setLoading(true);
    try {
      const { data: enrollments, error } = await supabase
        .from("student_enrollments")
        .select("id, academic_year_id, standard_id, division_id, status, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error || !enrollments) {
        setRows([]);
        return;
      }

      const yearIds = Array.from(new Set(enrollments.map((e) => e.academic_year_id)));
      const stdIds = Array.from(new Set(enrollments.map((e) => e.standard_id)));
      const divIds = Array.from(new Set(enrollments.map((e) => e.division_id)));

      const [yearsRes, stdsRes, divsRes] = await Promise.all([
        yearIds.length
          ? supabase.from("academic_years").select("id, name").in("id", yearIds)
          : Promise.resolve({ data: [] } as { data: { id: string; name: string }[] | null }),
        stdIds.length
          ? supabase.from("standards").select("id, name").in("id", stdIds)
          : Promise.resolve({ data: [] } as { data: { id: string; name: string }[] | null }),
        divIds.length
          ? supabase.from("standard_divisions").select("id, name").in("id", divIds)
          : Promise.resolve({ data: [] } as { data: { id: string; name: string }[] | null }),
      ]);

      const yearMap = new Map((yearsRes.data ?? []).map((y) => [y.id, y.name]));
      const stdMap = new Map((stdsRes.data ?? []).map((s) => [s.id, s.name]));
      const divMap = new Map((divsRes.data ?? []).map((d) => [d.id, d.name]));

      const mapped: EnrolmentRow[] = enrollments.map((e) => ({
        id: e.id,
        academicYear: yearMap.get(e.academic_year_id) ?? "—",
        standard: stdMap.get(e.standard_id) ?? "—",
        division: divMap.get(e.division_id) ?? "—",
        status: e.status,
        createdAt: e.created_at,
      }));
      setRows(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && rows.length === 0 && !loading) {
      loadEnrolments();
    }
  }, [open]);

  const handleOpenChange = async (next: boolean) => {
    setOpen?.(next);
    if (next && rows.length === 0 && !loading) {
      await loadEnrolments();
    }
  };
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "academicYear":
          av = a.academicYear.toLowerCase();
          bv = b.academicYear.toLowerCase();
          break;
        case "standard":
          av = a.standard.toLowerCase();
          bv = b.standard.toLowerCase();
          break;
        case "division":
          av = a.division.toLowerCase();
          bv = b.division.toLowerCase();
          break;
        case "status":
          av = a.status.toLowerCase();
          bv = b.status.toLowerCase();
          break;
        case "createdAt":
          av = a.createdAt ?? "";
          bv = b.createdAt ?? "";
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortDir, sortKey]);
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-1">
            <BookOpen className="h-3 w-3" />
            Enrolments
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            Enrolments — {studentName}
            {grNumber && (
              <span className="font-mono text-xs font-normal text-muted-foreground ml-2">
                (GR: {grNumber})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>Read-only view of enrollment history for this student.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading enrolments…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No enrolments found.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("academicYear")}>
                    <span className="inline-flex items-center gap-1">Academic Year <SortIcon col="academicYear" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("standard")}>
                    <span className="inline-flex items-center gap-1">Standard <SortIcon col="standard" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("division")}>
                    <span className="inline-flex items-center gap-1">Division <SortIcon col="division" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("status")}>
                    <span className="inline-flex items-center gap-1">Status <SortIcon col="status" /></span>
                  </TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("createdAt")}>
                    <span className="inline-flex items-center gap-1">Created <SortIcon col="createdAt" /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.academicYear}</TableCell>
                    <TableCell>{r.standard}</TableCell>
                    <TableCell>{r.division}</TableCell>
                    <TableCell className="capitalize">{r.status}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StudentExitDialog({
  studentId,
  studentName,
  currentStatus,
  onExited,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  studentId: string;
  studentName: string;
  currentStatus?: string | null;
  onExited?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : localOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<ExitFormState>({ exit_date: today, reason: "", notes: "" });
  const supabase = createClient();

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from("students")
        .update({
          status: "inactive",
          exit_date: form.exit_date || today,
          exit_reason: form.reason || null,
          exit_notes: form.notes || null,
        })
        .eq("id", studentId);
      if (updErr) {
        setError(updErr.message);
        return;
      }

      const enrollmentStatus =
        form.reason === "transfer"
          ? "transferred"
          : form.reason === "expelled"
          ? "expelled"
          : "withdrawn";

      await supabase
        .from("student_enrollments")
        .update({ status: enrollmentStatus })
        .eq("student_id", studentId)
        .eq("status", "active");

      setOpen?.(false);
      if (onExited) onExited();
    } catch {
      setError("Failed to exit student. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = !!currentStatus && currentStatus !== "active";

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen?.(next)}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-destructive hover:text-destructive"
            disabled={disabled}
          >
            <LogOut className="h-3 w-3" />
            Exit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Exit student</DialogTitle>
          <DialogDescription>
            Mark <span className="font-semibold text-foreground">{studentName}</span> as inactive. All
            records will remain in the system for reports and history.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exit_date">Exit date</Label>
            <DatePicker value={form.exit_date} onChange={(isoDate) => setForm((p) => ({ ...p, exit_date: isoDate }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exit_reason">Reason</Label>
            <Select
              value={form.reason}
              onValueChange={(v) => setForm((p) => ({ ...p, reason: v }))}
            >
              <SelectTrigger id="exit_reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transferred to another school</SelectItem>
                <SelectItem value="expelled">Expelled by school</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exit_notes">Notes (optional)</Label>
            <Textarea
              id="exit_notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Any additional details about this exit."
            />
          </div>
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1.5">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen?.(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Confirm exit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type AllowedClassNames = { standardName: string; divisionName: string }[];

export function ManageStudentsList({
  canEdit = true,
  allowedClassNames,
}: {
  canEdit?: boolean;
  allowedClassNames?: AllowedClassNames;
}) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [standardFilter, setStandardFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [rteFilter, setRteFilter] = useState("all");
  const [standards, setStandards] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedStudentRows, setExpandedStudentRows] = useState<Record<string, boolean>>({});
  type SortKey = "full_name" | "standard" | "division" | "roll_number" | "gr_number" | "is_rte_quota" | "status";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Controlled dialog states
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [enrolmentOpen, setEnrolmentOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);


  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters or search terms change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, standardFilter, divisionFilter, statusFilter, rteFilter]);

  const supabase = useMemo(() => createClient(), []);
  const restrictByClass = allowedClassNames !== undefined;
  const allowedStandardNames = restrictByClass && allowedClassNames.length > 0 ? Array.from(new Set(allowedClassNames.map((p) => p.standardName))) : [];
  const allowedDivisionNames = restrictByClass && allowedClassNames.length > 0 ? Array.from(new Set(allowedClassNames.map((p) => p.divisionName))) : [];
  const allowedStandardsKey = allowedStandardNames.join("\u0001");
  const allowedDivisionsKey = allowedDivisionNames.join("\u0001");
  const allowedClassPairsKey = useMemo(() => {
    if (!allowedClassNames?.length) return "";
    return allowedClassNames.map((p) => `${p.standardName}\0${p.divisionName}`).sort().join("|");
  }, [allowedClassNames]);

  useEffect(() => {
    if (restrictByClass) {
      const stdNames = allowedStandardsKey ? allowedStandardsKey.split("\u0001") : [];
      const divNames = allowedDivisionsKey ? allowedDivisionsKey.split("\u0001") : [];
      setStandards(stdNames.map((name) => ({ id: name, name })));
      setDivisions(divNames.map((name) => ({ id: name, name })));
    } else {
      fetchStandards().then(setStandards);
      fetchAllDivisions().then(setDivisions);
    }
  }, [restrictByClass, allowedStandardsKey, allowedDivisionsKey, supabase]);


  // Fetch student rows
  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (standardFilter && standardFilter !== "all") q = q.eq("standard", standardFilter);
    if (divisionFilter && divisionFilter !== "all") q = q.eq("division", divisionFilter);
    if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
    if (rteFilter === "rte") q = q.eq("is_rte_quota", true);
    if (rteFilter === "non-rte") q = q.eq("is_rte_quota", false);
    if (debouncedSearch.trim()) {
      q = q.or(`full_name.ilike.%${debouncedSearch.trim()}%,gr_number.ilike.%${debouncedSearch.trim()}%`);
    }

    (async () => {
      const { data } = await q;
      let rows = (data ?? []) as StudentRow[];
      if (restrictByClass && allowedClassPairsKey) {
        const allowedPairs = new Set(allowedClassPairsKey.split("|"));
        rows = rows.filter((s) => allowedPairs.has(`${s.standard ?? ""}\0${s.division ?? ""}`));
      }
      setStudents(rows);
      setLoading(false);
    })();
  }, [debouncedSearch, standardFilter, divisionFilter, statusFilter, rteFilter, reloadKey, restrictByClass, allowedClassPairsKey, supabase]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      transferred: "outline",
      graduated: "secondary",
      suspended: "destructive",
    };
    return map[status] || "default";
  };
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const sortedStudents = useMemo(() => {
    if (!sortKey) return students;
    return [...students].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "full_name":
          av = (a.full_name ?? "").toLowerCase();
          bv = (b.full_name ?? "").toLowerCase();
          break;
        case "standard":
          av = (a.standard ?? "").toLowerCase();
          bv = (b.standard ?? "").toLowerCase();
          break;
        case "division":
          av = (a.division ?? "").toLowerCase();
          bv = (b.division ?? "").toLowerCase();
          break;
        case "roll_number":
          av = Number(a.roll_number ?? 0);
          bv = Number(b.roll_number ?? 0);
          break;
        case "gr_number":
          av = (a.gr_number ?? "").toLowerCase();
          bv = (b.gr_number ?? "").toLowerCase();
          break;
        case "is_rte_quota":
          av = a.is_rte_quota ? 1 : 0;
          bv = b.is_rte_quota ? 1 : 0;
          break;
        case "status":
          av = (a.status ?? "").toLowerCase();
          bv = (b.status ?? "").toLowerCase();
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [students, sortDir, sortKey]);

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, page, pageSize]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <>
      <Card className="border">
        <CardContent className="space-y-4 pt-6">
          <div className="w-full">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
              <div className="space-y-1 w-full min-w-0 lg:col-span-2">
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Input
                    placeholder="Name or GR No."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pr-8"
                  />
                  {search !== debouncedSearch && (
                    <div className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  )}
                </div>
              </div>
              <div className="space-y-1 w-full min-w-0">
                <Label className="text-xs">Standard</Label>
                <Select value={standardFilter} onValueChange={setStandardFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {standards.map((g) => (
                      <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-full min-w-0">
                <Label className="text-xs">Division</Label>
                <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-full min-w-0">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                    <SelectItem value="graduated">Graduated</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-full min-w-0">
                <Label className="text-xs">RTE</Label>
                <Select value={rteFilter} onValueChange={setRteFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="rte">RTE only</SelectItem>
                    <SelectItem value="non-rte">Non-RTE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {canEdit && (
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-1 h-9 px-3 w-full sm:w-auto lg:justify-self-end">
                      <UserPlus className="h-4 w-4" />
                      Add student
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                      <DialogTitle className="text-base">Add new student</DialogTitle>
                      <DialogDescription>
                        Fill in the admission form to create a new student record.
                      </DialogDescription>
                    </DialogHeader>
                    <StudentEntryForm />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground animate-pulse">Loading student records...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed rounded-lg bg-muted/10">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">No students found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                We couldn't find any students matching your current search criteria or filters. Try adjusting your search term or standard selection.
              </p>
              <div className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStandardFilter("all");
                    setDivisionFilter("all");
                    setStatusFilter("active");
                    setRteFilter("all");
                  }}
                >
                  Clear all filters
                </Button>
                {canEdit && (
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    Add student
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("full_name")}>
                        <span className="inline-flex items-center gap-1">Student Name <SortIcon col="full_name" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("standard")}>
                        <span className="inline-flex items-center gap-1">Standard <SortIcon col="standard" /></span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("division")}>
                        <span className="inline-flex items-center gap-1">Division <SortIcon col="division" /></span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("roll_number")}>
                        <span className="inline-flex items-center gap-1">Roll # <SortIcon col="roll_number" /></span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("gr_number")}>
                        <span className="inline-flex items-center gap-1">GR No <SortIcon col="gr_number" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("is_rte_quota")}>
                        <span className="inline-flex items-center gap-1">RTE <SortIcon col="is_rte_quota" /></span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("status")}>
                        <span className="inline-flex items-center gap-1">Status <SortIcon col="status" /></span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell text-center">Data&nbsp;%</TableHead>
                      <TableHead className="w-16 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.flatMap((s) => [
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <div className="relative inline-block group">
                            {s.full_name}
                            <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden min-w-[240px] rounded-md border bg-background p-3 text-xs shadow-md group-hover:block">
                              <div className="mb-1 font-semibold">Enrollment details</div>
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Standard</span>
                                <span>{s.standard ?? "—"}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Division</span>
                                <span>{s.division ?? "—"}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Roll #</span>
                                <span>{s.roll_number ?? "—"}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Status</span>
                                <span>{s.status ?? "active"}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Admission</span>
                                <span>
                                  {s.admission_date
                                    ? new Date(s.admission_date).toLocaleDateString()
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-9 px-2 sm:hidden flex items-center gap-1"
                            onClick={() =>
                              setExpandedStudentRows((prev) => ({
                                ...prev,
                                [s.id]: !prev[s.id],
                              }))
                            }
                          >
                            {expandedStudentRows[s.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            Details
                          </Button>
                        </TableCell>
                        <TableCell>{s.standard ?? "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell">{s.division ?? "—"}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{s.roll_number ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs hidden sm:table-cell">{s.gr_number ?? "—"}</TableCell>
                        <TableCell>
                          {s.is_rte_quota ? <Badge variant="secondary">RTE</Badge> : "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={getStatusBadge(s.status || "active")}>
                            {s.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {(() => {
                            const { percent } = computeCompleteness(s as unknown as Record<string, unknown>);
                            const color =
                              percent >= 80
                                ? "bg-green-500"
                                : percent >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-500";
                            return (
                              <div className="flex items-center space-x-2 justify-center">
                                <div className="w-12 bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground w-8">
                                  {percent}%
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="gap-2" onClick={() => {
                                setSelectedStudent(s);
                                setViewOpen(true);
                              }}>
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>View Profile</span>
                              </DropdownMenuItem>
                              {canEdit && (
                                <>
                                  <DropdownMenuItem className="gap-2" onClick={() => {
                                    setSelectedStudent(s);
                                    setEditOpen(true);
                                  }}>
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Edit Details</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2" onClick={() => {
                                    setSelectedStudent(s);
                                    setEnrolmentOpen(true);
                                  }}>
                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Enrolments</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/5"
                                    disabled={s.status !== "active"}
                                    onClick={() => {
                                      setSelectedStudent(s);
                                      setExitOpen(true);
                                    }}
                                  >
                                    <LogOut className="h-3.5 w-3.5 text-destructive" />
                                    <span>Exit Student</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>,
                      expandedStudentRows[s.id] ? (
                        <TableRow key={`${s.id}-mobile-details`} className="sm:hidden bg-muted/30">
                          <TableCell colSpan={3} className="text-sm space-y-2 py-3 px-4">
                            <div><span className="text-muted-foreground font-medium">Division:</span> {s.division ?? "—"}</div>
                            <div><span className="text-muted-foreground font-medium">Roll #:</span> {s.roll_number ?? "—"}</div>
                            <div><span className="text-muted-foreground font-medium">GR No:</span> {s.gr_number ?? "—"}</div>
                            <div><span className="text-muted-foreground font-medium">Status:</span> {s.status ?? "active"}</div>
                            <div className="flex items-center space-x-2">
                              <span className="text-muted-foreground font-medium">Data completeness:</span>{" "}
                              {(() => {
                                const { percent } = computeCompleteness(s as unknown as Record<string, unknown>);
                                const color =
                                  percent >= 80
                                    ? "bg-green-500"
                                    : percent >= 50
                                      ? "bg-amber-500"
                                      : "bg-red-500";
                                return (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-12 bg-muted rounded-full h-1.5 overflow-hidden">
                                      <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
                                    </div>
                                    <span className="text-xs font-semibold text-muted-foreground">
                                      {percent}%
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="pt-2 flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => {
                                setSelectedStudent(s);
                                setViewOpen(true);
                              }}>
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                              {canEdit && (
                                <>
                                  <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => {
                                    setSelectedStudent(s);
                                    setEditOpen(true);
                                  }}>
                                    <Pencil className="h-3 w-3" />
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => {
                                    setSelectedStudent(s);
                                    setEnrolmentOpen(true);
                                  }}>
                                    <BookOpen className="h-3 w-3" />
                                    Enrolments
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 h-8 text-destructive hover:text-destructive"
                                    disabled={s.status !== "active"}
                                    onClick={() => {
                                      setSelectedStudent(s);
                                      setExitOpen(true);
                                    }}
                                  >
                                    <LogOut className="h-3 w-3" />
                                    Exit
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null,
                    ])}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t pt-4 gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">Rows per page:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-16">
                        <SelectValue placeholder={String(pageSize)} />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Showing <span className="font-semibold">{Math.min((page - 1) * pageSize + 1, sortedStudents.length)}</span>-
                    <span className="font-semibold">{Math.min(page * pageSize, sortedStudents.length)}</span> of{" "}
                    <span className="font-semibold">{sortedStudents.length}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-xs font-semibold px-2">
                    Page {page} of {Math.max(1, Math.ceil(sortedStudents.length / pageSize))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setPage((p) => Math.min(p + 1, Math.ceil(sortedStudents.length / pageSize)))}
                    disabled={page >= Math.ceil(sortedStudents.length / pageSize)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Portals (State Controlled) */}
      {selectedStudent && (
        <StudentViewDialog
          student={selectedStudent}
          open={viewOpen}
          onOpenChange={setViewOpen}
        />
      )}

      {selectedStudent && (
        <StudentEditDialog
          student={selectedStudent}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => {
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {selectedStudent && (
        <StudentEnrolmentsDialog
          studentId={selectedStudent.id}
          studentName={selectedStudent.full_name}
          grNumber={selectedStudent.gr_number}
          open={enrolmentOpen}
          onOpenChange={setEnrolmentOpen}
        />
      )}

      {selectedStudent && (
        <StudentExitDialog
          studentId={selectedStudent.id}
          studentName={selectedStudent.full_name}
          currentStatus={selectedStudent.status}
          open={exitOpen}
          onOpenChange={setExitOpen}
          onExited={() => {
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </>
  );
}
