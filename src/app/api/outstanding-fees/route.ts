import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYearName } from "@/lib/enrollment";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get("academicYear");
    const quarter = searchParams.get("quarter");
    const grade = searchParams.get("grade");
    const division = searchParams.get("division");
    const studentId = searchParams.get("studentId");

    const supabase = await createClient();

    // Default to current (active) academic year if not provided
    const activeName = await getActiveAcademicYearName();
    const fallback = `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
    const ay = academicYear ?? activeName ?? fallback;

    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, standard, division, roll_number, student_id")
      .eq("status", "active")
      .order("full_name");

    const { data: structures } = await supabase
      .from("fee_structures")
      .select(`
        id,
        standards(name),
        fee_structure_items(fee_type, quarter, amount)
      `)
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

    const defaulters: {
      student_id: string;
      full_name: string;
      grade: string;
      division: string;
      roll_number?: number;
      student_id_display?: string;
      quarter: number;
      fee_type: string;
      total: number;
      paid: number;
      outstanding: number;
    }[] = [];

    for (const s of students ?? []) {
      if ((s as { is_rte_quota?: boolean }).is_rte_quota) continue;

      if (studentId && s.id !== studentId) continue;
      if (standard && (s.standard ?? "") !== standard) continue;
      if (division && (s.division ?? "") !== division) continue;

      const studentStandard = s.standard ?? "";
      const structure = (structures ?? []).find((st: { standards?: { name?: string } | { name?: string }[] | null }) => {
        const std = Array.isArray(st.standards)
          ? (st.standards[0] as { name?: string })?.name
          : (st.standards as { name?: string } | null)?.name;
        return std && std === studentGrade;
      });
      if (!structure) continue;

      const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
      for (const item of items) {
        if (quarter && item.quarter !== parseInt(quarter)) continue;

        const total = Number(item.amount);
        const key = `${s.id}-${item.quarter}-${item.fee_type}`;
        const paid = paidMap.get(key) ?? 0;
        const outstanding = total - paid;
        if (outstanding > 0) {
          defaulters.push({
            student_id: s.id,
            full_name: s.full_name,
            standard: s.standard ?? "—",
            division: s.division ?? "",
            roll_number: (s as { roll_number?: number }).roll_number,
            student_id_display: (s as { student_id?: string }).student_id,
            quarter: item.quarter,
            fee_type: item.fee_type,
            total,
            paid,
            outstanding,
          });
        }
      }
    }

    defaulters.sort((a, b) => {
      const nameCmp = a.full_name.localeCompare(b.full_name);
      if (nameCmp !== 0) return nameCmp;
      const standardCmp = (a.standard ?? "").localeCompare(b.standard ?? "");
      if (standardCmp !== 0) return standardCmp;
      return a.quarter - b.quarter;
    });

    const totalOutstanding = defaulters.reduce((sum, d) => sum + d.outstanding, 0);
    const studentCount = new Set(defaulters.map((d) => d.student_id)).size;

    return NextResponse.json({
      data: defaulters,
      summary: {
        totalOutstanding,
        defaulterCount: defaulters.length,
        studentCount,
      },
    });
  } catch {
    return NextResponse.json({ data: [], summary: { totalOutstanding: 0, defaulterCount: 0, studentCount: 0 } });
  }
}
