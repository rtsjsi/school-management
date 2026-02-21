import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYearName } from "@/lib/enrollment";

function isGradeInRange(grade: string, from: string, to: string): boolean {
  const GRADE_ORDER: Record<string, number> = {
    "Jr KG": 0, "Sr KG": 1, "1": 2, "2": 3, "3": 4, "4": 5, "5": 6,
    "6": 7, "7": 8, "8": 9, "9": 10, "10": 11, "11": 12, "12": 13,
  };
  const g = GRADE_ORDER[grade] ?? -1;
  const f = GRADE_ORDER[from] ?? -1;
  const t = GRADE_ORDER[to] ?? -1;
  if (g < 0 || f < 0 || t < 0) return false;
  return g >= f && g <= t;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get("academicYear");
    const quarter = searchParams.get("quarter");
    const grade = searchParams.get("grade");
    const studentId = searchParams.get("studentId");

    const supabase = await createClient();

    const defaultAy = await getActiveAcademicYearName();
    const currentYear = new Date().getFullYear();
    const fallbackAy = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    const ay = academicYear?.trim() || defaultAy || fallbackAy;

    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, grade, division, roll_number, student_id")
      .eq("status", "active");

    const { data: structures } = await supabase
      .from("fee_structures")
      .select("id, grade_from, grade_to, fee_structure_items(fee_type, quarter, amount)")
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
      grade: string;
      division: string;
      roll_number?: number;
      student_id_display?: string;
      quarter: number;
      quarter_label?: string;
      fee_type: string;
      total: number;
      paid: number;
      outstanding: number;
    };

    const defaulters: Defaulter[] = [];

    for (const s of students ?? []) {
      if ((s as { is_rte_quota?: boolean }).is_rte_quota) continue;
      if (studentId && s.id !== studentId) continue;

      const studentGrade = s.grade ?? "";
      if (grade && studentGrade !== grade) continue;

      const structure = (structures ?? []).find((st) =>
        isGradeInRange(studentGrade, st.grade_from, st.grade_to)
      );
      if (!structure) continue;

      const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
      const quarterFilter = quarter ? parseInt(quarter) : null;

      if (quarterFilter) {
        // Till-quarter: cumulative outstanding from Q1 through selected quarter, per fee_type
        const byFeeType: Record<string, { total: number; paid: number }> = {};
        for (let q = 1; q <= quarterFilter; q++) {
          for (const item of items) {
            if (item.quarter !== q) continue;
            const ft = item.fee_type;
            if (!byFeeType[ft]) byFeeType[ft] = { total: 0, paid: 0 };
            const total = Number(item.amount);
            const key = `${s.id}-${q}-${ft}`;
            const paid = paidMap.get(key) ?? 0;
            byFeeType[ft].total += total;
            byFeeType[ft].paid += paid;
          }
        }
        for (const [ft, v] of Object.entries(byFeeType)) {
          const outstandingTill = v.total - v.paid;
          if (outstandingTill > 0) {
            defaulters.push({
              student_id: s.id,
              full_name: s.full_name ?? "—",
              grade: studentGrade || "—",
              division: s.division ?? "",
              roll_number: s.roll_number,
              student_id_display: (s as { student_id?: string }).student_id,
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
        // No quarter filter: show each quarter separately
        for (const item of items) {
          const total = Number(item.amount);
          const key = `${s.id}-${item.quarter}-${item.fee_type}`;
          const paid = paidMap.get(key) ?? 0;
          const outstanding = total - paid;
          if (outstanding > 0) {
            defaulters.push({
              student_id: s.id,
              full_name: s.full_name ?? "—",
              grade: studentGrade || "—",
              division: s.division ?? "",
              roll_number: s.roll_number,
              student_id_display: (s as { student_id?: string }).student_id,
              quarter: item.quarter,
              quarter_label: `Q${item.quarter}`,
              fee_type: item.fee_type,
              total,
              paid,
              outstanding,
            });
          }
        }
      }
    }

    defaulters.sort((a, b) =>
      a.full_name.localeCompare(b.full_name) || a.quarter - b.quarter || a.grade.localeCompare(b.grade)
    );

    const totalOutstanding = defaulters.reduce((sum, d) => sum + d.outstanding, 0);
    const studentCount = new Set(defaulters.map((d) => d.student_id)).size;

    const byGrade: Record<string, { count: number; total: number }> = {};
    for (const d of defaulters) {
      const g = d.grade || "—";
      if (!byGrade[g]) byGrade[g] = { count: 0, total: 0 };
      byGrade[g].count += 1;
      byGrade[g].total += d.outstanding;
    }

    return NextResponse.json({
      data: defaulters,
      summary: {
        totalOutstanding,
        defaulterCount: defaulters.length,
        studentCount,
        byGrade: Object.entries(byGrade).map(([g, v]) => ({ grade: g, count: v.count, total: v.total })),
      },
      academicYear: ay,
    });
  } catch {
    return NextResponse.json({
      data: [],
      summary: { totalOutstanding: 0, defaulterCount: 0, studentCount: 0, byGrade: [] },
      academicYear: "",
    });
  }
}
