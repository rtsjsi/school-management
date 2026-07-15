import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { computeWorkingDays, addCalendarDays, computePayablePresentDays } from "@/lib/attendance";

export const dynamic = "force-dynamic";

function monthYearOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "monthly";
    const month = searchParams.get("month");
    const date = searchParams.get("date");

    const supabase = await createClient();

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("status", "active");

    const empList = employees ?? [];

    if (type === "monthly" && month) {
      const [y, m] = month.split("-");
      const start = `${y}-${m}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      const rangeStart = addCalendarDays(start, -3);
      const rangeEnd = addCalendarDays(end, 3);
      const adjacentMonths = Array.from(
        new Set([monthYearOf(rangeStart), month, monthYearOf(rangeEnd)])
      );

      const { data: holidays } = await supabase
        .from("holidays")
        .select("date")
        .gte("date", rangeStart)
        .lte("date", rangeEnd);
      const holidayDates = new Set((holidays ?? []).map((h) => h.date));

      const workingDays = computeWorkingDays(y, m, lastDay, holidayDates);

      const { data: finalized } = await supabase
        .from("employee_attendance_finalized")
        .select("employee_id, attendance_date, status, is_late, month_year")
        .in("month_year", adjacentMonths);

      const monthFinalized = (finalized ?? []).filter((f) => f.month_year === month);
      if (monthFinalized.length === 0) {
        return NextResponse.json({ error: "Attendance for this month must be Finalized on the Review screen before viewing reports." }, { status: 400 });
      }

      const result = empList.map((emp) => {
        const statusByDate = new Map<string, string>();
        const lateByDate = new Map<string, boolean>();
        for (const f of finalized ?? []) {
          if (f.employee_id !== emp.id) continue;
          statusByDate.set(f.attendance_date, f.status);
          if (f.attendance_date >= start && f.attendance_date <= end) {
            lateByDate.set(f.attendance_date, !!f.is_late);
          }
        }

        const payable = computePayablePresentDays({
          statusByDate,
          lateByDate,
          holidayDates,
          monthStart: start,
          monthEnd: end,
          year: y,
          month: m,
          lastDay,
        });

        const present = payable.payableDays;
        const absent = Math.max(0, workingDays - present);
        const pct = workingDays > 0 ? (present / workingDays) * 100 : 0;
        return {
          employee_name: emp.full_name,
          present,
          absent,
          percentage: pct,
          attendance_days: payable.attendanceDays,
          sandwich_deduction: payable.sandwichDeduction,
          late_in_count: payable.lateInCount,
          late_in_deduction: payable.lateInDeduction,
        };
      });
      return NextResponse.json({ data: result });
    }

    if (type === "absent" && date) {
      const { data: finalized } = await supabase
        .from("employee_attendance_finalized")
        .select("employee_id, status")
        .eq("attendance_date", date);

      if (!finalized || finalized.length === 0) {
        return NextResponse.json({ data: [] });
      }

      const presentIds = new Set(finalized.filter((f) => f.status === "present" || f.status === "half_day").map((f) => f.employee_id));

      const absentIds = empList.filter((e) => !presentIds.has(e.id)).map((e) => e.id);
      const result = absentIds.map((id) => {
        const emp = empList.find((e) => e.id === id);
        return {
          employee_name: emp?.full_name ?? "—",
          present: 0,
          absent: 1,
          percentage: 0,
        };
      });
      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ data: [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ data: [] });
  }
}
