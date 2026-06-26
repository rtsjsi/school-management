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
    const status = searchParams.get("status");
    const academicYear = searchParams.get("academicYear");
    const limit = searchParams.get("limit");

    const supabase = await createClient();

    let query = supabase
      .from("fee_refunds")
      .select(`
        id, amount, refund_date, refund_mode, refund_reason, status, rejection_reason, created_at, approved_at,
        processor:profiles!processed_by(full_name),
        approver:profiles!approved_by(full_name),
        fee_collections!inner(receipt_number, academic_year, students!inner(full_name, standard, division, roll_number, gr_number))
      `);

    if (dateFrom) {
      query = query.gte("refund_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("refund_date", dateTo);
    }

    if (month) {
      const [y, m] = month.split("-");
      const start = `${y}-${m}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("refund_date", start).lte("refund_date", end);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (academicYear) {
      query = query.eq("fee_collections.academic_year", academicYear);
    }

    let q = query.order("refund_date", { ascending: false });
    if (limit) {
      const n = Math.min(parseInt(limit, 10) || 20, 100);
      q = q.limit(n);
    }

    const { data: rows, error } = await q;
    if (error) {
      console.error("Fee refund report query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (rows ?? []).map((row: any) => {
      const fc = Array.isArray(row.fee_collections) ? row.fee_collections[0] : row.fee_collections;
      const s = Array.isArray(fc?.students) ? fc.students[0] : fc?.students;
      
      const processorProfile = Array.isArray(row.processor) ? row.processor[0] : row.processor;
      const approverProfile = Array.isArray(row.approver) ? row.approver[0] : row.approver;

      return {
        id: row.id,
        receipt_number: fc?.receipt_number,
        academic_year: fc?.academic_year,
        student_name: s?.full_name,
        student_standard: s?.standard,
        student_division: s?.division,
        student_gr_no: s?.gr_number,
        amount: row.amount,
        refund_date: row.refund_date,
        refund_mode: row.refund_mode,
        refund_reason: row.refund_reason,
        status: row.status,
        rejection_reason: row.rejection_reason,
        created_at: row.created_at,
        approved_at: row.approved_at,
        processed_by: processorProfile?.full_name?.trim() || null,
        approved_by: approverProfile?.full_name?.trim() || null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("API error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
