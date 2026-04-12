"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createSubject } from "@/app/(workspace)/dashboard/classes/actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { PdfIcon } from "@/components/ui/export-icons";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { exportSubjectsPdf as exportSubjectsReportPdf } from "@/lib/subjects-report-export";
import { computeSubjectCompleteness, completenessBadgeClassNames } from "@/lib/master-data-completeness";

const NO_TEACHER_VALUE = "__none__";

type StandardRow = { id: string; name: string; section: string };
type SubjectRow = {
  id: string;
  name: string;
  evaluation_type: string;
  subject_teacher_id: string | null;
};
type EmployeeOption = { id: string; full_name: string };

export function SubjectMaster() {
  const school = useSchoolSettings();
  const router = useRouter();
  const [standards, setStandards] = useState<StandardRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEvalType, setAddEvalType] = useState<"grade" | "mark">("mark");
  const [addTeacherId, setAddTeacherId] = useState<string>(NO_TEACHER_VALUE);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    Promise.all([
      supabase.from("standards").select("id, name, section").order("sort_order"),
      supabase.from("employees").select("id, full_name").order("full_name"),
    ]).then(([stdRes, empRes]) => {
      setStandards((stdRes.data ?? []) as StandardRow[]);
      setEmployees((empRes.data ?? []) as EmployeeOption[]);
    });
  }, [supabase]);

  const loadSubjects = useCallback(() => {
    if (!selectedStandardId) return;
    supabase
      .from("subjects")
      .select("id, name, evaluation_type, subject_teacher_id")
      .eq("standard_id", selectedStandardId)
      .order("sort_order")
      .then(({ data }) => setSubjects((data ?? []) as SubjectRow[]));
  }, [supabase, selectedStandardId]);

  useEffect(() => {
    if (!selectedStandardId) {
      setSubjects([]);
      return;
    }
    loadSubjects();
  }, [selectedStandardId, loadSubjects]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);
    try {
      const result = await createSubject(
        selectedStandardId,
        addName,
        addEvalType,
        addTeacherId === NO_TEACHER_VALUE ? null : addTeacherId
      );
      if (result.ok) {
        setAddOpen(false);
        setAddName("");
        setAddEvalType("mark");
        setAddTeacherId(NO_TEACHER_VALUE);
        loadSubjects();
        router.refresh();
      } else {
        setAddError(result.error);
      }
    } catch {
      setAddError("Something went wrong.");
    } finally {
      setAddLoading(false);
    }
  };

  const exportSubjectsPdf = async () => {
    if (!selectedStandardId || subjects.length === 0) return;
    try {
      const stdName = standards.find((s) => s.id === selectedStandardId)?.name ?? "Standard";
      const rows = subjects.map((s) => ({
        name: s.name,
        evaluationType: s.evaluation_type === "grade" ? "Grade based" : "Mark based",
        teacherName: employees.find((e) => e.id === s.subject_teacher_id)?.full_name ?? "—",
      }));
      const subtitle = `Standard: ${stdName}  ·  ${rows.length} subject${rows.length !== 1 ? "s" : ""}`;
      const fileBase = `subjects-report-${stdName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`;
      exportSubjectsReportPdf(rows, fileBase, {
        schoolName: school.name || "Subjects Report",
        subtitle,
      });
    } catch {
      alert("Failed to export subjects.");
    }
  };

  const selectedStandard = standards.find((c) => c.id === selectedStandardId);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2 min-w-[200px]">
            <Label>Standard</Label>
            <Select value={selectedStandardId} onValueChange={setSelectedStandardId}>
              <SelectTrigger>
                <SelectValue placeholder="Select standard" />
              </SelectTrigger>
              <SelectContent>
                {standards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedStandardId && (
            <>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Subject</DialogTitle>
                  <DialogDescription>
                    Add a subject for {selectedStandard?.name}. Choose evaluation type.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4">
                  {addError && (
                    <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{addError}</p>
                  )}
                  <div className="space-y-2">
                    <Label>Subject name</Label>
                    <Input
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="e.g. English, Mathematics"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Evaluation type</Label>
                    <Select value={addEvalType} onValueChange={(v) => setAddEvalType(v as "grade" | "mark")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grade">Grade based (A, B, C, etc.)</SelectItem>
                        <SelectItem value="mark">Mark based (marks out of max)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject teacher</Label>
                    <Select value={addTeacherId} onValueChange={setAddTeacherId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TEACHER_VALUE}>None</SelectItem>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addLoading}>
                      {addLoading ? "Adding…" : "Add"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            {subjects.length > 0 && (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm"
                onClick={exportSubjectsPdf}
              >
                <PdfIcon className="h-4 w-4" />
                PDF
              </Button>
            )}
            </>
          )}
        </div>

        {selectedStandardId && (
          subjects.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Evaluation type</TableHead>
                    <TableHead>Subject teacher</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Data&nbsp;%</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((s) => (
                    <SubjectRow key={s.id} subject={s} employees={employees} onSaved={loadSubjects} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No subjects for this standard. Click &quot;Add Subject&quot; to add.
            </p>
          )
        )}

        {!selectedStandardId && standards.length > 0 && (
          <p className="text-sm text-muted-foreground py-4">Select a standard to manage its subjects.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SubjectRow({
  subject,
  employees,
  onSaved,
}: {
  subject: SubjectRow;
  employees: EmployeeOption[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.name);
  const [evalType, setEvalType] = useState<"grade" | "mark">(
    (subject.evaluation_type as "grade" | "mark") || "mark"
  );
  const [teacherId, setTeacherId] = useState<string>(subject.subject_teacher_id ?? NO_TEACHER_VALUE);
  const [loading, setLoading] = useState(false);

  const teacherDisplay =
    subject.subject_teacher_id &&
    employees.find((e) => e.id === subject.subject_teacher_id)?.full_name;

  const subjectPctEditing = useMemo(
    () =>
      computeSubjectCompleteness({
        name,
        evaluation_type: evalType,
        subject_teacher_id: teacherId === NO_TEACHER_VALUE ? null : teacherId,
      } as Record<string, unknown>).percent,
    [evalType, name, teacherId],
  );

  const subjectPctView = useMemo(
    () => computeSubjectCompleteness(subject as unknown as Record<string, unknown>).percent,
    [subject],
  );

  const handleSave = async () => {
    setLoading(true);
    const { updateSubject } = await import("@/app/(workspace)/dashboard/classes/actions");
    const result = await updateSubject(
      subject.id,
      name,
      evalType,
      teacherId === NO_TEACHER_VALUE ? null : teacherId
    );
    setLoading(false);
    if (result.ok) {
      setEditing(false);
      onSaved();
    } else {
      alert(result.error);
    }
  };

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
        </TableCell>
        <TableCell>
          <Select value={evalType} onValueChange={(v) => setEvalType(v as "grade" | "mark")}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grade">Grade</SelectItem>
              <SelectItem value="mark">Mark</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger className="h-8 min-w-[160px]">
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEACHER_VALUE}>None</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-center">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${completenessBadgeClassNames(subjectPctEditing)}`}
          >
            {subjectPctEditing}%
          </span>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={loading}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setName(subject.name);
                setEvalType((subject.evaluation_type as "grade" | "mark") || "mark");
                setTeacherId(subject.subject_teacher_id ?? NO_TEACHER_VALUE);
              }}
            >
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{subject.name}</TableCell>
      <TableCell>
        <span className="text-sm">{subject.evaluation_type === "grade" ? "Grade based" : "Mark based"}</span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{teacherDisplay ?? "—"}</TableCell>
      <TableCell className="text-center">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${completenessBadgeClassNames(subjectPctView)}`}
        >
          {subjectPctView}%
        </span>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setName(subject.name);
            setEvalType((subject.evaluation_type as "grade" | "mark") || "mark");
            setTeacherId(subject.subject_teacher_id ?? NO_TEACHER_VALUE);
            setEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
