import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { annualNetFeeLiability } from "@/lib/fee-concession";
import { getUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = await createClient();
    const { data: c, error } = await supabase
      .from("fee_collections")
      .select(`
        id, student_id, receipt_number, amount, fee_type, quarter, academic_year, payment_mode,
        collection_date, collected_by, cheque_number, cheque_bank, cheque_date,
        online_transaction_id, online_transaction_ref,
        students(full_name, standard, division, roll_number, gr_number, fee_concession_amount),
        collector:profiles!collected_by(full_name)
      `)
      .eq("id", id)
      .single();

    if (error || !c) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const col = (c as { collector?: { full_name?: string } | { full_name?: string }[] }).collector;
    const collectorProfile = Array.isArray(col) ? col[0] : col;
    const collectedByName = collectorProfile?.full_name?.trim() || null;

    const s = Array.isArray(c.students) ? c.students[0] : c.students;
    const student = s as {
      full_name?: string;
      standard?: string;
      division?: string;
      roll_number?: number;
      gr_number?: string;
      fee_concession_amount?: number | null;
    } | null;
    const studentId = (c as { student_id?: string }).student_id;
    if (!studentId) return NextResponse.json({ error: "Invalid collection" }, { status: 400 });

    let outstandingAfterPayment: number | undefined;
    let totalFees: number | undefined;
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
      totalFees = totalDues;
      const { data: paidRows } = await supabase
        .from("fee_collections")
        .select("id, amount, receipt_number, collection_date")
        .eq("student_id", studentId)
        .eq("academic_year", c.academic_year)
        .order("collection_date", { ascending: true })
        .order("receipt_number", { ascending: true });
      const currentReceipt = c.receipt_number ?? "";
      let totalPaidAsOfCollection = 0;
      for (const r of paidRows ?? []) {
        if ((r.receipt_number ?? "") <= currentReceipt) {
          totalPaidAsOfCollection += Number(r.amount);
        }
      }
      outstandingAfterPayment = Math.max(0, totalDues - totalPaidAsOfCollection);
    }

    return NextResponse.json({
      receiptNumber: c.receipt_number,
      studentName: student?.full_name ?? "—",
      amount: Number(c.amount),
      paymentMode: c.payment_mode,
      quarter: c.quarter,
      academicYear: c.academic_year,
      feeType: c.fee_type,
      collectedAt: new Date(`${c.collection_date}T12:00:00`).toISOString(),
      collectedBy: collectedByName,
      chequeNumber: c.cheque_number,
      chequeBank: c.cheque_bank,
      chequeDate: c.cheque_date,
      onlineTransactionId: c.online_transaction_id,
      onlineTransactionRef: c.online_transaction_ref,
      standard: student?.standard,
      division: student?.division,
      rollNumber: student?.roll_number,
      grNo: student?.gr_number,
      totalFees,
      outstandingAfterPayment,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
