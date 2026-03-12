"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getPromotionCandidates, runPromotion, type EnrollmentOutcome } from "@/app/dashboard/promotion/actions";

export function PromotionRunner() {
  const router = useRouter();
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);
  const [standards, setStandards] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string; standard_id: string }[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [outcomes, setOutcomes] = useState<EnrollmentOutcome[]>([]);
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set());
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [{ data: yearData }, { data: standardData }, { data: divisionData }] = await Promise.all([
        supabase.from("academic_years").select("id, name, status").order("sort_order"),
        supabase.from("standards").select("id, name").order("sort_order"),
        supabase.from("divisions").select("id, name, standard_id").order("standard_id").order("sort_order"),
      ]);

      const list = (yearData ?? []) as { id: string; name: string; status?: string | null }[];
      const activeOnly = list.filter((y) => y.status === "active");
      setYears(activeOnly.length > 0 ? activeOnly : []);
      if (activeOnly.length === 1) {
        setSelectedYearId(activeOnly[0].id);
      }

      setStandards((standardData ?? []) as { id: string; name: string }[]);
      setDivisions((divisionData ?? []) as { id: string; name: string; standard_id: string }[]);
    }

    load();
  }, []);

  const handleLoad = async () => {
    if (!selectedYearId || !selectedGrade || !selectedDivision) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getPromotionCandidates(selectedYearId);
      const filteredBase = list.filter(
        (o) => o.gradeName === selectedGrade && o.divisionName === selectedDivision
      );

      const enhanced: EnrollmentOutcome[] = filteredBase.map((o) => {
        if (!o.nextGradeId) return o;
        const nextDivs = divisions.filter((d) => d.standard_id === o.nextGradeId);
        if (!nextDivs.length) return o;

        // Prefer same division name if it exists in next standard, else first division
        const sameName = nextDivs.find((d) => d.name === o.divisionName) ?? nextDivs[0];
        return {
          ...o,
          nextDivisionId: sameName.id,
          nextDivisionName: sameName.name,
        };
      });

      setOutcomes(enhanced);
      setSelectedEnrollmentIds(new Set(enhanced.map((o) => o.enrollmentId)));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const gradeOptions = useMemo(() => standards.map((s) => s.name), [standards]);

  const divisionOptions = useMemo(() => {
    if (!selectedGrade) return [];
    const std = standards.find((s) => s.name === selectedGrade);
    if (!std) return [];
    return divisions
      .filter((d) => d.standard_id === std.id)
      .map((d) => d.name)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b));
  }, [divisions, standards, selectedGrade]);

  const filteredOutcomes = useMemo(
    () =>
      outcomes.filter(
        (o) =>
          (!selectedGrade || o.gradeName === selectedGrade) &&
          (!selectedDivision || o.divisionName === selectedDivision)
      ),
    [outcomes, selectedGrade, selectedDivision]
  );

  const handleRun = async () => {
    if (!selectedYearId || !selectedGrade || !selectedDivision || selectedEnrollmentIds.size === 0) return;
    const selected = outcomes.filter((o) => selectedEnrollmentIds.has(o.enrollmentId));
    if (selected.length === 0) return;
    setRunning(true);
    setError(null);
    try {
      const result = await runPromotion(selectedYearId, selected);
      if (result.ok) {
        router.refresh();
        setOutcomes([]);
        setSelectedEnrollmentIds(new Set());
        setSelectedYearId("");
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Academic year to close</Label>
          <Select
            value={selectedYearId}
            onValueChange={(v) => {
              setSelectedYearId(v);
              setOutcomes([]);
              setSelectedEnrollmentIds(new Set());
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Standard *</Label>
          <Select
            value={selectedGrade}
            onValueChange={(v) => {
              setSelectedGrade(v);
              setSelectedDivision("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select standard to promote" />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Division *</Label>
          <Select
            value={selectedDivision}
            onValueChange={setSelectedDivision}
            disabled={!selectedGrade}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedGrade ? "Select division" : "Select standard first"} />
            </SelectTrigger>
            <SelectContent>
              {divisionOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleLoad}
          disabled={!selectedYearId || !selectedGrade || !selectedDivision || loading}
        >
          {loading ? "Loading…" : "Load enrollments"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
      {filteredOutcomes.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Students available for promotion</h3>
              <div className="flex gap-2 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setSelectedEnrollmentIds(new Set(filteredOutcomes.map((o) => o.enrollmentId)))
                  }
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedEnrollmentIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="rounded-md border max-h-[380px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-8 p-2"></th>
                    <th className="text-left p-2">Student</th>
                    <th className="text-left p-2">Current standard</th>
                    <th className="text-left p-2">Current division</th>
                    <th className="text-left p-2">Next standard</th>
                    <th className="text-left p-2">Next division</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOutcomes.map((o) => {
                    const nextDivisions =
                      o.nextGradeId && divisions.length
                        ? divisions.filter((d) => d.standard_id === o.nextGradeId)
                        : [];
                    return (
                      <tr key={o.enrollmentId} className="border-b">
                        <td className="p-2">
                          <Checkbox
                            checked={selectedEnrollmentIds.has(o.enrollmentId)}
                            onCheckedChange={(checked) =>
                              setSelectedEnrollmentIds((prev) => {
                                const next = new Set(prev);
                                if (checked) {
                                  next.add(o.enrollmentId);
                                } else {
                                  next.delete(o.enrollmentId);
                                }
                                return next;
                              })
                            }
                          />
                        </td>
                        <td className="p-2">{o.studentName}</td>
                        <td className="p-2">{o.gradeName}</td>
                        <td className="p-2">{o.divisionName}</td>
                        <td className="p-2">{o.nextGradeName ?? "—"}</td>
                        <td className="p-2">
                          {o.nextGradeId && nextDivisions.length > 0 ? (
                            <Select
                              value={o.nextDivisionId ?? undefined}
                              onValueChange={(val) =>
                                setOutcomes((prev) =>
                                  prev.map((row) =>
                                    row.enrollmentId === o.enrollmentId
                                      ? {
                                          ...row,
                                          nextDivisionId: val,
                                          nextDivisionName:
                                            nextDivisions.find((d) => d.id === val)?.name ?? row.nextDivisionName,
                                        }
                                      : row
                                  )
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue placeholder="Select division" />
                              </SelectTrigger>
                              <SelectContent>
                                {nextDivisions.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Button onClick={handleRun} disabled={running || selectedEnrollmentIds.size === 0}>
            {running ? "Running…" : "Run promotion (close year & create next enrollments)"}
          </Button>
        </div>
      )}
    </div>
  );
}
