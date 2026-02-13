import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
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
        .from("attendance_manual")
        .select("employee_id, attendance_date, status")
        .gte("attendance_date", start)
        .lte("attendance_date", end);

      const { data: punches } = await supabase
        .from("attendance_punches")
        .select("employee_id, punch_date, punch_type, is_late, is_early_departure")
        .gte("punch_date", start)
        .lte("punch_date", end);

      const workingDays = (() => {
        let count = 0;
        for (let d = 1; d <= lastDay; d++) {
          const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
          const day = new Date(dStr).getDay();
          if (day !== 0 && day !== 6 && !holidayDates.has(dStr)) count++;
        }
        return count;
      })();

      const result = empList.map((emp) => {
        const manEntries = (manual ?? []).filter((m) => m.employee_id === emp.id);
        const punchEntries = (punches ?? []).filter((p) => p.employee_id === emp.id);
        const presentDays = new Set<string>();
        manEntries.forEach((m) => {
          if (m.status === "present" || m.status === "half_day") presentDays.add(m.attendance_date);
        });
        const punchInDays = new Set<string>();
        punchEntries.forEach((p) => {
          if (p.punch_type === "IN") punchInDays.add(p.punch_date);
        });
        punchInDays.forEach((d) => presentDays.add(d));
        const present = presentDays.size;
        const absent = Math.max(0, workingDays - present);
        const lateCount = punchEntries.filter((p) => p.punch_type === "IN" && p.is_late).length;
        const earlyCount = punchEntries.filter((p) => p.punch_type === "OUT" && p.is_early_departure).length;
        const pct = workingDays > 0 ? (present / workingDays) * 100 : 0;
        return {
          employee_name: emp.full_name,
          present,
          absent,
          percentage: pct,
          late_count: lateCount,
          early_count: earlyCount,
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
        .from("attendance_manual")
        .select("employee_id, status, employees(full_name)")
        .eq("attendance_date", date);

      const { data: punches } = await supabase
        .from("attendance_punches")
        .select("employee_id, punch_type, is_late, is_early_departure, employees(full_name)")
        .eq("punch_date", date);

      const presentIds = new Set<string>();
      (manual ?? []).forEach((m) => {
        if (m.status === "present" || m.status === "half_day") presentIds.add(m.employee_id);
      });
      (punches ?? []).forEach((p) => {
        if (p.punch_type === "IN") presentIds.add(p.employee_id);
      });

      if (type === "late") {
        const late = (punches ?? []).filter((p) => p.punch_type === "IN" && p.is_late);
        const result = late.map((p) => ({
          employee_name: Array.isArray(p.employees) ? (p.employees[0] as { full_name?: string })?.full_name : (p.employees as { full_name?: string } | null)?.full_name,
          present: 1,
          absent: 0,
          percentage: 100,
          late_count: 1,
          early_count: 0,
        }));
        return NextResponse.json({ data: result });
      }

      if (type === "early") {
        const early = (punches ?? []).filter((p) => p.punch_type === "OUT" && p.is_early_departure);
        const result = early.map((p) => ({
          employee_name: Array.isArray(p.employees) ? (p.employees[0] as { full_name?: string })?.full_name : (p.employees as { full_name?: string } | null)?.full_name,
          present: 1,
          absent: 0,
          percentage: 100,
          late_count: 0,
          early_count: 1,
        }));
        return NextResponse.json({ data: result });
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
