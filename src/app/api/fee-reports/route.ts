import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const month = searchParams.get("month");
    const academicYear = searchParams.get("academicYear");
    const quarter = searchParams.get("quarter");
    const paymentMode = searchParams.get("paymentMode");
    const studentId = searchParams.get("studentId");
    const standard = searchParams.get("standard");
    const limit = searchParams.get("limit");

    const supabase = await createClient();

    // Build base query with student join for grade/name
    let query = supabase
      .from("fee_collections")
      .select(
        "id, receipt_number, amount, fee_type, quarter, academic_year, payment_mode, collection_date, collected_by, modified_by, cheque_number, cheque_bank, cheque_date, online_transaction_id, online_transaction_ref, students(full_name, standard, division, roll_number, gr_number), collector:profiles!collected_by(full_name)"
      );

    // Date range
    if (dateFrom) {
      query = query.gte("collection_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("collection_date", dateTo);
    }

    // Month filter (overrides date range if both provided)
    if (month) {
      const [y, m] = month.split("-");
      const start = `${y}-${m}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("collection_date", start).lte("collection_date", end);
    }

    if (academicYear) query = query.eq("academic_year", academicYear);
    if (quarter) query = query.eq("quarter", parseInt(quarter));
    if (paymentMode) query = query.eq("payment_mode", paymentMode);
    if (studentId) query = query.eq("student_id", studentId);

    let q = query.order("collection_date", { ascending: false });
    if (limit) {
      const n = Math.min(parseInt(limit, 10) || 20, 100);
      q = q.limit(n);
    }
    const { data: rows } = await q;

    // Filter by standard in memory (student.standard comes from join)
    let filtered = rows ?? [];
    if (standard) {
      filtered = filtered.filter((row) => {
        const s = row.students;
        const studentStandard = Array.isArray(s) ? (s[0] as { standard?: string })?.standard : (s as { standard?: string } | null)?.standard;
        return studentStandard === standard;
      });
    }

    const result = filtered.map((row) => {
      const s = Array.isArray(row.students) ? row.students[0] : row.students;
      const student = s as { full_name?: string; standard?: string; division?: string; roll_number?: number; gr_number?: string } | null;
      const col = (row as { collector?: { full_name?: string } | { full_name?: string }[] }).collector;
      const collectorProfile = Array.isArray(col) ? col[0] : col;
      const collectedByName = collectorProfile?.full_name?.trim() || null;
      return {
        id: row.id,
        receipt_number: row.receipt_number,
        student_name: student?.full_name,
        student_standard: student?.standard,
        student_division: student?.division,
        student_roll_number: student?.roll_number,
        student_gr_no: student?.gr_number,
        amount: row.amount,
        fee_type: row.fee_type,
        quarter: row.quarter,
        academic_year: row.academic_year,
        payment_mode: row.payment_mode,
        collection_date: row.collection_date,
        collected_by: collectedByName,
        cheque_number: row.cheque_number,
        cheque_bank: row.cheque_bank,
        cheque_date: row.cheque_date,
        online_transaction_id: row.online_transaction_id,
        online_transaction_ref: row.online_transaction_ref,
      };
    });

    // Compute summary
    const byMode: Record<string, { count: number; total: number }> = {};
    let totalAmount = 0;
    for (const row of result) {
      const mode = (row as { payment_mode?: string }).payment_mode ?? "unknown";
      if (!byMode[mode]) byMode[mode] = { count: 0, total: 0 };
      byMode[mode].count += 1;
      byMode[mode].total += Number((row as { amount?: number }).amount ?? 0);
      totalAmount += Number((row as { amount?: number }).amount ?? 0);
    }

    return NextResponse.json({
      data: result,
      summary: {
        totalCount: result.length,
        totalAmount,
        byMode: Object.entries(byMode).map(([payment_mode, v]) => ({
          payment_mode,
          count: v.count,
          total: v.total,
        })),
      },
    });
  } catch {
    return NextResponse.json({
      data: [],
      summary: { totalCount: 0, totalAmount: 0, byMode: [] },
    });
  }
}
