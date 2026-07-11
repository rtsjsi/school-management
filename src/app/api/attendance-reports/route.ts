import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
      const end = `${y}-${m}-${lastDay}`;

      const { data: holidays } = await supabase
        .from("holidays")
        .select("date")
        .gte("date", start)
        .lte("date", end);
      const holidayDates = new Set((holidays ?? []).map((h) => h.date));

      const workingDays = (() => {
        let count = 0;
        for (let d = 1; d <= lastDay; d++) {
          const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
          const day = new Date(dStr).getDay();
          if (day !== 0 && day !== 6 && !holidayDates.has(dStr)) count++;
        }
        return count;
      })();

      const { data: finalized } = await supabase
        .from("employee_attendance_finalized")
        .select("employee_id, attendance_date, status")
        .eq("month_year", month);

      if (!finalized || finalized.length === 0) {
        return NextResponse.json({ error: "Attendance for this month must be Finalized on the Review screen before viewing reports." }, { status: 400 });
      }

      const result = empList.map((emp) => {
        const empEntries = finalized.filter((f) => f.employee_id === emp.id);
        let presentDaysCount = 0;

        for (let d = 1; d <= lastDay; d++) {
          const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
          const day = new Date(dStr).getDay();
          const isWeekend = day === 0 || day === 6;
          const isHoliday = holidayDates.has(dStr);
          if (isHoliday || isWeekend) continue;

          const entry = empEntries.find((e) => e.attendance_date === dStr);
          if (entry && (entry.status === "present" || entry.status === "half_day")) {
            // we'll count half day as full for present/absent simple count, or 0.5 if required. The existing report used integers.
            presentDaysCount += 1; 
          }
        }

        const present = presentDaysCount;
        const absent = Math.max(0, workingDays - present);
        const pct = workingDays > 0 ? (present / workingDays) * 100 : 0;
        return {
          employee_name: emp.full_name,
          present,
          absent,
          percentage: pct,
          late_count: 0,
          early_count: 0,
        };
      });
      return NextResponse.json({ data: result });
    }

    if ((type === "late" || type === "early" || type === "absent") && date) {
      const monthYear = date.substring(0, 7);
      
      const { data: finalized } = await supabase
        .from("employee_attendance_finalized")
        .select("employee_id, status")
        .eq("attendance_date", date);

      if (!finalized || finalized.length === 0) {
        return NextResponse.json({ data: [] });
      }

      const presentIds = new Set(finalized.filter((f) => f.status === "present" || f.status === "half_day").map((f) => f.employee_id));

      if (type === "late" || type === "early") {
        return NextResponse.json({ data: [] });
      }

      if (type === "absent") {
        const absentIds = empList.filter((e) => !presentIds.has(e.id)).map((e) => e.id);
        const result = absentIds.map((id) => {
          const emp = empList.find((e) => e.id === id);
          return {
            employee_name: emp?.full_name ?? "—",
            present: 0,
            absent: 1,
            percentage: 0,
            late_count: 0,
            early_count: 0,
          };
        });
        return NextResponse.json({ data: result });
      }
    }

    return NextResponse.json({ data: [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ data: [] });
  }
}
