"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";

const GRADE_OPTIONS = ["A+", "A", "B", "C", "D"] as const;

type Exam = {
  id: string;
  name: string;
  standard: string | null;
  term: string | null;
  academic_years: { id: string; name: string } | { id: string; name: string }[] | null;
};

type Student = { id: string; full_name: string; standard: string | null; division: string | null; roll_number: number | null };
type Subject = { id: string; name: string; code: string | null; evaluation_type: string };
type CellState = { score: string; max_score: string; grade: string; is_absent: boolean };

type AllowedClassNames = { standardName: string; divisionName: string }[];

export default function MarksEntry({ allowedClassNames }: { allowedClassNames?: AllowedClassNames } = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const allowedStandardSet = useMemo(() => {
    if (!allowedClassNames?.length) return null;
    return new Set(allowedClassNames.map((p) => p.standardName));
  }, [allowedClassNames]);
  const allowedPairSet = useMemo(() => {
    if (!allowedClassNames?.length) return null;
    return new Set(allowedClassNames.map((p) => `${p.standardName}\0${p.divisionName}`));
  }, [allowedClassNames]);

  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [termFilter, setTermFilter] = useState<string>("");
  const [marks, setMarks] = useState<Record<string, Record<string, CellState>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classList, setClassList] = useState<{ standardName: string; divisionName: string }[]>([]);
  const [examSubjectMaxMarks, setExamSubjectMaxMarks] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const exam = exams.find((e) => e.id === selectedExamId);
  const [effectiveStandard, effectiveDivision] = classFilter ? classFilter.split("\0") : [null, null];

  // Load current academic year exams and class names
  useEffect(() => {
    (async () => {
      const { data: ay } = await supabase
        .from("academic_years")
        .select("id")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      let query = supabase
        .from("exams")
        .select("id, name, standard, term, academic_years(id, name)")
        .order("term", { ascending: true })
        .order("name", { ascending: true });
      if (ay?.id) query = query.eq("academic_year_id", ay.id);
      const { data: examData } = await query;
      let list = (examData ?? []) as unknown as Exam[];
      if (allowedStandardSet) list = list.filter((e) => e.standard && allowedStandardSet.has(e.standard));
      setExams(list);
    })();
    if (allowedClassNames?.length) {
      setClassList(allowedClassNames);
    } else {
      supabase
        .from("students")
        .select("standard, division")
        .eq("status", "active")
        .then(({ data }) => {
          const unique = new Map<string, { standardName: string; divisionName: string }>();
          (data ?? []).forEach((row) => {
            if (row.standard && row.division) {
              const key = `${row.standard}\0${row.division}`;
              unique.set(key, { standardName: row.standard, divisionName: row.division });
            }
          });
          const list = Array.from(unique.values()).sort((a, b) => 
            a.standardName.localeCompare(b.standardName) || a.divisionName.localeCompare(b.divisionName)
          );
          setClassList(list);
        });
    }
  }, [supabase, allowedClassNames]);

  // Clear selected exam if filters change
  useEffect(() => {
    setSelectedExamId("");
  }, [classFilter, termFilter]);

  // Load subjects for the selected exam
  useEffect(() => {
    if (!selectedExamId) {
      setSubjects([]);
      return;
    }
    supabase
      .from("exam_subjects")
      .select(`
        subject_id,
        max_marks,
        subjects (
          id, name, code, evaluation_type, sort_order
        )
      `)
      .eq("exam_id", selectedExamId)
      .then(({ data }) => {
        if (!data) {
          setSubjects([]);
          return;
        }
        // Filter out any broken relations
        const validData = data.filter((row: any) => row.subjects);
        // Sort by the subject's sort_order
        validData.sort((a: any, b: any) => (a.subjects.sort_order || 0) - (b.subjects.sort_order || 0));
        
        const subList = validData.map((row: any) => row.subjects);
        setSubjects(subList as Subject[]);
      });
  }, [selectedExamId, supabase]);

  // Load max marks per subject for selected exam
  useEffect(() => {
    if (!selectedExamId || subjects.length === 0) {
      setExamSubjectMaxMarks({});
      return;
    }
    supabase
      .from("exam_subjects")
      .select("subject_id, max_marks")
      .eq("exam_id", selectedExamId)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data ?? []).forEach((r: { subject_id: string; max_marks: number }) => {
          map[r.subject_id] = Number(r.max_marks);
        });
        setExamSubjectMaxMarks(map);
      });
  }, [selectedExamId, subjects, supabase]);

  const loadStudentsAndMarks = useCallback(() => {
    if (!selectedExamId || subjects.length === 0) return;
    setLoading(true);
    setError(null);
    (async () => {
      let query = supabase
        .from("students")
        .select("id, full_name, standard, division, roll_number")
        .eq("status", "active")
        .order("full_name");
      // Filter by the selected class
      if (effectiveStandard) query = query.eq("standard", effectiveStandard);
      if (effectiveDivision) query = query.eq("division", effectiveDivision);

      const { data: st } = await query;
      let studentList = (st ?? []) as Student[];
      if (allowedPairSet) {
        studentList = studentList.filter((s) =>
          allowedPairSet.has(`${s.standard ?? ""}\0${s.division ?? ""}`)
        );
      }
      studentList.sort((a, b) => {
        const rollA = a.roll_number ?? 999999;
        const rollB = b.roll_number ?? 999999;
        if (rollA !== rollB) return rollA - rollB;
        return a.full_name.localeCompare(b.full_name);
      });
      setStudents(studentList);

      const initial: Record<string, Record<string, CellState>> = {};
      studentList.forEach((s) => {
        initial[s.id] = {};
        subjects.forEach((sub) => {
          initial[s.id][sub.id] = { score: "", max_score: "", grade: "", is_absent: false };
        });
      });

      const { data: rows } = await supabase
        .from("exam_result_subjects")
        .select("student_id, subject_id, score, max_score, grade, is_absent")
        .eq("exam_id", selectedExamId);
      if (rows?.length) {
        rows.forEach(
          (r: {
            student_id: string;
            subject_id: string;
            score: number | null;
            max_score: number | null;
            grade: string | null;
            is_absent: boolean;
          }) => {
            if (initial[r.student_id]?.[r.subject_id]) {
              initial[r.student_id][r.subject_id] = {
                score: r.score != null ? String(r.score) : "",
                max_score: r.max_score != null ? String(r.max_score) : "",
                grade: r.grade ?? "",
                is_absent: r.is_absent ?? false,
              };
            }
          }
        );
      }
      setMarks(initial);
      setIsDirty(false);
      setIsEditMode(false);
    })().finally(() => setLoading(false));
  }, [supabase, selectedExamId, effectiveStandard, effectiveDivision, subjects, allowedPairSet]);

  useEffect(() => {
    if (!selectedExamId || subjects.length === 0) {
      setStudents([]);
      setMarks({});
      return;
    }
    loadStudentsAndMarks();
  }, [selectedExamId, subjects.length, effectiveStandard, effectiveDivision, loadStudentsAndMarks]);

  const setCell = (studentId: string, subjectId: string, patch: Partial<CellState>) => {
    setIsDirty(true);
    setMarks((prev) => {
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = {};
      next[studentId] = {
        ...next[studentId],
        [subjectId]: { ...(next[studentId][subjectId] ?? { score: "", max_score: "", grade: "", is_absent: false }), ...patch },
      };
      return next;
    });
  };

  const toggleAbsent = (studentId: string, subjectId: string) => {
    if (!isEditMode) return;
    setIsDirty(true);
    setMarks((prev) => {
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = {};
      const cur = next[studentId][subjectId] ?? { score: "", max_score: "", grade: "", is_absent: false };
      next[studentId] = { ...next[studentId], [subjectId]: { ...cur, is_absent: !cur.is_absent } };
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, studentId: string, subjectId: string) => {
    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      toggleAbsent(studentId, subjectId);
    }
  };

  // Prevent accidental navigation when there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handlePopState = (e: PopStateEvent) => {
      if (!window.confirm("You have unsaved marks. Are you sure you want to go back and lose your changes?")) {
        // Push state back to prevent leaving
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    const handleInteraction = (e: Event) => {
      const target = e.target as HTMLElement;
      const a = target.closest("a");
      const button = target.closest("button");
      const isTab = button?.getAttribute("role") === "tab";

      if (isTab && (e.type === "mousedown" || e.type === "keydown")) {
        if (e.type === "keydown") {
          const key = (e as KeyboardEvent).key;
          if (!["Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return;
        }
        const isCurrentTab = button.getAttribute("data-state") === "active";
        if (!isCurrentTab) {
          if (!window.confirm("You have unsaved marks. Are you sure you want to switch tabs and lose your changes?")) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      } else if (a && e.type === "click") {
        if (a.href && a.target !== "_blank") {
          if (a.href.startsWith(window.location.origin) && a.pathname !== window.location.pathname) {
            if (!window.confirm("You have unsaved marks. Are you sure you want to leave this page and lose your changes?")) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }
      }
    };
    
    document.addEventListener("click", handleInteraction, { capture: true });
    document.addEventListener("mousedown", handleInteraction, { capture: true });
    document.addEventListener("keydown", handleInteraction, { capture: true });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleInteraction, { capture: true });
      document.removeEventListener("mousedown", handleInteraction, { capture: true });
      document.removeEventListener("keydown", handleInteraction, { capture: true });
    };
  }, [isDirty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) {
      setError("Select an exam first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const rows: {
        exam_id: string;
        student_id: string;
        subject_id: string;
        score: number | null;
        max_score: number | null;
        grade: string | null;
        is_absent: boolean;
      }[] = [];
      for (const [studentId, subMap] of Object.entries(marks)) {
        for (const [subjectId, cell] of Object.entries(subMap)) {
          const sub = subjects.find((s) => s.id === subjectId);
          const isGradeBased = sub?.evaluation_type === "grade";
          rows.push({
            exam_id: selectedExamId,
            student_id: studentId,
            subject_id: subjectId,
            score: cell.is_absent ? null : (isGradeBased ? null : (cell.score.trim() ? parseFloat(cell.score) : null)),
            max_score: cell.is_absent ? null : (isGradeBased ? null : (cell.max_score.trim() ? parseFloat(cell.max_score) : null)),
            grade: cell.is_absent ? null : (isGradeBased ? (cell.grade.trim() || null) : null),
            is_absent: cell.is_absent,
          });
        }
      }

      if (rows.length > 0) {
        const { error: upsertError } = await supabase.from("exam_result_subjects").upsert(
          rows.map(row => ({ ...row, updated_at: new Date().toISOString() })),
          { onConflict: "exam_id,student_id,subject_id" }
        );
        if (upsertError) throw upsertError;
      }

      setIsDirty(false);
      toast({
        title: "Marks saved successfully",
        description: "All changes have been securely recorded.",
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleClassFilterChange = (val: string) => {
    if (isDirty && !window.confirm("You have unsaved marks. Are you sure you want to change class and lose them?")) return;
    setIsDirty(false);
    setClassFilter(val);
  };

  const handleTermFilterChange = (val: string) => {
    if (isDirty && !window.confirm("You have unsaved marks. Are you sure you want to change term and lose them?")) return;
    setIsDirty(false);
    setTermFilter(val);
  };

  const handleExamChange = (val: string) => {
    if (isDirty && !window.confirm("You have unsaved marks. Are you sure you want to change exam and lose them?")) return;
    setIsDirty(false);
    setSelectedExamId(val);
  };

  const divisions = Array.from(new Set(students.map((s) => s.division).filter(Boolean))) as string[];
  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {/* Filters: Class, Term, Exam */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={classFilter} onValueChange={handleClassFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classList.map((c) => {
                    const key = `${c.standardName}\0${c.divisionName}`;
                    return (
                      <SelectItem key={key} value={key}>
                        {c.standardName} / {c.divisionName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term *</Label>
              <Select value={termFilter} onValueChange={handleTermFilterChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term-1">Term-1</SelectItem>
                  <SelectItem value="Term-2">Term-2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exam *</Label>
              <Select value={selectedExamId} onValueChange={handleExamChange} disabled={!classFilter || !termFilter}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder={!classFilter || !termFilter ? "Select Class and Term first" : "Select exam"} />
                </SelectTrigger>
                <SelectContent>
                  {exams
                    .filter((e) => !e.standard || e.standard === effectiveStandard)
                    .filter((e) => e.term === termFilter)
                    .map((e) => {
                      const label = e.name;
                      return (
                        <SelectItem key={e.id} value={e.id}>
                          {label}
                        </SelectItem>
                      );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            {selectedExamId && !isEditMode && (
              <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsEditMode(true);
                }} 
                className="shadow-sm font-semibold text-sm h-10"
              >
                Edit Marks
              </Button>
            )}
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground">Loading students and existing marks…</p>
          )}

          {selectedExamId && subjects.length > 0 && students.length > 0 && !loading && (
            <>
              <p className="text-sm text-muted-foreground">
                Enter marks or grades per subject. Right‑click a cell to mark absent (A). Max marks are from exam setup.
              </p>
              <div className="overflow-x-auto border rounded-md" style={{ maxHeight: 440 }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-muted/80 min-w-[80px] w-[80px]">Roll No</TableHead>
                      <TableHead className="sticky left-[80px] z-10 bg-muted/80 min-w-[180px] w-[180px]">Student</TableHead>
                      {subjects.map((sub) => (
                        <TableHead
                          key={sub.id}
                          className="text-center min-w-[88px] whitespace-nowrap bg-muted/50"
                          title={sub.evaluation_type === "grade" ? "Grade (A/B/C)" : `Out of ${examSubjectMaxMarks[sub.id] ?? "?"}`}
                        >
                          {sub.code ?? sub.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium text-sm text-center">
                          {s.roll_number ?? "—"}
                        </TableCell>
                        <TableCell className="sticky left-[80px] z-10 bg-background font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]" title={s.full_name}>
                          {s.full_name}
                        </TableCell>
                        {subjects.map((sub) => {
                          const cell = marks[s.id]?.[sub.id] ?? { score: "", max_score: "", grade: "", is_absent: false };
                          const isGradeBased = sub.evaluation_type === "grade";
                          const maxMarks = examSubjectMaxMarks[sub.id] ?? 100;
                          return (
                            <TableCell key={sub.id} className="p-1">
                              <div
                                className="flex items-center gap-0.5"
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  toggleAbsent(s.id, sub.id);
                                }}
                              >
                                {cell.is_absent ? (
                                  <span className="text-destructive font-medium text-sm" title={isEditMode ? "Absent (right-click to toggle)" : "Absent"}>A</span>
                                ) : isGradeBased ? (
                                  <Select
                                    value={cell.grade || "_"}
                                    onValueChange={(v) => setCell(s.id, sub.id, { grade: v === "_" ? "" : v })}
                                    disabled={!isEditMode}
                                  >
                                    <SelectTrigger className="w-[72px] h-8 text-sm">
                                      <SelectValue placeholder="Grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="_">—</SelectItem>
                                      {GRADE_OPTIONS.map((g) => (
                                        <SelectItem key={g} value={g}>
                                          {g}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <>
                                    <Input
                                      type="number"
                                      step={1}
                                      min={0}
                                      max={maxMarks}
                                      className="w-14 h-8 text-center text-sm disabled:opacity-100 disabled:bg-muted/50"
                                      value={cell.score}
                                      onChange={(e) => setCell(s.id, sub.id, { score: e.target.value })}
                                      onKeyDown={(ev) => handleKeyDown(ev, s.id, sub.id)}
                                      placeholder="—"
                                      disabled={!isEditMode}
                                    />
                                    <span className="text-muted-foreground text-xs">/ {maxMarks}</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-start mt-4">
                <SubmitButton 
                  loading={saving} 
                  loadingLabel="Saving…" 
                  className="min-w-[140px] shadow-sm font-semibold text-sm h-10"
                  disabled={!isEditMode}
                >
                  Save Marks
                </SubmitButton>
              </div>
            </>
          )}

          {selectedExamId && students.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              No students match this standard/division. Adjust filters or add students.
            </p>
          )}

          {selectedExamId && subjects.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              {effectiveStandard
                ? "No subjects for this standard. Add subjects in Standard management → Subject management."
                : "Select a standard to load subjects."}
            </p>
          )}

          {!selectedExamId && (
            <p className="text-sm text-muted-foreground">Select an exam above to load students and enter marks.</p>
          )}
        </form>
      </CardContent>

      {/* Full-screen blocking loader */}
      {saving && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-4 bg-card p-8 rounded-xl shadow-2xl border">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <h3 className="text-lg font-semibold text-foreground">Saving marks...</h3>
            <p className="text-sm text-muted-foreground">Please wait, do not close the application.</p>
          </div>
        </div>
      )}
    </Card>
  );
}
