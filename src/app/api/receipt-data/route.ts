import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isGradeInRange(grade: string, from: string, to: string): boolean {
  const ORDER: Record<string, number> = {
    "Jr KG": 0, "Sr KG": 1, "1": 2, "2": 3, "3": 4, "4": 5, "5": 6,
    "6": 7, "7": 8, "8": 9, "9": 10, "10": 11, "11": 12, "12": 13,
  };
  const g = ORDER[grade] ?? -1;
  const f = ORDER[from] ?? -1;
  const t = ORDER[to] ?? -1;
  if (g < 0 || f < 0 || t < 0) return false;
  return g >= f && g <= t;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = await createClient();
    const { data: c, error } = await supabase
      .from("fee_collections")
      .select(`
        id, student_id, receipt_number, amount, fee_type, quarter, academic_year, payment_mode,
        collected_at, collected_by, cheque_number, cheque_bank, cheque_date,
        online_transaction_id, online_transaction_ref,
        students(full_name, grade, division, roll_number, student_id)
      `)
      .eq("id", id)
      .single();

    if (error || !c) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const s = Array.isArray(c.students) ? c.students[0] : c.students;
    const student = s as { full_name?: string; grade?: string; division?: string; roll_number?: number; student_id?: string } | null;
    const studentId = (c as { student_id?: string }).student_id;
    if (!studentId) return NextResponse.json({ error: "Invalid collection" }, { status: 400 });

    let outstandingAfterPayment: number | undefined;
    const { data: structures } = await supabase
      .from("fee_structures")
      .select("grade_from, grade_to, fee_structure_items(quarter, amount)")
      .eq("academic_year", c.academic_year);
    const structure = (structures ?? []).find((st) =>
      isGradeInRange(student?.grade ?? "", st.grade_from, st.grade_to)
    );
    if (structure) {
      const items = (structure.fee_structure_items as { quarter: number; amount: number }[]) ?? [];
      const totalDues = items.reduce((sum, i) => sum + Number(i.amount), 0);
      const { data: paidRows } = await supabase
        .from("fee_collections")
        .select("amount")
        .eq("student_id", studentId)
        .eq("academic_year", c.academic_year);
      const totalPaid = (paidRows ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
      outstandingAfterPayment = Math.max(0, totalDues - totalPaid);
    }

    return NextResponse.json({
      receiptNumber: c.receipt_number,
      studentName: student?.full_name ?? "—",
      amount: Number(c.amount),
      paymentMode: c.payment_mode,
      quarter: c.quarter,
      academicYear: c.academic_year,
      feeType: c.fee_type,
      collectedAt: c.collected_at,
      collectedBy: c.collected_by,
      chequeNumber: c.cheque_number,
      chequeBank: c.cheque_bank,
      chequeDate: c.cheque_date,
      onlineTransactionId: c.online_transaction_id,
      onlineTransactionRef: c.online_transaction_ref,
      grade: student?.grade,
      division: student?.division,
      rollNumber: student?.roll_number,
      grNo: student?.student_id,
      outstandingAfterPayment,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
