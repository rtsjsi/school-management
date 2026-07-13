import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser, canAccessPayroll } from "@/lib/auth";
import {
  deriveDailyStatus,
  employeeShiftLite,
  dayWeight,
  computeWorkingDays,
  type PunchLite,
} from "@/lib/attendance";

async function recalculateLeaveBalances(supabase: any, empIds: string[], monthYear: string) {
  if (empIds.length === 0) return;
  const [y, m] = monthYear.split("-").map(Number);
  const academicYear = m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  const start = `${academicYear.split("-")[0]}-04-01`;
  const end = `${academicYear.split("-")[1]}-03-31`;

  for (const empId of empIds) {
    const { data: leaves } = await supabase
      .from("employee_attendance_finalized")
      .select("attendance_date")
      .eq("employee_id", empId)
      .eq("status", "casual_leave")
      .gte("attendance_date", start)
      .lte("attendance_date", end);
    const usedDays = (leaves ?? []).length;
    
    // Only update if the row exists, or insert with default 5 if it doesn't
    const { data: existing } = await supabase
      .from("employee_leave_balances")
      .select("allocated_days")
      .eq("employee_id", empId)
      .eq("academic_year", academicYear)
      .eq("leave_type", "casual_leave")
      .single();

    const allocated = existing?.allocated_days ?? 5; // Default to 5

    await supabase.from("employee_leave_balances").upsert({
      employee_id: empId,
      academic_year: academicYear,
      leave_type: "casual_leave",
      allocated_days: allocated,
      used_days: usedDays
    }, { onConflict: "employee_id,academic_year,leave_type" });
  }
}

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

    // If there's at least one non-manual row, it means it was finalized.
    const isApproved = (finalizedData ?? []).some(f => !f.is_manual_override);

    const manualOverrides = new Map<string, string>();
    (finalizedData ?? []).filter(f => f.is_manual_override).forEach(f => {
      manualOverrides.set(`${f.employee_id}-${f.attendance_date}`, f.status);
    });

    const workingDays = computeWorkingDays(y, m, lastDay, holidayDates);

    const dailyData: Record<string, { empId: string; empName: string; date: string; status: string; source: string; isManual: boolean }[]> = {};

    for (const emp of employees ?? []) {
      const shift = employeeShiftLite(emp);

      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(`${dStr}T12:00:00`).getDay();
        const isWeekend = day === 0 || day === 6;
        const isHoliday = holidayDates.has(dStr);

        let status: string;
        let source = "default";
        let isManual = false;

        // 1. Derive from biometric punches using the shared function
        if (emp.biometric_enroll_no) {
          const dayPunches: PunchLite[] = (punches ?? [])
            .filter((p) => p.enroll_no === emp.biometric_enroll_no && p.punched_at.startsWith(dStr))
            .map((p) => ({ punch_type: p.direction, punch_time: p.punched_at }));

          const derived = deriveDailyStatus(dayPunches, shift, undefined, isHoliday, isWeekend);
          status = derived.status;
          source = dayPunches.length > 0 ? "biometric" : "default";
        } else {
          // No biometric enrollment — use deriveDailyStatus with empty punches for holiday/weekend detection
          const derived = deriveDailyStatus([], shift, undefined, isHoliday, isWeekend);
          status = derived.status;
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

    // Use dayWeight for present-day counts (half_day = 0.5, not 1.0)
    const presentCounts: Record<string, number> = {};
    (employees ?? []).forEach((e) => {
      presentCounts[e.id] = 0;
    });
    Object.values(dailyData).forEach((dayRows) => {
      dayRows.forEach((r) => {
        const dStr = r.date;
        const day = new Date(`${dStr}T12:00:00`).getDay();
        const isWeekend = day === 0 || day === 6;
        const isHoliday = holidayDates.has(dStr);
        // Only count working days for present-day summary
        if (!isWeekend && !isHoliday) {
          presentCounts[r.empId] = (presentCounts[r.empId] ?? 0) + dayWeight(r.status);
        }
      });
    });

    return NextResponse.json({
      monthYear,
      workingDays,
      isApproved,
      currentUserRole: user.role,
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
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // S2: Role check — only payroll-authorized users can modify attendance
    if (!canAccessPayroll(user)) {
      return NextResponse.json({ error: "You do not have permission to modify attendance records." }, { status: 403 });
    }

    const body = await request.json();
    const { action, monthYear, updates } = body as {
      action: "save" | "finalize" | "unfreeze";
      monthYear?: string;
      updates?: { employee_id: string; attendance_date: string; status: string; }[];
    };

    if (!monthYear) {
      return NextResponse.json({ error: "monthYear required" }, { status: 400 });
    }

    const supabase = await createClient();

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
      
      const empIds = Array.from(new Set(updates.map((u: any) => u.employee_id)));
      await recalculateLeaveBalances(supabase, empIds as string[], monthYear);
      
      return NextResponse.json({ success: true });
    }

    if (action === "finalize") {
      const [y, m] = monthYear.split("-");
      const start = `${y}-${m}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

      const { data: employees } = await supabase
        .from("employees")
        .select("id, shift_start_time, shift_end_time, biometric_enroll_no")
        .eq("status", "active");
      const { data: holidays } = await supabase.from("holidays").select("date").gte("date", start).lte("date", end);
      const holidayDates = new Set((holidays ?? []).map((h) => h.date));

      const admin = createAdminClient();
      const { data: punches } = await admin!
        .from("biometric_attendance_raw")
        .select("enroll_no, punched_at, direction")
        .gte("punched_at", `${start}T00:00:00Z`)
        .lte("punched_at", `${end}T23:59:59Z`);

      const { data: overrides } = await supabase
        .from("employee_attendance_finalized")
        .select("employee_id, attendance_date, status")
        .eq("month_year", monthYear)
        .eq("is_manual_override", true);
      const manualOverrides = new Map<string, string>();
      (overrides ?? []).forEach(f => manualOverrides.set(`${f.employee_id}-${f.attendance_date}`, f.status));

      const rowsToInsert = [];

      for (const emp of employees ?? []) {
        const shift = employeeShiftLite(emp);

        for (let d = 1; d <= lastDay; d++) {
          const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
          const day = new Date(`${dStr}T12:00:00`).getDay();
          const isWeekend = day === 0 || day === 6;
          const isHoliday = holidayDates.has(dStr);

          let status: string;
          let isManual = false;

          // Use shared derivation function
          if (emp.biometric_enroll_no) {
            const dayPunches: PunchLite[] = (punches ?? [])
              .filter((p) => p.enroll_no === emp.biometric_enroll_no && p.punched_at.startsWith(dStr))
              .map((p) => ({ punch_type: p.direction, punch_time: p.punched_at }));

            const derived = deriveDailyStatus(dayPunches, shift, undefined, isHoliday, isWeekend);
            status = derived.status;
          } else {
            const derived = deriveDailyStatus([], shift, undefined, isHoliday, isWeekend);
            status = derived.status;
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

      const empIds = Array.from(new Set(rowsToInsert.map(r => r.employee_id)));
      await recalculateLeaveBalances(supabase, empIds, monthYear);

      return NextResponse.json({ success: true });
    }

    if (action === "unfreeze") {
      if (user.role !== "principal") {
        return NextResponse.json({ error: "Only Principal can unfreeze months." }, { status: 403 });
      }
      const { error } = await supabase
        .from("employee_attendance_finalized")
        .delete()
        .eq("month_year", monthYear)
        .eq("is_manual_override", false);
        
      if (error) {
        console.error("Unfreeze error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      const { data: employees } = await supabase.from("employees").select("id").eq("status", "active");
      const empIds = (employees ?? []).map((e: any) => e.id);
      await recalculateLeaveBalances(supabase, empIds, monthYear);
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
