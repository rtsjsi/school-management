"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateFeeStructure } from "@/app/dashboard/fees/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AcademicYearSelect } from "@/components/AcademicYearSelect";
import { Button } from "@/components/ui/button";
import { splitAnnualFeeAcrossQuarters } from "@/lib/fee-annual-split";
import { FEE_STRUCTURE_FEE_TYPE_CODES } from "@/lib/fee-types";
import { cn, getFeeTypeLabel } from "@/lib/utils";

type FeeRow = { localId: string; feeType: string; annual: string };

type FeeStructureFormProps = {
  structureId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

function nextLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const shellClass =
  "rounded-lg border border-border/60 bg-background/80 shadow-sm";

export default function FeeStructureForm({ structureId, onSuccess, onCancel }: FeeStructureFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!structureId);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    standard: "",
    academic_year: "",
  });
  const [feeRows, setFeeRows] = useState<FeeRow[]>([
    { localId: nextLocalId(), feeType: FEE_STRUCTURE_FEE_TYPE_CODES[0], annual: "" },
  ]);

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
        .select("fee_type, quarter, amount")
        .eq("fee_structure_id", structureId);
      const byType: Record<string, number> = {};
      for (const row of items ?? []) {
        const r = row as { fee_type?: string; amount?: number };
        const ft = r.fee_type ?? "education_fee";
        byType[ft] = (byType[ft] ?? 0) + Number(r.amount ?? 0);
      }
      const entries = Object.entries(byType);
      const rows: FeeRow[] =
        entries.length > 0
          ? entries.map(([feeType, sum]) => ({
              localId: nextLocalId(),
              feeType,
              annual: sum > 0 ? String(Math.round(sum * 100) / 100) : "",
            }))
          : [{ localId: nextLocalId(), feeType: FEE_STRUCTURE_FEE_TYPE_CODES[0], annual: "" }];
      setForm({
        standard: structure.standard_id,
        academic_year: structure.academic_year,
      });
      setFeeRows(rows);
      setLoadingData(false);
    };
    load();
  }, [structureId]);

  const usedFeeTypes = new Set(feeRows.map((r) => r.feeType));
  const availableToAdd = FEE_STRUCTURE_FEE_TYPE_CODES.filter((c) => !usedFeeTypes.has(c));

  const setRowAnnual = (localId: string, annual: string) => {
    setFeeRows((prev) => prev.map((r) => (r.localId === localId ? { ...r, annual } : r)));
  };

  const setRowFeeType = (localId: string, feeType: string) => {
    if (feeRows.some((r) => r.localId !== localId && r.feeType === feeType)) return;
    setFeeRows((prev) => prev.map((r) => (r.localId === localId ? { ...r, feeType } : r)));
  };

  const addRow = () => {
    const next = availableToAdd[0];
    if (!next) return;
    setFeeRows((prev) => [...prev, { localId: nextLocalId(), feeType: next, annual: "" }]);
  };

  const removeRow = (localId: string) => {
    setFeeRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.localId !== localId)));
  };

  const grandTotalAnnual = feeRows.reduce((s, r) => {
    const n = Number.parseFloat(r.annual.trim());
    return s + (Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.standard.trim() || !form.academic_year.trim()) {
      setError("Standard and academic year are required.");
      return;
    }

    const items: { fee_type: string; quarter: number; amount: number }[] = [];
    for (const row of feeRows) {
      const raw = row.annual.trim();
      if (!raw) continue;
      const annualNum = Number.parseFloat(raw);
      if (!Number.isFinite(annualNum) || annualNum <= 0) {
        setError(`Enter a valid positive annual amount for ${getFeeTypeLabel(row.feeType)}, or clear the row.`);
        return;
      }
      const quarters = splitAnnualFeeAcrossQuarters(annualNum);
      if (quarters.length !== 4) {
        setError("Could not compute quarter amounts.");
        return;
      }
      for (const q of quarters) {
        items.push({ fee_type: row.feeType, quarter: q.quarter, amount: q.amount });
      }
    }

    if (items.length === 0) {
      setError("Add at least one fee type with a positive annual amount.");
      return;
    }

    const totalFeesValue = Math.round(grandTotalAnnual * 100) / 100;

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

      const { error: itemsErr } = await supabase.from("fee_structure_items").insert(insertItems);
      if (itemsErr) {
        setError(itemsErr.message);
        return;
      }

      setForm({ standard: "", academic_year: "" });
      setFeeRows([{ localId: nextLocalId(), feeType: FEE_STRUCTURE_FEE_TYPE_CODES[0], annual: "" }]);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className={cn(shellClass, "max-w-xl w-full p-3")}>
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 overflow-visible w-full">
      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded-md">{error}</p>
      )}

      <div className="flex flex-col gap-3">
        <AcademicYearSelect
          value={form.academic_year}
          onChange={(v) => setForm((p) => ({ ...p, academic_year: v }))}
          id="academic_year"
          label="Academic year *"
          compact
        />
        <div className="space-y-1">
          <Label htmlFor="standard" className="text-xs font-medium text-muted-foreground">
            Standard *
          </Label>
          {classes.length > 0 ? (
            <Select value={form.standard} onValueChange={(v) => setForm((p) => ({ ...p, standard: v }))} required>
              <SelectTrigger id="standard" className="h-9 text-sm">
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
              placeholder="Standard ID"
              required
              className="h-9 text-sm"
            />
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-border/50 space-y-2">
        <span className="text-xs font-semibold text-foreground">Annual by fee type *</span>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Split equally Q1–Q4 (Q4 rounds).
        </p>
        <div className="space-y-2">
          {feeRows.map((row) => (
            <div
              key={row.localId}
              className="rounded-md border border-border/60 bg-muted/20 p-2 space-y-1.5"
            >
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground">Fee type & annual ₹</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={row.feeType} onValueChange={(v) => setRowFeeType(row.localId, v)}>
                    <SelectTrigger className="h-9 text-sm min-w-0 flex-1 basis-[min(100%,14rem)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_STRUCTURE_FEE_TYPE_CODES.map((code) => (
                        <SelectItem
                          key={code}
                          value={code}
                          disabled={feeRows.some((r) => r.localId !== row.localId && r.feeType === code)}
                        >
                          {getFeeTypeLabel(code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="₹"
                    value={row.annual}
                    onChange={(e) => setRowAnnual(row.localId, e.target.value)}
                    className="h-9 text-sm tabular-nums w-[8rem] shrink-0"
                  />
                  <div className="inline-flex flex-nowrap items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground px-2.5"
                      disabled={feeRows.length <= 1}
                      title={feeRows.length <= 1 ? "At least one fee type row is required" : undefined}
                      onClick={() => removeRow(row.localId)}
                    >
                      Remove
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs px-2.5"
                      disabled={availableToAdd.length === 0}
                      title={availableToAdd.length === 0 ? "All fee types are already added" : undefined}
                      onClick={addRow}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              {(() => {
                const n = Number.parseFloat(row.annual.trim());
                if (!Number.isFinite(n) || n <= 0) return null;
                const q = splitAnnualFeeAcrossQuarters(n);
                if (q.length !== 4) return null;
                return (
                  <p className="text-[11px] text-muted-foreground leading-snug pl-0.5">
                    Q1 ₹{q[0].amount.toFixed(2)} · Q2 ₹{q[1].amount.toFixed(2)} · Q3 ₹{q[2].amount.toFixed(2)} · Q4 ₹
                    {q[3].amount.toFixed(2)}
                  </p>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1 pt-1 border-t border-border/50">
        <Label htmlFor="total_fees_display" className="text-xs font-medium text-muted-foreground">
          Total Annual Fee
        </Label>
        <Input
          id="total_fees_display"
          readOnly
          tabIndex={-1}
          title="Saved as sum of annual amounts above"
          className="h-9 text-sm font-medium tabular-nums bg-muted/80 border-transparent"
          value={
            grandTotalAnnual > 0
              ? `₹${new Intl.NumberFormat("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(grandTotalAnnual)}`
              : ""
          }
          placeholder="—"
        />
      </div>

      <div className="flex justify-start flex-wrap gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" className="h-9 text-sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <SubmitButton
          loading={loading}
          loadingLabel="Saving…"
          className="h-9 px-4 text-sm font-semibold shadow-none"
        >
          {structureId ? "Save" : "Add fee structure"}
        </SubmitButton>
      </div>
    </form>
  );

  return <div className={cn(shellClass, "max-w-xl w-full")}>{formContent}</div>;
}
