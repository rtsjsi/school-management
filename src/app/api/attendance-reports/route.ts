import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, biometric_enroll_no")
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

      const { data: punches } = await admin
        .from("biometric_attendance_raw")
        .select("enroll_no, punched_at, direction")
        .gte("punched_at", `${start}T00:00:00Z`)
        .lte("punched_at", `${end}T23:59:59Z`);

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
        let presentDaysCount = 0;

        for (let d = 1; d <= lastDay; d++) {
          const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
          const day = new Date(dStr).getDay();
          const isWeekend = day === 0 || day === 6;
          const isHoliday = holidayDates.has(dStr);
          if (isHoliday || isWeekend) continue;

          if (emp.biometric_enroll_no) {
            const dayPunches = (punches ?? []).filter((p) => {
              if (p.enroll_no !== emp.biometric_enroll_no) return false;
              return p.punched_at.startsWith(dStr);
            });
            
            if (dayPunches.length > 0) {
              const hasInPunch = dayPunches.some(p => p.direction === 'IN' || !p.direction);
              if (hasInPunch || dayPunches.length > 0) {
                presentDaysCount += 1;
              }
            }
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
      const { data: holidays } = await supabase.from("holidays").select("date").eq("date", date);
      const isHoliday = (holidays ?? []).length > 0;
      const day = new Date(date).getDay();
      const isWeekend = day === 0 || day === 6;

      if (isHoliday || isWeekend) {
        return NextResponse.json({ data: [] });
      }

      const { data: punches } = await admin
        .from("biometric_attendance_raw")
        .select("enroll_no, punched_at, direction")
        .gte("punched_at", `${date}T00:00:00Z`)
        .lte("punched_at", `${date}T23:59:59Z`);

      const presentIds = new Set<string>();

      empList.forEach((emp) => {
        if (!emp.biometric_enroll_no) return;
        const dayPunches = (punches ?? []).filter((p) => {
          if (p.enroll_no !== emp.biometric_enroll_no) return false;
          return p.punched_at.startsWith(date);
        });
        
        if (dayPunches.length > 0) {
          const hasInPunch = dayPunches.some(p => p.direction === 'IN' || !p.direction);
          if (hasInPunch || dayPunches.length > 0) {
            presentIds.add(emp.id);
          }
        }
      });

      if (type === "late" || type === "early") {
        // Late and early concepts are disabled since we don't process exact times against shift configurations strictly right now
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
