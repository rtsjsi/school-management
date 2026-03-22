"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AcademicYear = { id: string; name: string; status?: string | null };
type ExpenseHead = { id: string; name: string };

export function ExpenseBudgetsManager() {
  const supabase = useMemo(() => createClient(), []);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [heads, setHeads] = useState<ExpenseHead[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: yearsData }, { data: headsData }] = await Promise.all([
          supabase.from("academic_years").select("id, name, status").order("sort_order"),
          supabase.from("expense_heads").select("id, name").order("sort_order"),
        ]);
        const ys = (yearsData ?? []) as AcademicYear[];
        const hs = (headsData ?? []) as ExpenseHead[];
        setYears(ys);
        setHeads(hs);
        const active = ys.find((y) => y.status === "active") ?? ys[0];
        if (active?.id) setSelectedYearId(active.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load years and heads.");
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    if (!selectedYearId) return;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error: err } = await supabase
        .from("expense_budgets")
        .select("expense_head_id, amount")
        .eq("academic_year_id", selectedYearId);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        const headId = (row as { expense_head_id: string }).expense_head_id;
        const amt = (row as { amount: number }).amount;
        map[headId] = amt != null ? String(amt) : "";
      }
      setBudgets(map);
      setLoading(false);
    })();
  }, [selectedYearId, supabase]);

  const handleChange = (headId: string, value: string) => {
    setBudgets((prev) => ({ ...prev, [headId]: value }));
  };

  const handleSave = async () => {
    if (!selectedYearId) return;
    setSaving(true);
    setError(null);
    try {
      // Replace all budgets for this year to keep logic simple.
      const { error: delErr } = await supabase.from("expense_budgets").delete().eq("academic_year_id", selectedYearId);
      if (delErr) {
        setError(delErr.message);
        setSaving(false);
        return;
      }

      const rows: { expense_head_id: string; academic_year_id: string; amount: number }[] = [];
      for (const head of heads) {
        const raw = budgets[head.id]?.trim();
        if (!raw) continue;
        const amt = parseFloat(raw);
        if (Number.isNaN(amt) || amt < 0) {
          setError(`Invalid budget for "${head.name}".`);
          setSaving(false);
          return;
        }
        rows.push({
          expense_head_id: head.id,
          academic_year_id: selectedYearId,
          amount: amt,
        });
      }

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("expense_budgets").insert(rows);
        if (insErr) {
          setError(insErr.message);
          setSaving(false);
          return;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save budgets.");
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  if (years.length === 0 || heads.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : "Add academic years and expense heads to configure budgets."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="space-y-1">
            <Label htmlFor="budget-year">Academic Year</Label>
            <Select
              value={selectedYearId ?? ""}
              onValueChange={(v) => setSelectedYearId(v)}
            >
              <SelectTrigger id="budget-year" className="w-40">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
                      {y.status === "active" ? " (Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={handleSave} disabled={saving || loading || !selectedYearId}>
            {saving ? "Saving…" : "Save Budgets"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
        )}

        <div className="grid gap-3">
          {heads.map((h) => (
            <div key={h.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{h.name}</p>
              </div>
              <div className="w-32">
                <Label className="text-xs text-muted-foreground">Budget</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgets[h.id] ?? ""}
                  onChange={(e) => handleChange(h.id, e.target.value)}
                  placeholder="0.00"
                  className="h-8"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

