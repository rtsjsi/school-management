import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYearName } from "@/lib/enrollment";
import { linesWithNetAfterConcession } from "@/lib/fee-concession";
import { getUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get("academicYear");
    const quarter = searchParams.get("quarter");
    const standard = searchParams.get("standard");
    const studentId = searchParams.get("studentId");

    const supabase = await createClient();

    const defaultAy = await getActiveAcademicYearName();
    const currentYear = new Date().getFullYear();
    const fallbackAy = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    const ay = academicYear?.trim() || defaultAy || fallbackAy;

    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, standard, division, roll_number, gr_number, is_rte_quota, fee_concession_amount")
      .eq("status", "active");

    const { data: structures } = await supabase
      .from("fee_structures")
      .select("id, standards(name), fee_structure_items(fee_type, quarter, amount)")
      .eq("academic_year", ay);

    const { data: collections } = await supabase
      .from("fee_collections")
      .select("student_id, quarter, fee_type, amount")
      .eq("academic_year", ay);

    const paidMap = new Map<string, number>();
    (collections ?? []).forEach((c) => {
      const key = `${c.student_id}-${c.quarter}-${c.fee_type}`;
      paidMap.set(key, (paidMap.get(key) ?? 0) + Number(c.amount));
    });

    type Defaulter = {
      student_id: string;
      full_name: string;
      standard: string;
      division: string;
      roll_number?: number;
      gr_number?: string;
      quarter: number;
      quarter_label?: string;
      fee_type: string;
      total: number;
      paid: number;
      outstanding: number;
    };

    const defaulters: Defaulter[] = [];
    let summaryTotalFees = 0;
    let summaryTotalPaid = 0;
    const studentsWithDues = new Set<string>();

    for (const s of students ?? []) {
      if ((s as { is_rte_quota?: boolean }).is_rte_quota) continue;
      if (studentId && s.id !== studentId) continue;

      const studentStandard = s.standard ?? "";
      if (standard && studentStandard !== standard) continue;

      const structure = (structures ?? []).find((st: { standards?: { name?: string } | { name?: string }[] | null }) => {
        const std = Array.isArray(st.standards)
          ? (st.standards[0] as { name?: string })?.name
          : (st.standards as { name?: string } | null)?.name;
        return std && std === studentStandard;
      });
      if (!structure) continue;

      const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
      const lines = linesWithNetAfterConcession(
        items,
        (s as { fee_concession_amount?: number | null }).fee_concession_amount
      );
      const quarterFilter = quarter ? parseInt(quarter) : null;

      if (quarterFilter) {
        const byFeeType: Record<string, { total: number; paid: number }> = {};
        for (let q = 1; q <= quarterFilter; q++) {
          for (const line of lines) {
            if (line.quarter !== q) continue;
            const ft = line.fee_type;
            if (!byFeeType[ft]) byFeeType[ft] = { total: 0, paid: 0 };
            const total = line.net;
            const key = `${s.id}-${q}-${ft}`;
            const paid = paidMap.get(key) ?? 0;
            byFeeType[ft].total += total;
            byFeeType[ft].paid += paid;
          }
        }
        for (const [ft, v] of Object.entries(byFeeType)) {
          summaryTotalFees += v.total;
          summaryTotalPaid += v.paid;
          const outstandingTill = v.total - v.paid;
          if (outstandingTill > 0) {
            studentsWithDues.add(s.id);
            defaulters.push({
              student_id: s.id,
              full_name: s.full_name ?? "—",
              standard: studentStandard || "—",
              division: s.division ?? "",
              roll_number: s.roll_number,
              gr_number: (s as { gr_number?: string }).gr_number,
              quarter: quarterFilter,
              quarter_label: `Till Q${quarterFilter}`,
              fee_type: ft,
              total: v.total,
              paid: v.paid,
              outstanding: outstandingTill,
            });
          }
        }
      } else {
        for (const line of lines) {
          const total = line.net;
          const key = `${s.id}-${line.quarter}-${line.fee_type}`;
          const paid = paidMap.get(key) ?? 0;
          summaryTotalFees += total;
          summaryTotalPaid += paid;
          const outstanding = total - paid;
          if (outstanding > 0) {
            studentsWithDues.add(s.id);
            defaulters.push({
              student_id: s.id,
              full_name: s.full_name ?? "—",
              standard: studentStandard || "—",
              division: s.division ?? "",
              roll_number: s.roll_number,
              gr_number: (s as { gr_number?: string }).gr_number,
              quarter: line.quarter,
              quarter_label: `Q${line.quarter}`,
              fee_type: line.fee_type,
              total,
              paid,
              outstanding,
            });
          }
        }
      }
    }

    defaulters.sort((a, b) =>
      a.full_name.localeCompare(b.full_name) || a.quarter - b.quarter || a.standard.localeCompare(b.standard)
    );

    return NextResponse.json({
      data: defaulters,
      academicYear: ay,
      summary: {
        totalStudents: studentsWithDues.size,
        totalOutstanding: summaryTotalFees - summaryTotalPaid,
        totalFees: summaryTotalFees,
        totalPaid: summaryTotalPaid,
      },
    });
  } catch {
    return NextResponse.json({
      data: [],
      academicYear: "",
      summary: { totalStudents: 0, totalOutstanding: 0, totalFees: 0, totalPaid: 0 },
    });
  }
}
