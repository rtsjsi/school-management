"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pencil, BookOpen } from "lucide-react";
import { fetchStandards, fetchAllDivisions } from "@/lib/lov";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

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

export function ManageStudentsList({ canEdit = true }: { canEdit?: boolean }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchStandards().then(setGrades);
    fetchAllDivisions().then(setDivisions);
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
  }, [search, gradeFilter, divisionFilter, statusFilter]);

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
        <div className="flex flex-wrap gap-4 items-end">
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
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>RTE</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Roll #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    {canEdit && (
                      <TableCell className="space-x-1">
                        <Button size="sm" variant="outline" className="gap-1" asChild>
                          <Link href={`/dashboard/students/${s.id}/edit`}>
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Link>
                        </Button>
                        <StudentEnrolmentsDialog
                          studentId={s.id}
                          studentName={s.full_name}
                          studentCode={s.student_id}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {s.student_id || "—"}
                    </TableCell>
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
