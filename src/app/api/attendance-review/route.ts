import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const monthYear = searchParams.get("monthYear");
    if (!monthYear) {
      return NextResponse.json({ error: "monthYear required" }, { status: 400 });
    }

    const [y, m] = monthYear.split("-");
    const start = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

    const supabase = await createClient();

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, shift_start_time, shift_end_time, biometric_enroll_no")
      .eq("status", "active")
      .order("full_name");

    const { data: holidays } = await supabase
      .from("holidays")
      .select("date")
      .gte("date", start)
      .lte("date", end);
    const holidayDates = new Set((holidays ?? []).map((h) => h.date));

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Fetch all punches for the month
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

    const dailyData: Record<string, { empId: string; empName: string; date: string; status: string; in_time?: string; out_time?: string; source: string }[]> = {};

    for (const emp of employees ?? []) {
      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(dStr).getDay();
        const isWeekend = day === 0 || day === 6;
        const isHoliday = holidayDates.has(dStr);

        let status = "absent";
        let in_time: string | undefined;
        let out_time: string | undefined;
        let source = "default";

        // Check raw punches
        if (emp.biometric_enroll_no) {
          const dayPunches = (punches ?? []).filter((p) => {
            if (p.enroll_no !== emp.biometric_enroll_no) return false;
            // Compare local date portion
            const localDate = new Date(p.punched_at).toISOString().split("T")[0]; // Assuming raw data is stored as UTC and ISO gives correct day, this may need adjustment based on timezone. Let's use simple match for now or just substring.
            // Actually, a simpler way is to check if it starts with the date string if timezone allows
            return p.punched_at.startsWith(dStr);
          });
          
          if (dayPunches.length > 0) {
            // User requirement: "if one IN punch means employee present"
            const hasInPunch = dayPunches.some(p => p.direction === 'IN' || !p.direction);
            if (hasInPunch || dayPunches.length > 0) {
              status = "present";
              source = "biometric";
            }
          }
        }

        if (status === "absent") {
          if (isHoliday) {
            status = "holiday";
            source = "holiday";
          } else if (isWeekend) {
            status = "week_off";
            source = "weekend";
          }
        }

        if (!dailyData[dStr]) dailyData[dStr] = [];
        dailyData[dStr].push({
          empId: emp.id,
          empName: emp.full_name,
          date: dStr,
          status,
          in_time,
          out_time,
          source,
        });
      }
    }

    const presentCounts: Record<string, number> = {};
    (employees ?? []).forEach((e) => {
      presentCounts[e.id] = 0;
    });
    Object.values(dailyData).forEach((dayRows) => {
      dayRows.forEach((r) => {
        if (r.status === "present" || r.status === "half_day") {
          presentCounts[r.empId] = (presentCounts[r.empId] ?? 0) + 1;
        }
      });
    });

    return NextResponse.json({
      monthYear,
      workingDays,
      isApproved: false, // Legacy field
      employees: (employees ?? []).map((e) => ({
        id: e.id,
        full_name: e.full_name,
        presentDays: presentCounts[e.id] ?? 0,
      })),
      dailyData: Object.entries(dailyData).map(([date, rows]) => ({ date, rows })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Manual override table not yet implemented, returning 501
  return NextResponse.json({ error: "Manual override table not yet implemented." }, { status: 501 });
}
