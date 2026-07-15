import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { dayWeight, computeWorkingDays, isPayableWorkingDay, addCalendarDays, applySaturdayLwpRule } from "@/lib/attendance";

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
      const rangeStart = addCalendarDays(start, -1);
      const rangeEnd = addCalendarDays(end, 2);
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
        .select("employee_id, attendance_date, status, is_manual_override, month_year")
        .in("month_year", adjacentMonths);

      const monthFinalized = (finalized ?? []).filter((f) => f.month_year === month);
      if (monthFinalized.length === 0) {
        return NextResponse.json({ error: "Attendance for this month must be Finalized on the Review screen before viewing reports." }, { status: 400 });
      }

      const result = empList.map((emp) => {
        const statusByDate = new Map<string, string>();
        const manualDates = new Set<string>();
        for (const f of finalized ?? []) {
          if (f.employee_id !== emp.id) continue;
          statusByDate.set(f.attendance_date, f.status);
          if (f.is_manual_override && f.attendance_date >= start && f.attendance_date <= end) {
            manualDates.add(f.attendance_date);
          }
        }
        const withLwp = applySaturdayLwpRule(statusByDate, holidayDates, start, end, manualDates);

        let presentWeight = 0;
        for (let d = 1; d <= lastDay; d++) {
          const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
          if (!isPayableWorkingDay(dStr, holidayDates)) continue;
          // present=1, half_day=0.5, holiday/week_off/casual_leave=1, leave_without_pay/absent=0
          presentWeight += dayWeight(withLwp.get(dStr));
        }

        const present = presentWeight;
        const absent = Math.max(0, workingDays - present);
        const pct = workingDays > 0 ? (present / workingDays) * 100 : 0;
        return {
          employee_name: emp.full_name,
          present,
          absent,
          percentage: pct,
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
