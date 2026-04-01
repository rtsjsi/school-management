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
    standardId: string;
    academic_year: string;
    total_fees: number | null;
    items: { fee_type: string; quarter: number; amount: number }[];
  }
): Promise<FeeStructureActionResult> {
  const supabase = await createClient();
  const trimmed = {
    standardId: data.standardId.trim(),
    academic_year: data.academic_year.trim(),
  };
  if (!trimmed.standardId || !trimmed.academic_year) {
    return { ok: false, error: "Standard and academic year are required." };
  }

  const { error: structErr } = await supabase
    .from("fee_structures")
    .update({
      standard_id: trimmed.standardId,
      academic_year: trimmed.academic_year,
      total_fees: data.total_fees,
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

type FeeCollectionPaymentUpdateInput = {
  paymentMode: string;
  chequeNumber?: string | null;
  chequeBank?: string | null;
  chequeDate?: string | null;
  onlineTransactionId?: string | null;
  onlineTransactionRef?: string | null;
  modificationRemarks: string;
};

export async function updateFeeCollection(
  id: string,
  data: FeeCollectionPaymentUpdateInput
): Promise<FeeCollectionActionResult> {
  const remarks = data.modificationRemarks?.trim();
  if (!remarks) {
    return { ok: false, error: "Remarks are compulsory when modifying a fee collection entry." };
  }
  const validModes = ["cash", "cheque", "online"];
  if (!validModes.includes(data.paymentMode)) {
    return { ok: false, error: "Invalid payment mode." };
  }
  const paymentMode = data.paymentMode;
  const chequeNumber = data.chequeNumber?.trim() || null;
  const chequeBank = data.chequeBank?.trim() || null;
  const chequeDate = data.chequeDate?.trim() || null;
  const onlineTransactionId = data.onlineTransactionId?.trim() || null;
  const onlineTransactionRef = data.onlineTransactionRef?.trim() || null;

  if (paymentMode === "cheque" && !chequeNumber) {
    return { ok: false, error: "Cheque number is required for cheque payment mode." };
  }
  if (paymentMode === "online" && !onlineTransactionId) {
    return { ok: false, error: "Transaction ID is required for online payment mode." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to update a fee collection." };
  }

  const { error } = await supabase
    .from("fee_collections")
    .update({
      payment_mode: paymentMode,
      cheque_number: paymentMode === "cheque" ? chequeNumber : null,
      cheque_bank: paymentMode === "cheque" ? chequeBank : null,
      cheque_date: paymentMode === "cheque" ? chequeDate : null,
      online_transaction_id: paymentMode === "online" ? onlineTransactionId : null,
      online_transaction_ref: paymentMode === "online" ? onlineTransactionRef : null,
      modification_remarks: remarks,
      modified_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
