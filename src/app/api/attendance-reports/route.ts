import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

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

      const { data: manual } = await supabase
        .from("employee_attendance_daily")
        .select("employee_id, attendance_date, status")
        .gte("attendance_date", start)
        .lte("attendance_date", end);


      const result = empList.map((emp) => {
        const manEntries = (manual ?? []).filter((m) => m.employee_id === emp.id);
        const presentDays = new Set<string>();
        manEntries.forEach((m) => {
          if (m.status === "present" || m.status === "half_day") presentDays.add(m.attendance_date);
        });
        const present = presentDays.size;
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
      const { data: holidays } = await supabase.from("holidays").select("date").eq("date", date);
      const isHoliday = (holidays ?? []).length > 0;
      const day = new Date(date).getDay();
      const isWeekend = day === 0 || day === 6;

      if (isHoliday || isWeekend) {
        return NextResponse.json({ data: [] });
      }

      const { data: manual } = await supabase
        .from("employee_attendance_daily")
        .select("employee_id, status, employees(full_name)")
        .eq("attendance_date", date);

      const presentIds = new Set<string>();
      (manual ?? []).forEach((m) => {
        if (m.status === "present" || m.status === "half_day") presentIds.add(m.employee_id);
      });

      if (type === "late" || type === "early") {
        // No punch-based late/early data available without employee_attendance_punches
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
  } catch {
    return NextResponse.json({ data: [] });
  }
}
