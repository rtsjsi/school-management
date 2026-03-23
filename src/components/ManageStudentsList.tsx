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
import { Pencil, BookOpen, UserPlus, LogOut } from "lucide-react";
import { fetchStandards, fetchAllDivisions } from "@/lib/lov";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import StudentEntryForm from "@/components/StudentEntryForm";
import { StudentEditForm } from "@/components/StudentEditForm";
import { StudentViewDialog } from "@/components/StudentViewDialog";

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
}: {
  studentId: string;
  studentName: string;
  grNumber?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EnrolmentRow[]>([]);
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

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && rows.length === 0 && !loading) {
      await loadEnrolments();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1">
          <BookOpen className="h-3 w-3" />
          Enrolments
        </Button>
      </DialogTrigger>
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
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-muted-foreground">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
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

function StudentEditDialog({
  student,
  onSaved,
}: {
  student: StudentRow & { [key: string]: unknown };
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 px-2">
          <Pencil className="h-3 w-3" />
          <span className="text-xs">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            Edit student — {student.full_name}
            {student.gr_number && (
              <span className="font-mono text-xs font-normal text-muted-foreground ml-2">
                (GR: {student.gr_number})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>Update student details. Changes will be saved immediately.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <StudentEditForm
            student={student as unknown as Record<string, unknown> & { id: string; full_name: string }}
            embedded
            onSaved={() => {
              setOpen(false);
              onSaved();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StudentExitDialog({
  studentId,
  studentName,
  currentStatus,
  onExited,
}: {
  studentId: string;
  studentName: string;
  currentStatus?: string | null;
  onExited?: () => void;
}) {
  const [open, setOpen] = useState(false);
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

      setOpen(false);
      if (onExited) onExited();
    } catch {
      setError("Failed to exit student. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = !!currentStatus && currentStatus !== "active";

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
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
            <Input
              id="exit_date"
              type="date"
              value={form.exit_date}
              onChange={(e) => setForm((p) => ({ ...p, exit_date: e.target.value }))}
            />
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
              onClick={() => setOpen(false)}
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
  const [standardFilter, setStandardFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rteFilter, setRteFilter] = useState("all");
  const [standards, setStandards] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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

  useEffect(() => {
    let q = supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (standardFilter && standardFilter !== "all") q = q.eq("standard", standardFilter);
    if (divisionFilter && divisionFilter !== "all") q = q.eq("division", divisionFilter);
    if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
    if (rteFilter === "rte") q = q.eq("is_rte_quota", true);
    if (rteFilter === "non-rte") q = q.eq("is_rte_quota", false);
    if (search.trim()) {
      q = q.or(`full_name.ilike.%${search.trim()}%,gr_number.ilike.%${search.trim()}%`);
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
  }, [search, standardFilter, divisionFilter, statusFilter, rteFilter, reloadKey, restrictByClass, allowedClassPairsKey, supabase]);

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

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="w-full overflow-x-auto">
          <div className="inline-flex min-w-max items-end gap-2">
            <div className="space-y-1 w-[220px]">
              <Label className="text-xs">Search</Label>
              <Input
                placeholder="Name or GR No."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1 w-[110px]">
              <Label className="text-xs">Standard</Label>
              <Select value={standardFilter} onValueChange={setStandardFilter}>
                <SelectTrigger className="h-8"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {standards.map((g) => (
                    <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-[105px]">
              <Label className="text-xs">Division</Label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="h-8"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-[108px]">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8"><SelectValue placeholder="All" /></SelectTrigger>
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
            <div className="space-y-1 w-[100px]">
              <Label className="text-xs">RTE</Label>
              <Select value={rteFilter} onValueChange={setRteFilter}>
                <SelectTrigger className="h-8"><SelectValue placeholder="All" /></SelectTrigger>
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
                  <Button className="gap-1 h-8 px-3">
                    <UserPlus className="h-4 w-4" />
                    Add student
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl">
                  <DialogHeader>
                    <DialogTitle className="text-base">Add new student</DialogTitle>
                    <DialogDescription>
                      Fill in the admission form to create a new student record.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[70vh] overflow-y-auto pr-1">
                    <StudentEntryForm />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8">Loading…</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No students found.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {canEdit && <TableHead className="w-32 whitespace-nowrap">Actions</TableHead>}
                  <TableHead>Student Name</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Roll #</TableHead>
                  <TableHead>GR No</TableHead>
                  <TableHead>RTE</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-center">View</TableHead>
                  {canEdit && <TableHead className="w-32 text-center">Enrolments</TableHead>}
                  {canEdit && <TableHead className="w-28 text-right">Exit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    {canEdit && (
                      <TableCell className="space-x-1">
                        <StudentEditDialog
                          student={s}
                          onSaved={() => {
                            setReloadKey((k) => k + 1);
                          }}
                        />
                      </TableCell>
                    )}
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
                    </TableCell>
                    <TableCell>{s.standard ?? "—"}</TableCell>
                    <TableCell>{s.division ?? "—"}</TableCell>
                    <TableCell className="text-center">{s.roll_number ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{s.gr_number ?? "—"}</TableCell>
                    <TableCell>
                      {s.is_rte_quota ? <Badge variant="secondary">RTE</Badge> : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(s.status || "active")}>
                        {s.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <StudentViewDialog student={s} />
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-center">
                        <StudentEnrolmentsDialog
                          studentId={s.id}
                          studentName={s.full_name}
                          grNumber={s.gr_number}
                        />
                      </TableCell>
                    )}
                    {canEdit && (
                      <TableCell className="text-right">
                        <StudentExitDialog
                          studentId={s.id}
                          studentName={s.full_name}
                          currentStatus={s.status}
                          onExited={() => {
                            setReloadKey((k) => k + 1);
                          }}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
