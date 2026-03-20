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
import { getFeeTypeLabel } from "@/lib/utils";

const FEE_TYPE_OPTIONS = ["education_fee"] as const;

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
    standard: "",
    academic_year: "",
    total_fees: "",
  });
  const [quarterAmounts, setQuarterAmounts] = useState<Record<string, Record<number, string>>>({});
  const [classes, setClasses] = useState<{ id: string; name: string; sort_order: number }[]>([]);
  const [rowFeeTypes, setRowFeeTypes] = useState<string[]>(Array.from(FEE_TYPE_OPTIONS)); // selected per row
  const feeTypes = Array.from(FEE_TYPE_OPTIONS); // available options

  useEffect(() => {
    createClient().from("standards").select("id, name, sort_order").order("sort_order").then(({ data }) => setClasses(data ?? []));
  }, []);

  useEffect(() => {
    if (!structureId) return;
    const load = async () => {
      setLoadingData(true);
      const supabase = createClient();
      const { data: structure, error: structErr } = await supabase
        .from("fee_structures")
        .select("id, standard_id, academic_year, total_fees")
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
      const tf = (structure as { total_fees?: number | string | null }).total_fees;
      setForm({
        standard: structure.standard_id,
        academic_year: structure.academic_year,
        total_fees:
          tf != null && tf !== ""
            ? String(typeof tf === "number" ? tf : Number.parseFloat(String(tf)))
            : "",
      });
      const amounts: Record<string, Record<number, string>> = {};
      const usedFeeTypes = new Set<string>();
      for (const item of items ?? []) {
        if (!amounts[item.fee_type]) amounts[item.fee_type] = {};
        amounts[item.fee_type][item.quarter] = String(item.amount);
        usedFeeTypes.add(item.fee_type);
      }
      setQuarterAmounts(amounts);
      if (usedFeeTypes.size > 0) {
        setRowFeeTypes(Array.from(usedFeeTypes));
      }
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

  function parseTotalFeesInput(): number | null {
    const t = form.total_fees.trim();
    if (!t) return null;
    const n = Number.parseFloat(t);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }

  const handleRowFeeTypeChange = (index: number, newType: string) => {
    setRowFeeTypes((prev) => {
      const oldType = prev[index];
      if (!oldType || oldType === newType) return prev;
      // Prevent duplicate fee types in rows
      if (prev.includes(newType)) return prev;
      const next = [...prev];
      next[index] = newType;
      // Move any entered amounts from old key to new key
      setQuarterAmounts((prevAmounts) => {
        const copy = { ...prevAmounts };
        if (copy[oldType]) {
          copy[newType] = copy[oldType];
        }
        delete copy[oldType];
        return copy;
      });
      return next;
    });
  };

  const handleAddRow = () => {
    const remaining = feeTypes.filter((ft) => !rowFeeTypes.includes(ft));
    if (remaining.length === 0) return;
    setRowFeeTypes((prev) => [...prev, remaining[0]]);
  };

  const handleRemoveRow = (index: number) => {
    setRowFeeTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.standard.trim() || !form.academic_year.trim()) {
      setError("Standard and academic year are required.");
      return;
    }

    const items: { fee_type: string; quarter: number; amount: number }[] = [];
    for (const feeType of rowFeeTypes) {
      for (let q = 1; q <= 4; q++) {
        const val = getAmount(feeType, q);
        if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0) {
          items.push({ fee_type: feeType, quarter: q, amount: parseFloat(val) });
        }
      }
    }

    const totalFeesValue = parseTotalFeesInput();
    if (form.total_fees.trim() !== "" && totalFeesValue === null) {
      setError("Total fees must be a valid number, or leave blank.");
      return;
    }

    setLoading(true);
    try {
      const standardId = form.standard.trim();
      if (structureId) {
        const result = await updateFeeStructure(structureId, {
          standardId,
          academic_year: form.academic_year.trim(),
          total_fees: totalFeesValue,
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
          standard_id: standardId,
          academic_year: form.academic_year.trim(),
          total_fees: totalFeesValue,
        })
        .select("id")
        .single();

      if (structErr || !structure) {
        const message =
          (structErr as { code?: string; message?: string } | null)?.code === "23505"
            ? "A fee structure already exists for this Standard and Academic Year. Please edit the existing structure instead of creating another."
            : structErr?.message ?? "Failed to create structure";
        setError(message);
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

      setForm({ standard: "", academic_year: "", total_fees: "" });
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="standard">Standard *</Label>
              {classes.length > 0 ? (
                <Select
                  value={form.standard}
                  onValueChange={(v) => setForm((p) => ({ ...p, standard: v }))}
                  required
                >
                  <SelectTrigger id="standard">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="standard"
                  value={form.standard}
                  onChange={(e) => setForm((p) => ({ ...p, standard: e.target.value }))}
                  placeholder="e.g. 1"
                  required
                />
              )}
            </div>
            <AcademicYearSelect
              value={form.academic_year}
              onChange={(v) => setForm((p) => ({ ...p, academic_year: v }))}
              id="academic_year"
              label="Academic Year *"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="total_fees">Total fees (optional)</Label>
              <Input
                id="total_fees"
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g. final FRC / annual total"
                value={form.total_fees}
                onChange={(e) => setForm((p) => ({ ...p, total_fees: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Shown in the fee structure list; independent of quarter amounts.
              </p>
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
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rowFeeTypes.map((ft, index) => (
                    <tr key={`${ft}-${index}`} className="border-b">
                      <td className="py-2 pr-4">
                        <Select
                          value={ft}
                          onValueChange={(v) => handleRowFeeTypeChange(index, v)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {feeTypes.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {getFeeTypeLabel(opt)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
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
                      <td className="py-1 px-2 text-right">
                        {rowFeeTypes.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRow(index)}
                            aria-label="Remove fee type"
                          >
                            ×
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {feeTypes.length > rowFeeTypes.length && (
            <div className="mt-3">
              <Button type="button" variant="secondary" size="sm" onClick={handleAddRow}>
                Add Fee Type Row
              </Button>
            </div>
          )}

          <div className="flex gap-2 justify-start">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
            <SubmitButton
              loading={loading}
              loadingLabel={structureId ? "Saving…" : "Adding…"}
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
