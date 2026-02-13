import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "daily";
    const date = searchParams.get("date");
    const month = searchParams.get("month");
    const studentId = searchParams.get("studentId");

    const supabase = await createClient();

    if (type === "payment_mode") {
      let query = supabase
        .from("fee_collections")
        .select("payment_mode, amount");
      if (date) {
        const start = `${date}T00:00:00`;
        const end = `${date}T23:59:59`;
        query = query.gte("collected_at", start).lte("collected_at", end);
      }
      if (month) {
        const [y, m] = month.split("-");
        const start = `${y}-${m}-01T00:00:00`;
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        const end = `${y}-${m}-${lastDay}T23:59:59`;
        query = query.gte("collected_at", start).lte("collected_at", end);
      }
      const { data } = await query;
      const grouped = (data ?? []).reduce((acc: Record<string, { count: number; total: number }>, row) => {
        const mode = row.payment_mode ?? "unknown";
        if (!acc[mode]) acc[mode] = { count: 0, total: 0 };
        acc[mode].count += 1;
        acc[mode].total += Number(row.amount ?? 0);
        return acc;
      }, {});
      const result = Object.entries(grouped).map(([payment_mode, v]) => ({
        payment_mode,
        count: v.count,
        total: v.total,
      }));
      return NextResponse.json({ data: result });
    }

    if (type === "student" && studentId) {
      const { data } = await supabase
        .from("fee_collections")
        .select("receipt_number, amount, fee_type, payment_mode, collected_at, students(full_name)")
        .eq("student_id", studentId)
        .order("collected_at", { ascending: false });
      const result = (data ?? []).map((row) => ({
        receipt_number: row.receipt_number,
        student_name: Array.isArray(row.students) ? (row.students[0] as { full_name?: string })?.full_name : (row.students as { full_name?: string } | null)?.full_name,
        amount: row.amount,
        fee_type: row.fee_type,
        payment_mode: row.payment_mode,
        collected_at: row.collected_at,
      }));
      return NextResponse.json({ data: result });
    }

    if (type === "daily" && date) {
      const start = `${date}T00:00:00`;
      const end = `${date}T23:59:59`;
      const { data } = await supabase
        .from("fee_collections")
        .select("receipt_number, amount, fee_type, payment_mode, collected_at, students(full_name)")
        .gte("collected_at", start)
        .lte("collected_at", end)
        .order("collected_at", { ascending: false });
      const result = (data ?? []).map((row) => ({
        receipt_number: row.receipt_number,
        student_name: Array.isArray(row.students) ? (row.students[0] as { full_name?: string })?.full_name : (row.students as { full_name?: string } | null)?.full_name,
        amount: row.amount,
        fee_type: row.fee_type,
        payment_mode: row.payment_mode,
        collected_at: row.collected_at,
      }));
      return NextResponse.json({ data: result });
    }

    if (type === "monthly" && month) {
      const [y, m] = month.split("-");
      const start = `${y}-${m}-01T00:00:00`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const end = `${y}-${m}-${lastDay}T23:59:59`;
      const { data } = await supabase
        .from("fee_collections")
        .select("receipt_number, amount, fee_type, payment_mode, collected_at, students(full_name)")
        .gte("collected_at", start)
        .lte("collected_at", end)
        .order("collected_at", { ascending: false });
      const result = (data ?? []).map((row) => ({
        receipt_number: row.receipt_number,
        student_name: Array.isArray(row.students) ? (row.students[0] as { full_name?: string })?.full_name : (row.students as { full_name?: string } | null)?.full_name,
        amount: row.amount,
        fee_type: row.fee_type,
        payment_mode: row.payment_mode,
        collected_at: row.collected_at,
      }));
      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ data: [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
