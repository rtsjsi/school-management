import type { SupabaseClient } from "@supabase/supabase-js";

export type ExistingOnlineTransactionMatch = {
  receipt_number: string | null;
  student_name: string | null;
};

/**
 * Returns an existing fee_collections row that already uses this online_transaction_id,
 * or null if the ID is free. Optionally exclude a collection id (for edit flows).
 */
export async function findExistingOnlineTransactionId(
  supabase: SupabaseClient,
  txnId: string,
  excludeCollectionId?: string
): Promise<ExistingOnlineTransactionMatch | null> {
  const trimmed = txnId.trim();
  if (!trimmed) return null;

  let query = supabase
    .from("fee_collections")
    .select("receipt_number, students(full_name)")
    .eq("online_transaction_id", trimmed)
    .limit(1);

  if (excludeCollectionId) {
    query = query.neq("id", excludeCollectionId);
  }

  const { data, error } = await query;
  if (error || !data?.length) return null;

  const row = data[0];
  const students = row.students as
    | { full_name?: string }
    | { full_name?: string }[]
    | null;
  const student_name = Array.isArray(students)
    ? students[0]?.full_name ?? null
    : students?.full_name ?? null;

  return {
    receipt_number: (row.receipt_number as string | null) ?? null,
    student_name,
  };
}

export function formatDuplicateOnlineTransactionMessage(
  match: ExistingOnlineTransactionMatch
): string {
  const receipt = match.receipt_number ? `receipt ${match.receipt_number}` : "another receipt";
  const student = match.student_name ? ` (${match.student_name})` : "";
  return `This transaction ID is already used on ${receipt}${student}. Each online transaction ID can only be used once.`;
}
