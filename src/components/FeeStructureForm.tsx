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
import { splitAnnualFeeAcrossQuarters } from "@/lib/fee-annual-split";

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
    annual_fee: "",
  });
  const [classes, setClasses] = useState<{ id: string; name: string; sort_order: number }[]>([]);

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
        .select("id, standard_id, academic_year")
        .eq("id", structureId)
        .single();
      if (structErr || !structure) {
        setError(structErr?.message ?? "Structure not found");
        setLoadingData(false);
        return;
      }
      const { data: items } = await supabase
        .from("fee_structure_items")
        .select("quarter, amount")
        .eq("fee_structure_id", structureId);
      const annualSum = (items ?? []).reduce((s, row) => s + Number((row as { amount?: number }).amount ?? 0), 0);
      setForm({
        standard: structure.standard_id,
        academic_year: structure.academic_year,
        annual_fee: annualSum > 0 ? String(Math.round(annualSum * 100) / 100) : "",
      });
      setLoadingData(false);
    };
    load();
  }, [structureId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.standard.trim() || !form.academic_year.trim()) {
      setError("Standard and academic year are required.");
      return;
    }

    const annualRaw = form.annual_fee.trim();
    if (!annualRaw) {
      setError("Annual fee is required (it will be split equally across Q1–Q4).");
      return;
    }
    const annualNum = Number.parseFloat(annualRaw);
    if (!Number.isFinite(annualNum) || annualNum <= 0) {
      setError("Annual fee must be a positive number.");
      return;
    }

    const items = splitAnnualFeeAcrossQuarters(annualNum);
    if (items.length !== 4) {
      setError("Could not compute quarter amounts.");
      return;
    }

    const totalFeesValue = Math.round(annualNum * 100) / 100;

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
        quarter: i.quarter,
        amount: i.amount,
      }));

      const { error: itemsErr } = await supabase.from("fee_structure_items").insert(insertItems);
      if (itemsErr) {
        setError(itemsErr.message);
        return;
      }

      setForm({ standard: "", academic_year: "", annual_fee: "" });
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!structureId;

  const preview = (() => {
    const n = Number.parseFloat(form.annual_fee.trim());
    if (!Number.isFinite(n) || n <= 0) return null;
    return splitAnnualFeeAcrossQuarters(n);
  })();

  if (loadingData) {
    return (
      <div className="py-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="standard">Standard *</Label>
          {classes.length > 0 ? (
            <Select value={form.standard} onValueChange={(v) => setForm((p) => ({ ...p, standard: v }))} required>
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
              placeholder="e.g. standard UUID"
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
          <Label htmlFor="annual_fee">Annual fee (total for year) *</Label>
          <Input
            id="annual_fee"
            type="number"
            min={0.01}
            step={0.01}
            placeholder="e.g. 40000"
            value={form.annual_fee}
            onChange={(e) => setForm((p) => ({ ...p, annual_fee: e.target.value }))}
            required
          />
          <p className="text-xs text-muted-foreground">
            Saved as four equal quarterly amounts (last quarter adjusts for rounding).
          </p>
          {preview && preview.length === 4 && (
            <p className="text-xs text-muted-foreground">
              Q1: ₹{preview[0].amount.toFixed(2)} · Q2: ₹{preview[1].amount.toFixed(2)} · Q3: ₹{preview[2].amount.toFixed(2)}{" "}
              · Q4: ₹{preview[3].amount.toFixed(2)}
            </p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="total_fees_display">Total fees (FRC)</Label>
          <Input
            id="total_fees_display"
            readOnly
            tabIndex={-1}
            className="bg-muted tabular-nums"
            value={
              (() => {
                const n = Number.parseFloat(form.annual_fee.trim());
                if (!Number.isFinite(n) || n <= 0) return "";
                return `₹${new Intl.NumberFormat("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(Math.round(n * 100) / 100)}`;
              })()
            }
            placeholder="Enter annual fee above"
          />
          <p className="text-xs text-muted-foreground">Matches annual fee total (saved automatically).</p>
        </div>
      </div>

      <div className="flex gap-2 justify-start">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <SubmitButton loading={loading} loadingLabel={structureId ? "Saving…" : "Adding…"}>
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
      <CardContent className="pt-6">{formContent}</CardContent>
    </Card>
  );
}
