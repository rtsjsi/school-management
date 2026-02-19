import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "list";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const expenseHeadId = searchParams.get("expenseHeadId");
    const paymentMode = searchParams.get("paymentMode");
    const search = searchParams.get("search");
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");

    const supabase = await createClient();

    let query = supabase
      .from("expenses")
      .select("id, expense_date, voucher, amount, description, expense_by, account, expense_heads(name), party")
      .order("expense_date", { ascending: false });

    if (fromDate) query = query.gte("expense_date", fromDate);
    if (toDate) query = query.lte("expense_date", toDate);
    if (expenseHeadId && expenseHeadId !== "all") query = query.eq("expense_head_id", expenseHeadId);
    if (paymentMode && paymentMode !== "all") query = query.eq("account", paymentMode);
    if (minAmount && !isNaN(parseFloat(minAmount))) query = query.gte("amount", parseFloat(minAmount));
    if (maxAmount && !isNaN(parseFloat(maxAmount))) query = query.lte("amount", parseFloat(maxAmount));
    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`party.ilike.%${s}%,description.ilike.%${s}%,voucher.ilike.%${s}%,expense_by.ilike.%${s}%`);
    }

    const { data } = await query;

    if (type === "summary") {
      const grouped = (data ?? []).reduce(
        (acc: Record<string, { count: number; total: number }>,
        row: { account?: string; amount?: number }) => {
          const mode = (row.account ?? "unknown").toLowerCase();
          if (!acc[mode]) acc[mode] = { count: 0, total: 0 };
          acc[mode].count += 1;
          acc[mode].total += Number(row.amount ?? 0);
          return acc;
        },
        {}
      );
      const result = Object.entries(grouped).map(([payment_mode, v]) => ({
        payment_mode,
        count: v.count,
        total: v.total,
      }));
      return NextResponse.json({ data: result });
    }

    const result = (data ?? []).map((row: Record<string, unknown>) => {
      const head = row.expense_heads;
      const headName = Array.isArray(head)
        ? (head[0] as { name?: string })?.name
        : (head as { name?: string } | null)?.name;
      return {
        id: row.id,
        expense_date: row.expense_date,
        voucher: row.voucher,
        amount: row.amount,
        description: row.description,
        expense_by: row.expense_by,
        account: row.account,
        expense_head: headName,
        party: row.party,
      };
    });

    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
