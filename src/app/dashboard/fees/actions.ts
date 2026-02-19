"use server";

import { createClient } from "@/lib/supabase/server";

export type FeeStructureActionResult = { ok: true } | { ok: false; error: string };

export async function deleteFeeStructure(id: string): Promise<FeeStructureActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("fee_structures").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateFeeStructure(
  id: string,
  data: {
    name: string;
    grade_from: string;
    grade_to: string;
    academic_year: string;
    items: { fee_type: string; quarter: number; amount: number }[];
  }
): Promise<FeeStructureActionResult> {
  const supabase = await createClient();
  const trimmed = {
    name: data.name.trim(),
    grade_from: data.grade_from.trim(),
    grade_to: data.grade_to.trim(),
    academic_year: data.academic_year.trim(),
  };
  if (!trimmed.name || !trimmed.grade_from || !trimmed.grade_to || !trimmed.academic_year) {
    return { ok: false, error: "Name, grade range, and academic year are required." };
  }

  const { error: structErr } = await supabase
    .from("fee_structures")
    .update({
      name: trimmed.name,
      grade_from: trimmed.grade_from,
      grade_to: trimmed.grade_to,
      academic_year: trimmed.academic_year,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (structErr) return { ok: false, error: structErr.message };

  const { error: delErr } = await supabase.from("fee_structure_items").delete().eq("fee_structure_id", id);
  if (delErr) return { ok: false, error: delErr.message };

  if (data.items.length > 0) {
    const items = data.items.map((i) => ({
      fee_structure_id: id,
      fee_type: i.fee_type,
      quarter: i.quarter,
      amount: i.amount,
    }));
    const { error: insErr } = await supabase.from("fee_structure_items").insert(items);
    if (insErr) return { ok: false, error: insErr.message };
  }

  return { ok: true };
}

export type FeeCollectionActionResult = { ok: true } | { ok: false; error: string };

export async function updateFeeCollection(
  id: string,
  paymentMode: string,
  modificationRemarks: string
): Promise<FeeCollectionActionResult> {
  const remarks = modificationRemarks?.trim();
  if (!remarks) {
    return { ok: false, error: "Remarks are compulsory when modifying a fee collection entry." };
  }
  const validModes = ["cash", "cheque", "online"];
  if (!validModes.includes(paymentMode)) {
    return { ok: false, error: "Invalid payment mode." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("fee_collections")
    .update({
      payment_mode: paymentMode,
      modification_remarks: remarks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
