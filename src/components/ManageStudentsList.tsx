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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Pencil } from "lucide-react";
import { fetchClasses, fetchAllDivisions } from "@/lib/lov";

type StudentRow = {
  id: string;
  student_id?: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  grade?: string;
  section?: string;
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

export function ManageStudentsList({ canEdit = true }: { canEdit?: boolean }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchClasses().then(setGrades);
    fetchAllDivisions().then(setDivisions);
  }, []);

  useEffect(() => {
    let q = supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (gradeFilter && gradeFilter !== "all") q = q.eq("grade", gradeFilter);
    if (sectionFilter && sectionFilter !== "all") q = q.eq("section", sectionFilter);
    if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
    if (search.trim()) {
      q = q.or(`full_name.ilike.%${search.trim()}%,student_id.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
    }

    (async () => {
      const { data } = await q;
      setStudents((data ?? []) as StudentRow[]);
      setLoading(false);
    })();
  }, [search, gradeFilter, sectionFilter, statusFilter]);

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
      <CardHeader>
        <CardTitle>{canEdit ? "Manage Students" : "Students"}</CardTitle>
        <CardDescription>
          {canEdit ? "View, search, and edit existing student records." : "View and search student records (read-only)."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2 flex-1 min-w-[180px]">
            <Label>Search</Label>
            <Input
              placeholder="Name, Student ID, email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2 w-28">
            <Label>Grade</Label>
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
            <Label>Section</Label>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
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
                  {canEdit && <TableHead className="w-16"></TableHead>}
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>RTE</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Roll #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    {canEdit && (
                      <TableCell>
                        <Button size="sm" variant="outline" className="gap-1" asChild>
                          <Link href={`/dashboard/students/${s.id}/edit`}>
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Link>
                        </Button>
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
                    <TableCell>{s.section ?? "—"}</TableCell>
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
