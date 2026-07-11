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

    // Fetch manual overrides and finalized state
    const { data: finalizedData } = await supabase
      .from("employee_attendance_finalized")
      .select("employee_id, attendance_date, status, is_manual_override")
      .eq("month_year", monthYear);

    // Is the month fully finalized? (Check if we have a lot of rows, or we can just rely on the UI)
    // If there's at least one non-manual row, it means it was finalized.
    const isApproved = (finalizedData ?? []).some(f => !f.is_manual_override);

    const manualOverrides = new Map<string, string>();
    (finalizedData ?? []).filter(f => f.is_manual_override).forEach(f => {
      manualOverrides.set(`${f.employee_id}-${f.attendance_date}`, f.status);
    });

    const workingDays = (() => {
      let count = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(dStr).getDay();
        if (day !== 0 && day !== 6 && !holidayDates.has(dStr)) count++;
      }
      return count;
    })();

    const dailyData: Record<string, { empId: string; empName: string; date: string; status: string; source: string; isManual: boolean }[]> = {};

    for (const emp of employees ?? []) {
      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(dStr).getDay();
        const isWeekend = day === 0 || day === 6;
        const isHoliday = holidayDates.has(dStr);

        let status = "absent";
        let source = "default";
        let isManual = false;

        // 1. Base derivation from biometric
        if (emp.biometric_enroll_no) {
          const dayPunches = (punches ?? []).filter((p) => {
            if (p.enroll_no !== emp.biometric_enroll_no) return false;
            return p.punched_at.startsWith(dStr);
          });
          
          if (dayPunches.length > 0) {
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

        // 2. Overlay manual overrides
        const overrideStatus = manualOverrides.get(`${emp.id}-${dStr}`);
        if (overrideStatus) {
          status = overrideStatus;
          source = "manual";
          isManual = true;
        }

        if (!dailyData[dStr]) dailyData[dStr] = [];
        dailyData[dStr].push({
          empId: emp.id,
          empName: emp.full_name,
          date: dStr,
          status,
          source,
          isManual,
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
      isApproved,
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
  try {
    const body = await request.json();
    const { action, monthYear, updates } = body as {
      action: "save" | "finalize";
      monthYear?: string;
      updates?: { employee_id: string; attendance_date: string; status: string; }[];
    };

    if (!monthYear) {
      return NextResponse.json({ error: "monthYear required" }, { status: 400 });
    }

    const supabase = await createClient();
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (action === "save" && Array.isArray(updates)) {
      // Upsert manual overrides
      for (const u of updates) {
        await supabase.from("employee_attendance_finalized").upsert(
          {
            employee_id: u.employee_id,
            attendance_date: u.attendance_date,
            month_year: monthYear,
            status: u.status,
            is_manual_override: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "employee_id,attendance_date" }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "finalize") {
      // Re-run the full derivation (like GET) but save EVERYTHING to DB
      const [y, m] = monthYear.split("-");
      const start = `${y}-${m}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

      const { data: employees } = await supabase.from("employees").select("id, biometric_enroll_no").eq("status", "active");
      const { data: holidays } = await supabase.from("holidays").select("date").gte("date", start).lte("date", end);
      const holidayDates = new Set((holidays ?? []).map((h) => h.date));

      const admin = createAdminClient();
      const { data: punches } = await admin!.from("biometric_attendance_raw").select("enroll_no, punched_at, direction").gte("punched_at", `${start}T00:00:00Z`).lte("punched_at", `${end}T23:59:59Z`);

      const { data: overrides } = await supabase.from("employee_attendance_finalized").select("employee_id, attendance_date, status").eq("month_year", monthYear).eq("is_manual_override", true);
      const manualOverrides = new Map<string, string>();
      (overrides ?? []).forEach(f => manualOverrides.set(`${f.employee_id}-${f.attendance_date}`, f.status));

      const rowsToInsert = [];

      for (const emp of employees ?? []) {
        for (let d = 1; d <= lastDay; d++) {
          const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
          const day = new Date(dStr).getDay();
          const isWeekend = day === 0 || day === 6;
          const isHoliday = holidayDates.has(dStr);

          let status = "absent";
          let isManual = false;

          if (emp.biometric_enroll_no) {
            const dayPunches = (punches ?? []).filter((p) => p.enroll_no === emp.biometric_enroll_no && p.punched_at.startsWith(dStr));
            if (dayPunches.length > 0) {
              const hasInPunch = dayPunches.some(p => p.direction === 'IN' || !p.direction);
              if (hasInPunch || dayPunches.length > 0) status = "present";
            }
          }
          if (status === "absent") {
            if (isHoliday) status = "holiday";
            else if (isWeekend) status = "week_off";
          }

          const overrideStatus = manualOverrides.get(`${emp.id}-${dStr}`);
          if (overrideStatus) {
            status = overrideStatus;
            isManual = true;
          }

          rowsToInsert.push({
            employee_id: emp.id,
            attendance_date: dStr,
            month_year: monthYear,
            status,
            is_manual_override: isManual,
            updated_at: new Date().toISOString(),
          });
        }
      }

      const { error } = await supabase.from("employee_attendance_finalized").upsert(rowsToInsert, { onConflict: "employee_id,attendance_date" });
      if (error) {
        console.error("Upsert error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
