import { createClient } from "@/lib/supabase/server";

export async function generateReceiptNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `RCP-${year}-`;

  const { data } = await supabase
    .from("fee_collections")
    .select("receipt_number")
    .filter("receipt_number", "like", `${prefix}%`)
    .order("receipt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (data?.receipt_number) {
    const match = (data.receipt_number as string).match(/\d+$/);
    if (match) nextNum = parseInt(match[0], 10) + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, "0")}`;
}
