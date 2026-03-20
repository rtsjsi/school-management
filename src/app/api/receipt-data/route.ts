import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { annualNetFeeLiability } from "@/lib/fee-concession";

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
        students(full_name, standard, division, roll_number, student_id)
      `)
      .eq("id", id)
      .single();

    if (error || !c) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const s = Array.isArray(c.students) ? c.students[0] : c.students;
    const student = s as {
      full_name?: string;
      standard?: string;
      division?: string;
      roll_number?: number;
      student_id?: string;
      fee_concession_amount?: number | null;
    } | null;
    const studentId = (c as { student_id?: string }).student_id;
    if (!studentId) return NextResponse.json({ error: "Invalid collection" }, { status: 400 });

    let outstandingAfterPayment: number | undefined;
    const { data: structures } = await supabase
      .from("fee_structures")
      .select("standards(name), fee_structure_items(fee_type, quarter, amount)")
      .eq("academic_year", c.academic_year);
    const structure = (structures ?? []).find((st: { standards?: { name?: string } | { name?: string }[] | null }) => {
      const std = Array.isArray(st.standards)
        ? (st.standards[0] as { name?: string })?.name
        : (st.standards as { name?: string } | null)?.name;
      return std && std === (student?.standard ?? "");
    });
    if (structure) {
      const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
      const totalDues = annualNetFeeLiability(items, student?.fee_concession_amount ?? null);
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
      standard: student?.standard,
      division: student?.division,
      rollNumber: student?.roll_number,
      grNo: student?.student_id,
      outstandingAfterPayment,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
