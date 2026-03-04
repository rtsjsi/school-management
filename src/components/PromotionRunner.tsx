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
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [outcomes, setOutcomes] = useState<EnrollmentOutcome[]>([]);
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set());
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("academic_years").select("id, name").order("sort_order").then(({ data }) => setYears(data ?? []));
  }, []);

  const handleLoad = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getPromotionCandidates(selectedYearId);
      setOutcomes(list);
      setSelectedEnrollmentIds(new Set(list.map((o) => o.enrollmentId)));
      setSelectedGrade("all");
      setSelectedDivision("all");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const gradeOptions = useMemo(
    () => Array.from(new Set(outcomes.map((o) => o.gradeName))).sort((a, b) => a.localeCompare(b)),
    [outcomes]
  );

  const divisionOptions = useMemo(() => {
    const filtered = selectedGrade === "all" ? outcomes : outcomes.filter((o) => o.gradeName === selectedGrade);
    return Array.from(new Set(filtered.map((o) => o.divisionName))).sort((a, b) => a.localeCompare(b));
  }, [outcomes, selectedGrade]);

  const filteredOutcomes = useMemo(
    () =>
      outcomes.filter(
        (o) =>
          (selectedGrade === "all" || o.gradeName === selectedGrade) &&
          (selectedDivision === "all" || o.divisionName === selectedDivision)
      ),
    [outcomes, selectedGrade, selectedDivision]
  );

  const handleRun = async () => {
    if (!selectedYearId || selectedEnrollmentIds.size === 0) return;
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
        setSelectedGrade("all");
        setSelectedDivision("all");
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
          <Label>Standard (optional)</Label>
          <Select
            value={selectedGrade}
            onValueChange={(v) => {
              setSelectedGrade(v);
              setSelectedDivision("all");
            }}
            disabled={!outcomes.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="All standards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {gradeOptions.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Division (optional)</Label>
          <Select
            value={selectedDivision}
            onValueChange={setSelectedDivision}
            disabled={!outcomes.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="All divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
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
        <Button onClick={handleLoad} disabled={!selectedYearId || loading}>
          {loading ? "Loading…" : "Load enrollments"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
      {filteredOutcomes.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
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
                    <th className="text-left p-2">Grade</th>
                    <th className="text-left p-2">Division</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOutcomes.map((o) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2">Student</th>
                    <th className="text-left p-2">Current grade</th>
                    <th className="text-left p-2">Next grade</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes
                    .filter((o) => selectedEnrollmentIds.has(o.enrollmentId))
                    .map((o) => (
                      <tr key={o.enrollmentId} className="border-b">
                        <td className="p-2">{o.studentName}</td>
                        <td className="p-2">{o.gradeName}</td>
                        <td className="p-2">{o.nextGradeName ?? "—"}</td>
                        <td className="p-2 capitalize">{o.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Button onClick={handleRun} disabled={running || selectedEnrollmentIds.size === 0}>
              {running ? "Running…" : "Run promotion (close year & create next enrollments)"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
