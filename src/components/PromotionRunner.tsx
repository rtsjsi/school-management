"use client";

import { useState, useEffect } from "react";
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
import {
  getEnrollmentsForYear,
  computeOutcomesFromExam,
  runPromotion,
  type EnrollmentOutcome,
} from "@/app/dashboard/promotion/actions";

export function PromotionRunner() {
  const router = useRouter();
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);
  const [exams, setExams] = useState<{ id: string; name: string; academic_year_id: string | null }[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [outcomes, setOutcomes] = useState<EnrollmentOutcome[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("academic_years").select("id, name").order("sort_order").then(({ data }) => setYears(data ?? []));
    supabase.from("exams").select("id, name, academic_year_id").then(({ data }) => setExams(data ?? []));
  }, []);

  const yearExams = selectedYearId ? exams.filter((e) => e.academic_year_id === selectedYearId) : [];

  const handleLoad = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getEnrollmentsForYear(selectedYearId);
      setOutcomes(list);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewFromExam = async () => {
    if (!selectedYearId || !selectedExamId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await computeOutcomesFromExam(selectedYearId, selectedExamId);
      setOutcomes(list);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    if (!selectedYearId || outcomes.length === 0) return;
    setRunning(true);
    setError(null);
    try {
      const result = await runPromotion(selectedYearId, outcomes);
      if (result.ok) {
        router.refresh();
        setOutcomes([]);
        setSelectedYearId("");
        setSelectedExamId("");
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Academic year to close</Label>
          <Select value={selectedYearId} onValueChange={(v) => { setSelectedYearId(v); setOutcomes([]); }}>
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
          <Label>Promotion exam (optional)</Label>
          <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={!selectedYearId}>
            <SelectTrigger>
              <SelectValue placeholder="Select exam for pass/fail" />
            </SelectTrigger>
            <SelectContent>
              {yearExams.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
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
        {selectedExamId && (
          <Button variant="secondary" onClick={handlePreviewFromExam} disabled={loading}>
            Preview from exam
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
      {outcomes.length > 0 && (
        <>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2">Student</th>
                  <th className="text-left p-2">Grade</th>
                  <th className="text-left p-2">Division</th>
                  <th className="text-left p-2">Result</th>
                  <th className="text-left p-2">Next grade</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((o) => (
                  <tr key={o.enrollmentId} className="border-b">
                    <td className="p-2">{o.studentName}</td>
                    <td className="p-2">{o.gradeName}</td>
                    <td className="p-2">{o.divisionName}</td>
                    <td className="p-2">{o.status}</td>
                    <td className="p-2">{o.nextGradeName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={handleRun} disabled={running}>
            {running ? "Running…" : "Run promotion (close year & create next enrollments)"}
          </Button>
        </>
      )}
    </div>
  );
}
