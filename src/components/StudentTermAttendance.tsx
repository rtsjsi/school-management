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

type Student = {
  id: string;
  full_name: string;
  standard: string | null;
  division: string | null;
  roll_number: number | null;
};

type AllowedClassNames = { standardName: string; divisionName: string }[];

const TERMS = ["Term-1", "Term-2"] as const;

function parseDayCount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  return Number(trimmed);
}

export default function StudentTermAttendance({
  allowedClassNames,
}: {
  allowedClassNames?: AllowedClassNames;
} = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const allowedPairSet = useMemo(() => {
    if (!allowedClassNames?.length) return null;
    return new Set(allowedClassNames.map((p) => `${p.standardName}\0${p.divisionName}`));
  }, [allowedClassNames]);

  const [academicYear, setAcademicYear] = useState<{ id: string; name: string } | null>(null);
  const [yearChecked, setYearChecked] = useState(false);
  const [classList, setClassList] = useState<{ standardName: string; divisionName: string }[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [workingDays, setWorkingDays] = useState("");
  const [presentByStudent, setPresentByStudent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [effectiveStandard, effectiveDivision] = classFilter ? classFilter.split("\0") : [null, null];
  const workingDaysNumber = parseDayCount(workingDays);
  const filtersReady = Boolean(academicYear && classFilter && termFilter);

  useEffect(() => {
    (async () => {
      const { data: ay } = await supabase
        .from("academic_years")
        .select("id, name")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      setAcademicYear(ay ?? null);
      setYearChecked(true);
    })();

    if (allowedClassNames?.length) {
      setClassList(allowedClassNames);
      return;
    }

    supabase
      .from("students")
      .select("standard, division")
      .eq("status", "active")
      .then(({ data }) => {
        const unique = new Map<string, { standardName: string; divisionName: string }>();
        (data ?? []).forEach((row) => {
          if (row.standard && row.division) {
            unique.set(`${row.standard}\0${row.division}`, {
              standardName: row.standard,
              divisionName: row.division,
            });
          }
        });
        setClassList(
          Array.from(unique.values()).sort(
            (a, b) =>
              a.standardName.localeCompare(b.standardName) || a.divisionName.localeCompare(b.divisionName)
          )
        );
      });
  }, [supabase, allowedClassNames]);

  const loadAttendance = useCallback(() => {
    if (!academicYear || !effectiveStandard || !effectiveDivision || !termFilter) return;
    setLoading(true);
    setError(null);
    (async () => {
      const { data: st, error: studentError } = await supabase
        .from("students")
        .select("id, full_name, standard, division, roll_number")
        .eq("status", "active")
        .eq("standard", effectiveStandard)
        .eq("division", effectiveDivision)
        .order("full_name");
      if (studentError) throw studentError;

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

      const present: Record<string, string> = {};
      studentList.forEach((s) => {
        present[s.id] = "";
      });

      if (studentList.length === 0) {
        setPresentByStudent(present);
        setWorkingDays("");
        setIsDirty(false);
        setIsEditMode(true);
        return;
      }

      const { data: rows, error: attendanceError } = await supabase
        .from("student_term_attendance")
        .select("student_id, working_days, present_days")
        .eq("academic_year_id", academicYear.id)
        .eq("term", termFilter)
        .in(
          "student_id",
          studentList.map((s) => s.id)
        );
      if (attendanceError) throw attendanceError;

      const saved = rows ?? [];
      const workingValues = Array.from(
        new Set(saved.map((r) => r.working_days).filter((d): d is number => d != null))
      );
      setWorkingDays(workingValues.length === 1 ? String(workingValues[0]) : "");
      saved.forEach((r) => {
        if (present[r.student_id] !== undefined) {
          present[r.student_id] = r.present_days != null ? String(r.present_days) : "";
        }
      });
      setPresentByStudent(present);
      setIsDirty(false);
      setIsEditMode(saved.length === 0);
    })()
      .catch((e) => {
        setStudents([]);
        setError(e instanceof Error ? e.message : "Could not load attendance.");
      })
      .finally(() => setLoading(false));
  }, [supabase, academicYear, effectiveStandard, effectiveDivision, termFilter, allowedPairSet]);

  useEffect(() => {
    if (!filtersReady) {
      setStudents([]);
      setPresentByStudent({});
      setWorkingDays("");
      setIsDirty(false);
      setIsEditMode(false);
      return;
    }
    loadAttendance();
  }, [filtersReady, loadAttendance]);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

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
        if (button.getAttribute("data-state") !== "active") {
          if (!window.confirm("You have unsaved attendance. Are you sure you want to switch tabs and lose your changes?")) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      } else if (a && e.type === "click" && a.href && a.target !== "_blank") {
        if (a.href.startsWith(window.location.origin) && a.pathname !== window.location.pathname) {
          if (!window.confirm("You have unsaved attendance. Are you sure you want to leave this page and lose your changes?")) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    document.addEventListener("click", handleInteraction, { capture: true });
    document.addEventListener("mousedown", handleInteraction, { capture: true });
    document.addEventListener("keydown", handleInteraction, { capture: true });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleInteraction, { capture: true });
      document.removeEventListener("mousedown", handleInteraction, { capture: true });
      document.removeEventListener("keydown", handleInteraction, { capture: true });
    };
  }, [isDirty]);

  const confirmDiscard = (message: string) => {
    if (!isDirty) return true;
    return window.confirm(message);
  };

  const handleClassFilterChange = (val: string) => {
    if (!confirmDiscard("You have unsaved attendance. Are you sure you want to change class and lose it?")) return;
    setIsDirty(false);
    setClassFilter(val);
  };

  const handleTermFilterChange = (val: string) => {
    if (!confirmDiscard("You have unsaved attendance. Are you sure you want to change term and lose it?")) return;
    setIsDirty(false);
    setTermFilter(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicYear || !termFilter) {
      setError("Select a class and term first.");
      return;
    }
    if (workingDaysNumber == null || Number.isNaN(workingDaysNumber)) {
      setError("Enter working days for this class and term.");
      return;
    }

    const rows: {
      student_id: string;
      academic_year_id: string;
      term: string;
      working_days: number;
      present_days: number | null;
      updated_at: string;
    }[] = [];

    for (const student of students) {
      const present = parseDayCount(presentByStudent[student.id] ?? "");
      if (Number.isNaN(present)) {
        setError(`Days present for ${student.full_name} must be a whole number.`);
        return;
      }
      if (present != null && present > workingDaysNumber) {
        setError(`Days present for ${student.full_name} cannot be more than working days (${workingDaysNumber}).`);
        return;
      }
      rows.push({
        student_id: student.id,
        academic_year_id: academicYear.id,
        term: termFilter,
        working_days: workingDaysNumber,
        present_days: present,
        updated_at: new Date().toISOString(),
      });
    }

    setSaving(true);
    setError(null);
    try {
      if (rows.length > 0) {
        const { error: upsertError } = await supabase.from("student_term_attendance").upsert(rows, {
          onConflict: "student_id,academic_year_id,term",
        });
        if (upsertError) throw upsertError;
      }
      setIsDirty(false);
      setIsEditMode(false);
      toast({
        title: "Attendance saved",
        description: `${termFilter} attendance for ${effectiveStandard} / ${effectiveDivision} has been recorded.`,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

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

          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Academic year</Label>
              <p className="h-10 flex items-center text-sm font-medium min-w-[120px]">
                {academicYear?.name ?? (yearChecked ? "No active year" : "Loading…")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={classFilter} onValueChange={handleClassFilterChange} disabled={!academicYear}>
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
              <Select value={termFilter} onValueChange={handleTermFilterChange} disabled={!academicYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="working-days">Working days *</Label>
              <Input
                id="working-days"
                type="number"
                min={0}
                step={1}
                className="w-[120px] h-10 disabled:opacity-100 disabled:bg-muted/50"
                value={workingDays}
                onChange={(e) => {
                  setIsDirty(true);
                  setWorkingDays(e.target.value);
                }}
                placeholder="—"
                disabled={!filtersReady || !isEditMode || students.length === 0}
              />
            </div>
            <div className="flex-1" />
            {filtersReady && students.length > 0 && !loading && !isEditMode && (
              <Button
                type="button"
                onClick={() => setIsEditMode(true)}
                className="shadow-sm font-semibold text-sm h-10"
              >
                Edit Attendance
              </Button>
            )}
          </div>

          {yearChecked && !academicYear && (
            <p className="text-sm text-muted-foreground">
              Set an academic year to active before recording term attendance.
            </p>
          )}

          {loading && <p className="text-sm text-muted-foreground">Loading students and saved attendance…</p>}

          {filtersReady && students.length > 0 && !loading && (
            <>
              <p className="text-sm text-muted-foreground">
                Working days apply to the whole class for this term. Enter days present for each student. Days absent
                are working days minus days present.
              </p>
              <div className="overflow-x-auto border rounded-md" style={{ maxHeight: 440 }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[80px] w-[80px] bg-muted/80">Roll No</TableHead>
                      <TableHead className="min-w-[180px] bg-muted/80">Student</TableHead>
                      <TableHead className="text-center min-w-[120px] bg-muted/50">Days present</TableHead>
                      <TableHead className="text-center min-w-[120px] bg-muted/50">Days absent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => {
                      const presentRaw = presentByStudent[s.id] ?? "";
                      const present = parseDayCount(presentRaw);
                      const absent =
                        workingDaysNumber != null &&
                        !Number.isNaN(workingDaysNumber) &&
                        present != null &&
                        !Number.isNaN(present) &&
                        present <= workingDaysNumber
                          ? workingDaysNumber - present
                          : null;
                      const overLimit =
                        workingDaysNumber != null &&
                        !Number.isNaN(workingDaysNumber) &&
                        present != null &&
                        !Number.isNaN(present) &&
                        present > workingDaysNumber;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-sm text-center">{s.roll_number ?? "—"}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap" title={s.full_name}>
                            {s.full_name}
                          </TableCell>
                          <TableCell className="p-1 text-center">
                            <Input
                              type="number"
                              min={0}
                              max={
                                workingDaysNumber != null && !Number.isNaN(workingDaysNumber)
                                  ? workingDaysNumber
                                  : undefined
                              }
                              step={1}
                              className={`w-20 h-8 mx-auto text-center text-sm disabled:opacity-100 disabled:bg-muted/50 ${
                                overLimit ? "border-destructive" : ""
                              }`}
                              value={presentRaw}
                              onChange={(e) => {
                                setIsDirty(true);
                                setPresentByStudent((prev) => ({ ...prev, [s.id]: e.target.value }));
                              }}
                              placeholder="—"
                              disabled={!isEditMode}
                              aria-label={`Days present for ${s.full_name}`}
                            />
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {absent == null ? "—" : absent}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-start mt-4">
                <SubmitButton
                  loading={saving}
                  loadingLabel="Saving…"
                  className="min-w-[160px] shadow-sm font-semibold text-sm h-10"
                  disabled={!isEditMode}
                >
                  Save Attendance
                </SubmitButton>
              </div>
            </>
          )}

          {filtersReady && students.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              No active students in this class. Adjust the class or add students.
            </p>
          )}

          {academicYear && !filtersReady && (
            <p className="text-sm text-muted-foreground">Select a class and term to enter attendance.</p>
          )}
        </form>
      </CardContent>

      {saving && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-4 bg-card p-8 rounded-xl shadow-2xl border">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <h3 className="text-lg font-semibold text-foreground">Saving attendance...</h3>
            <p className="text-sm text-muted-foreground">Please wait, do not close the application.</p>
          </div>
        </div>
      )}
    </Card>
  );
}
