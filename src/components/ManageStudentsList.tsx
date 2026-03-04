"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
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

type StudentRow = {
  id: string;
  student_id?: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  grade?: string;
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
  academic_year?: string;
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
  studentCode,
}: {
  studentId: string;
  studentName: string;
  studentCode?: string;
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
          ? supabase.from("divisions").select("id, name").in("id", divIds)
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
            {studentCode && (
              <span className="font-mono text-xs font-normal text-muted-foreground ml-2">
                ({studentCode})
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
        <Button size="sm" variant="outline" className="p-1.5">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            Edit student — {student.full_name}
            {student.student_id && (
              <span className="font-mono text-xs font-normal text-muted-foreground ml-2">
                ({student.student_id})
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

      await supabase
        .from("student_enrollments")
        .update({ status: "inactive" })
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
                <SelectItem value="completed">Completed course / graduated</SelectItem>
                <SelectItem value="transfer">Transferred to another school</SelectItem>
                <SelectItem value="fee_default">Fee default / non-payment</SelectItem>
                <SelectItem value="personal">Personal reasons</SelectItem>
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

export function ManageStudentsList({ canEdit = true }: { canEdit?: boolean }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [activeYearName, setActiveYearName] = useState<string | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    fetchStandards().then(setGrades);
    fetchAllDivisions().then(setDivisions);
    supabase
      .from("academic_years")
      .select("name")
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setActiveYearName(data.name as string);
      });
  }, []);

  useEffect(() => {
    let q = supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (gradeFilter && gradeFilter !== "all") q = q.eq("grade", gradeFilter);
    if (divisionFilter && divisionFilter !== "all") q = q.eq("division", divisionFilter);
    if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
    if (search.trim()) {
      q = q.or(`full_name.ilike.%${search.trim()}%,student_id.ilike.%${search.trim()}%`);
    }

    (async () => {
      const { data } = await q;
      setStudents((data ?? []) as StudentRow[]);
      setLoading(false);
    })();
  }, [search, gradeFilter, divisionFilter, statusFilter, reloadKey]);

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
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div className="flex flex-wrap gap-4 items-end flex-1 min-w-[260px]">
            <div className="space-y-2 flex-1 min-w-[180px]">
              <Label>Search</Label>
              <Input
                placeholder="Name or Student ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2 w-28">
              <Label>Standard</Label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-24">
              <Label>Division</Label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-28">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
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
          </div>
          {canEdit && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1">
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
                  <StudentEntryForm defaultAcademicYear={activeYearName} />
                </div>
              </DialogContent>
            </Dialog>
          )}
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
                  {canEdit && <TableHead className="w-40 whitespace-nowrap">Actions</TableHead>}
                  <TableHead>Name</TableHead>
                  <TableHead>RTE</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Roll #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admission</TableHead>
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
                        <StudentEnrolmentsDialog
                          studentId={s.id}
                          studentName={s.full_name}
                          studentCode={s.student_id}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>
                      {s.is_rte_quota ? <Badge variant="secondary">RTE</Badge> : "—"}
                    </TableCell>
                    <TableCell>{s.grade ?? "—"}</TableCell>
                    <TableCell>{s.division ?? "—"}</TableCell>
                    <TableCell className="text-center">{s.roll_number ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(s.status || "active")}>
                        {s.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.admission_date
                        ? new Date(s.admission_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
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
