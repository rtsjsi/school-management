import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const month = searchParams.get("month");
    const academicYear = searchParams.get("academicYear");
    const quarter = searchParams.get("quarter");
    const paymentMode = searchParams.get("paymentMode");
    const studentId = searchParams.get("studentId");
    const grade = searchParams.get("grade");

    const supabase = await createClient();

    // Build base query with student join for grade/name
    let query = supabase
      .from("fee_collections")
      .select("id, receipt_number, amount, fee_type, quarter, academic_year, payment_mode, collected_at, collected_by, students(full_name, grade, section)");

    // Date range
    if (dateFrom) {
      query = query.gte("collected_at", `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte("collected_at", `${dateTo}T23:59:59`);
    }

    // Month filter (overrides date range if both provided)
    if (month) {
      const [y, m] = month.split("-");
      const start = `${y}-${m}-01T00:00:00`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const end = `${y}-${m}-${lastDay}T23:59:59`;
      query = query.gte("collected_at", start).lte("collected_at", end);
    }

    if (academicYear) query = query.eq("academic_year", academicYear);
    if (quarter) query = query.eq("quarter", parseInt(quarter));
    if (paymentMode) query = query.eq("payment_mode", paymentMode);
    if (studentId) query = query.eq("student_id", studentId);

    const { data: rows } = await query.order("collected_at", { ascending: false });

    // Filter by grade in memory (student.grade comes from join)
    let filtered = rows ?? [];
    if (grade) {
      filtered = filtered.filter((row) => {
        const s = row.students;
        const studentGrade = Array.isArray(s) ? (s[0] as { grade?: string })?.grade : (s as { grade?: string } | null)?.grade;
        return studentGrade === grade;
      });
    }

    const result = filtered.map((row) => ({
      id: row.id,
      receipt_number: row.receipt_number,
      student_name: Array.isArray(row.students)
        ? (row.students[0] as { full_name?: string })?.full_name
        : (row.students as { full_name?: string } | null)?.full_name,
      student_grade: Array.isArray(row.students)
        ? (row.students[0] as { grade?: string })?.grade
        : (row.students as { grade?: string } | null)?.grade,
      student_section: Array.isArray(row.students)
        ? (row.students[0] as { section?: string })?.section
        : (row.students as { section?: string } | null)?.section,
      amount: row.amount,
      fee_type: row.fee_type,
      quarter: row.quarter,
      academic_year: row.academic_year,
      payment_mode: row.payment_mode,
      collected_at: row.collected_at,
      collected_by: row.collected_by,
    }));

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
