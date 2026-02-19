"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateFeeStructure } from "@/app/dashboard/fees/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { AcademicYearSelect } from "@/components/AcademicYearSelect";
import { Button } from "@/components/ui/button";

const FEE_TYPES = ["tuition"] as const; // Education fees only

type FeeStructureFormProps = {
  structureId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function FeeStructureForm({ structureId, onSuccess, onCancel }: FeeStructureFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!structureId);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    grade_from: "",
    grade_to: "",
    academic_year: "",
  });
  const [quarterAmounts, setQuarterAmounts] = useState<Record<string, Record<number, string>>>({});
  const [classes, setClasses] = useState<{ id: string; name: string; sort_order: number }[]>([]);

  useEffect(() => {
    createClient().from("classes").select("id, name, sort_order").order("sort_order").then(({ data }) => setClasses(data ?? []));
  }, []);

  useEffect(() => {
    if (!structureId) return;
    const load = async () => {
      setLoadingData(true);
      const supabase = createClient();
      const { data: structure, error: structErr } = await supabase
        .from("fee_structures")
        .select("id, name, grade_from, grade_to, academic_year")
        .eq("id", structureId)
        .single();
      if (structErr || !structure) {
        setError(structErr?.message ?? "Structure not found");
        setLoadingData(false);
        return;
      }
      const { data: items } = await supabase
        .from("fee_structure_items")
        .select("fee_type, quarter, amount")
        .eq("fee_structure_id", structureId);
      setForm({
        name: structure.name,
        grade_from: structure.grade_from,
        grade_to: structure.grade_to,
        academic_year: structure.academic_year,
      });
      const amounts: Record<string, Record<number, string>> = {};
      for (const item of items ?? []) {
        if (!amounts[item.fee_type]) amounts[item.fee_type] = {};
        amounts[item.fee_type][item.quarter] = String(item.amount);
      }
      setQuarterAmounts(amounts);
      setLoadingData(false);
    };
    load();
  }, [structureId]);

  const handleQuarterChange = (feeType: string, quarter: number, value: string) => {
    setQuarterAmounts((prev) => ({
      ...prev,
      [feeType]: {
        ...(prev[feeType] || {}),
        [quarter]: value,
      },
    }));
  };

  const getAmount = (feeType: string, quarter: number) => quarterAmounts[feeType]?.[quarter] ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.grade_from.trim() || !form.grade_to.trim() || !form.academic_year.trim()) {
      setError("Name, grade range, and academic year are required.");
      return;
    }

    const items: { fee_type: string; quarter: number; amount: number }[] = [];
    for (const feeType of FEE_TYPES) {
      for (let q = 1; q <= 4; q++) {
        const val = getAmount(feeType, q);
        if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0) {
          items.push({ fee_type: feeType, quarter: q, amount: parseFloat(val) });
        }
      }
    }

    setLoading(true);
    try {
      if (structureId) {
        const result = await updateFeeStructure(structureId, {
          name: form.name.trim(),
          grade_from: form.grade_from.trim(),
          grade_to: form.grade_to.trim(),
          academic_year: form.academic_year.trim(),
          items,
        });
        if (result.ok) {
          onSuccess?.();
          router.refresh();
        } else {
          setError(result.error);
        }
        return;
      }

      const supabase = createClient();
      const { data: structure, error: structErr } = await supabase
        .from("fee_structures")
        .insert({
          name: form.name.trim(),
          grade_from: form.grade_from.trim(),
          grade_to: form.grade_to.trim(),
          academic_year: form.academic_year.trim(),
        })
        .select("id")
        .single();

      if (structErr || !structure) {
        setError(structErr?.message ?? "Failed to create structure");
        return;
      }

      const insertItems = items.map((i) => ({
        fee_structure_id: structure.id,
        fee_type: i.fee_type,
        quarter: i.quarter,
        amount: i.amount,
      }));

      if (insertItems.length > 0) {
        const { error: itemsErr } = await supabase.from("fee_structure_items").insert(insertItems);
        if (itemsErr) {
          setError(itemsErr.message);
          return;
        }
      }

      setForm({ name: "", grade_from: "", grade_to: "", academic_year: "" });
      setQuarterAmounts({});
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!structureId;

  if (loadingData) {
    return (
      <div className="py-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Structure Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Primary (1-6)"
                required
              />
            </div>
            <AcademicYearSelect
              value={form.academic_year}
              onChange={(v) => setForm((p) => ({ ...p, academic_year: v }))}
              id="academic_year"
              label="Academic Year *"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade_from">Grade From *</Label>
              {classes.length > 0 ? (
                <Select value={form.grade_from} onValueChange={(v) => setForm((p) => ({ ...p, grade_from: v }))} required>
                  <SelectTrigger id="grade_from"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="grade_from"
                  value={form.grade_from}
                  onChange={(e) => setForm((p) => ({ ...p, grade_from: e.target.value }))}
                  placeholder="e.g. 1"
                  required
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade_to">Grade To *</Label>
              {classes.length > 0 ? (
                <Select value={form.grade_to} onValueChange={(v) => setForm((p) => ({ ...p, grade_to: v }))} required>
                  <SelectTrigger id="grade_to"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="grade_to"
                  value={form.grade_to}
                  onChange={(e) => setForm((p) => ({ ...p, grade_to: e.target.value }))}
                  placeholder="e.g. 6"
                  required
                />
              )}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">Quarter-wise Amounts (per fee type)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Fee Type</th>
                    <th className="text-left py-2 px-2">Q1</th>
                    <th className="text-left py-2 px-2">Q2</th>
                    <th className="text-left py-2 px-2">Q3</th>
                    <th className="text-left py-2 px-2">Q4</th>
                  </tr>
                </thead>
                <tbody>
                  {FEE_TYPES.map((ft) => (
                    <tr key={ft} className="border-b">
                      <td className="py-2 pr-4 capitalize">{ft}</td>
                      {[1, 2, 3, 4].map((q) => (
                        <td key={q} className="py-1 px-2">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0"
                            className="h-8 w-20"
                            value={getAmount(ft, q)}
                            onChange={(e) => handleQuarterChange(ft, q, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
            <SubmitButton
              loading={loading}
              loadingLabel={structureId ? "Saving…" : "Adding…"}
              className={onCancel ? "" : "w-full"}
            >
              {structureId ? "Update Fee Structure" : "Add Fee Structure"}
            </SubmitButton>
          </div>
        </form>
  );

  if (isEdit) {
    return <div>{formContent}</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {formContent}
      </CardContent>
    </Card>
  );
}
