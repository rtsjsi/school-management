import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import {
  computeExpensePaymentTotals,
  type ExpensePaymentStatus,
} from "@/lib/expense-payments";

type PaymentJoin = {
  amount?: number;
  payment_mode?: string;
};

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "list";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const expenseHeadId = searchParams.get("expenseHeadId");
    const paymentMode = searchParams.get("paymentMode");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");

    const supabase = await createClient();

    let query = supabase
      .from("expenses")
      .select(
        "id, expense_date, voucher, amount, description, expense_by, expense_heads(name), party, expense_payments(amount, payment_mode)"
      )
      .order("expense_date", { ascending: false });

    if (fromDate) query = query.gte("expense_date", fromDate);
    if (toDate) query = query.lte("expense_date", toDate);
    if (expenseHeadId && expenseHeadId !== "all") {
      query = query.eq("expense_head_id", expenseHeadId);
    }
    if (minAmount && !isNaN(parseFloat(minAmount))) {
      query = query.gte("amount", parseFloat(minAmount));
    }
    if (maxAmount && !isNaN(parseFloat(maxAmount))) {
      query = query.lte("amount", parseFloat(maxAmount));
    }
    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(
        `party.ilike.%${s}%,description.ilike.%${s}%,voucher.ilike.%${s}%,expense_by.ilike.%${s}%`
      );
    }

    const { data } = await query;
    const rows = data ?? [];

    if (type === "summary") {
      const grouped: Record<string, { count: number; total: number }> = {};
      for (const row of rows) {
        const payments = (row.expense_payments ?? []) as PaymentJoin[];
        if (payments.length === 0) continue;
        for (const p of payments) {
          const mode = (p.payment_mode ?? "unknown").toLowerCase();
          if (paymentMode && paymentMode !== "all" && mode !== paymentMode) continue;
          if (!grouped[mode]) grouped[mode] = { count: 0, total: 0 };
          grouped[mode].count += 1;
          grouped[mode].total += Number(p.amount ?? 0);
        }
      }
      const result = Object.entries(grouped).map(([payment_mode, v]) => ({
        payment_mode,
        count: v.count,
        total: v.total,
      }));
      return NextResponse.json({ data: result });
    }

    const result = rows
      .map((row: Record<string, unknown>) => {
        const head = row.expense_heads;
        const headName = Array.isArray(head)
          ? (head[0] as { name?: string })?.name
          : (head as { name?: string } | null)?.name;
        const payments = (row.expense_payments ?? []) as PaymentJoin[];
        const paid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
        const totals = computeExpensePaymentTotals(Number(row.amount ?? 0), paid);
        const modes = [
          ...new Set(
            payments
              .map((p) => (p.payment_mode ?? "").toLowerCase())
              .filter(Boolean)
          ),
        ];
        return {
          id: row.id,
          expense_date: row.expense_date,
          voucher: row.voucher,
          amount: row.amount,
          paid: totals.paid,
          balance: totals.balance,
          status: totals.status as ExpensePaymentStatus,
          payment_count: payments.length,
          payment_modes: modes,
          description: row.description,
          expense_by: row.expense_by,
          expense_head: headName,
          party: row.party,
        };
      })
      .filter((row) => {
        if (paymentMode && paymentMode !== "all") {
          if (!row.payment_modes.includes(paymentMode)) return false;
        }
        if (paymentStatus && paymentStatus !== "all") {
          if (row.status !== paymentStatus) return false;
        }
        return true;
      });

    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
