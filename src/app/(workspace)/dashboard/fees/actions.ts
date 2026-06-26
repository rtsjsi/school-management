"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser, canEditFees, isPrincipal } from "@/lib/auth";

export type FeeStructureActionResult = { ok: true } | { ok: false; error: string };

export async function deleteFeeStructure(id: string): Promise<FeeStructureActionResult> {
  const user = await requireUser();
  if (!canEditFees(user)) return { ok: false, error: "Unauthorized" };
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
  const user = await requireUser();
  if (!canEditFees(user)) return { ok: false, error: "Unauthorized" };
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

  const user = await requireUser();
  if (!canEditFees(user)) return { ok: false, error: "Unauthorized" };

  const supabase = await createClient();

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

export type FeeRefundActionResult = { ok: true } | { ok: false; error: string };

type ProcessFeeRefundInput = {
  feeCollectionId: string;
  amount: number;
  refundMode: string;
  refundReason: string;
  refundDate: string;
};

export async function processFeeRefund(
  data: ProcessFeeRefundInput
): Promise<FeeRefundActionResult> {
  const user = await requireUser();
  if (!canEditFees(user)) return { ok: false, error: "Unauthorized" };

  if (data.amount <= 0) return { ok: false, error: "Refund amount must be greater than zero." };
  if (!data.refundReason?.trim()) return { ok: false, error: "Refund reason is required." };

  const validModes = ["cash", "cheque", "online"];
  if (!validModes.includes(data.refundMode)) return { ok: false, error: "Invalid refund mode." };

  const supabase = await createClient();

  const { data: collection, error: collErr } = await supabase
    .from("fee_collections")
    .select("amount")
    .eq("id", data.feeCollectionId)
    .single();

  if (collErr || !collection) return { ok: false, error: "Fee collection not found." };

  const { data: refunds } = await supabase
    .from("fee_refunds")
    .select("amount")
    .eq("fee_collection_id", data.feeCollectionId);

  const existingRefundsTotal = (refunds ?? []).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  if (existingRefundsTotal + data.amount > Number(collection.amount)) {
    return { ok: false, error: "Refund amount exceeds the remaining collected amount." };
  }

  const isUserPrincipal = isPrincipal(user);
  const status = isUserPrincipal ? 'approved' : 'pending';

  const { error } = await supabase.from("fee_refunds").insert({
    fee_collection_id: data.feeCollectionId,
    amount: data.amount,
    refund_mode: data.refundMode,
    refund_reason: data.refundReason.trim(),
    refund_date: data.refundDate,
    processed_by: user.id,
    status,
    ...(isUserPrincipal ? {
      approved_by: user.id,
      approved_at: new Date().toISOString()
    } : {})
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function approveFeeRefund(refundId: string): Promise<FeeRefundActionResult> {
  const user = await requireUser();
  if (!isPrincipal(user)) return { ok: false, error: "Unauthorized. Only Principal can approve refunds." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("fee_refunds")
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", refundId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function rejectFeeRefund(refundId: string, reason: string): Promise<FeeRefundActionResult> {
  const user = await requireUser();
  if (!isPrincipal(user)) return { ok: false, error: "Unauthorized. Only Principal can reject refunds." };

  if (!reason?.trim()) return { ok: false, error: "Rejection reason is required." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("fee_refunds")
    .update({
      status: 'rejected',
      rejection_reason: reason.trim(),
    })
    .eq("id", refundId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
