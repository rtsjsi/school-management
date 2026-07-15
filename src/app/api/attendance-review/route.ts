import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUser, canAccessPayroll } from "@/lib/auth";
import {
  deriveDailyStatus,
  employeeShiftLite,
  computeWorkingDays,
  deriveCalendarFlags,
  isSaturdayPaidHoliday,
  isSundayWeekOff,
  addCalendarDays,
  computePayablePresentDays,
  type PunchLite,
} from "@/lib/attendance";

function monthYearOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** Neighbors needed for Fri/Mon sandwich edges (Friday before a Mon-1st, Monday after a Fri month-end). */
function monthNeighborRange(start: string, end: string) {
  return {
    rangeStart: addCalendarDays(start, -3),
    rangeEnd: addCalendarDays(end, 3),
  };
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
    const { rangeStart, rangeEnd } = monthNeighborRange(start, end);

    const supabase = await createClient();

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, shift_start_time, shift_end_time, biometric_enroll_no")
      .eq("status", "active")
      .order("full_name");

    const { data: holidays } = await supabase
      .from("holidays")
      .select("date")
      .gte("date", rangeStart)
      .lte("date", rangeEnd);
    const holidayDates = new Set((holidays ?? []).map((h) => h.date));

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const { data: punches } = await admin
      .from("biometric_attendance_raw")
      .select("enroll_no, punched_at, direction")
      .gte("punched_at", `${rangeStart}T00:00:00Z`)
      .lte("punched_at", `${rangeEnd}T23:59:59Z`);

    const adjacentMonths = Array.from(
      new Set([monthYearOf(rangeStart), monthYear, monthYearOf(rangeEnd)])
    );

    const { data: finalizedData } = await supabase
      .from("employee_attendance_finalized")
      .select("employee_id, attendance_date, status, is_manual_override, is_late, month_year")
      .in("month_year", adjacentMonths);

    const isApproved = (finalizedData ?? [])
      .filter((f) => f.month_year === monthYear)
      .some((f) => !f.is_manual_override);

    /** Prefer stored finalized rows (incl. adjacent months) so sandwich edges see locked Saturdays. */
    const finalizedByKey = new Map<
      string,
      { status: string; isManual: boolean; isLate: boolean; monthYear: string }
    >();
    (finalizedData ?? []).forEach((f) => {
      finalizedByKey.set(`${f.employee_id}-${f.attendance_date}`, {
        status: f.status,
        isManual: !!f.is_manual_override,
        isLate: !!f.is_late,
        monthYear: f.month_year,
      });
    });

    const workingDays = computeWorkingDays(y, m, lastDay, holidayDates);

    const dailyData: Record<
      string,
      {
        empId: string;
        empName: string;
        date: string;
        status: string;
        source: string;
        isManual: boolean;
        isLate: boolean;
      }[]
    > = {};

    const employeePayable: Record<
      string,
      {
        attendanceDays: number;
        sandwichDeduction: number;
        lateInCount: number;
        lateInDeduction: number;
        presentDays: number;
      }
    > = {};

    for (const emp of employees ?? []) {
      const shift = employeeShiftLite(emp);
      const statusByDate = new Map<string, string>();
      const lateByDate = new Map<string, boolean>();

      for (
        let cur = new Date(`${rangeStart}T12:00:00`);
        cur <= new Date(`${rangeEnd}T12:00:00`);
        cur.setDate(cur.getDate() + 1)
      ) {
        const dStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        const isCalendarHoliday = holidayDates.has(dStr);
        const { isHoliday, isWeekOff } = deriveCalendarFlags(dStr, holidayDates);
        const stored = finalizedByKey.get(`${emp.id}-${dStr}`);

        let status: string;
        let source = "default";
        let isManual = false;
        let isLate = false;

        // Outside the review month: prefer finalized neighbor status for sandwich calc.
        // Inside review month: if month is approved use finalized; else derive (+ merge manuals).
        const useStored =
          !!stored &&
          (dStr < start || dStr > end || isApproved || stored.isManual);

        if (useStored && stored) {
          status = stored.status;
          isLate = stored.isLate;
          isManual = stored.isManual;
          source = stored.isManual ? "manual" : "finalized";
        } else if (emp.biometric_enroll_no) {
          const dayPunches: PunchLite[] = (punches ?? [])
            .filter((p) => p.enroll_no === emp.biometric_enroll_no && p.punched_at.startsWith(dStr))
            .map((p) => ({ punch_type: p.direction, punch_time: p.punched_at }));

          const derived = deriveDailyStatus(dayPunches, shift, undefined, isHoliday, isWeekOff);
          status = derived.status;
          isLate = derived.is_late;
          source = dayPunches.length > 0 ? "biometric" : "default";
        } else {
          const derived = deriveDailyStatus([], shift, undefined, isHoliday, isWeekOff);
          status = derived.status;
        }

        if (source !== "biometric" && source !== "manual" && source !== "finalized") {
          if (isCalendarHoliday || isSaturdayPaidHoliday(dStr)) source = "holiday";
          else if (isSundayWeekOff(dStr)) source = "weekend";
        }

        // Manual override for in-month editable cells when not locked.
        if (!isApproved && stored?.isManual && dStr >= start && dStr <= end) {
          status = stored.status;
          source = "manual";
          isManual = true;
        }

        statusByDate.set(dStr, status);
        if (dStr >= start && dStr <= end) lateByDate.set(dStr, isLate);

        if (dStr >= start && dStr <= end) {
          if (!dailyData[dStr]) dailyData[dStr] = [];
          dailyData[dStr].push({
            empId: emp.id,
            empName: emp.full_name,
            date: dStr,
            status,
            source,
            isManual,
            isLate,
          });
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

      employeePayable[emp.id] = {
        attendanceDays: payable.attendanceDays,
        sandwichDeduction: payable.sandwichDeduction,
        lateInCount: payable.lateInCount,
        lateInDeduction: payable.lateInDeduction,
        presentDays: payable.payableDays,
      };
    }

    // Stable day order for the grid
    const orderedDaily = Object.keys(dailyData)
      .sort()
      .map((date) => ({ date, rows: dailyData[date] }));

    return NextResponse.json({
      monthYear,
      workingDays,
      isApproved,
      currentUserRole: user.role,
      employees: (employees ?? []).map((e) => ({
        id: e.id,
        full_name: e.full_name,
        presentDays: employeePayable[e.id]?.presentDays ?? 0,
        attendanceDays: employeePayable[e.id]?.attendanceDays ?? 0,
        sandwichDeduction: employeePayable[e.id]?.sandwichDeduction ?? 0,
        lateInCount: employeePayable[e.id]?.lateInCount ?? 0,
        lateInDeduction: employeePayable[e.id]?.lateInDeduction ?? 0,
      })),
      dailyData: orderedDaily,
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

    if (!canAccessPayroll(user)) {
      return NextResponse.json({ error: "You do not have permission to modify attendance records." }, { status: 403 });
    }

    const body = await request.json();
    const { action, monthYear, updates } = body as {
      action: "save" | "finalize" | "unfreeze";
      monthYear?: string;
      updates?: { employee_id: string; attendance_date: string; status: string }[];
    };

    if (!monthYear) {
      return NextResponse.json({ error: "monthYear required" }, { status: 400 });
    }

    const supabase = await createClient();

    if (action === "save" && Array.isArray(updates)) {
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
      const [y, m] = monthYear.split("-");
      const start = `${y}-${m}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      const { rangeStart, rangeEnd } = monthNeighborRange(start, end);

      const { data: employees } = await supabase
        .from("employees")
        .select("id, shift_start_time, shift_end_time, biometric_enroll_no")
        .eq("status", "active");
      const { data: holidays } = await supabase
        .from("holidays")
        .select("date")
        .gte("date", rangeStart)
        .lte("date", rangeEnd);
      const holidayDates = new Set((holidays ?? []).map((h) => h.date));

      const admin = createAdminClient();
      const { data: punches } = await admin!
        .from("biometric_attendance_raw")
        .select("enroll_no, punched_at, direction")
        .gte("punched_at", `${rangeStart}T00:00:00Z`)
        .lte("punched_at", `${rangeEnd}T23:59:59Z`);

      const adjacentMonths = Array.from(
        new Set([monthYearOf(rangeStart), monthYear, monthYearOf(rangeEnd)])
      );

      const { data: overrides } = await supabase
        .from("employee_attendance_finalized")
        .select("employee_id, attendance_date, status")
        .in("month_year", adjacentMonths)
        .eq("is_manual_override", true);
      const manualOverrides = new Map<string, string>();
      (overrides ?? []).forEach((f) =>
        manualOverrides.set(`${f.employee_id}-${f.attendance_date}`, f.status)
      );

      const rowsToInsert = [];

      for (const emp of employees ?? []) {
        const shift = employeeShiftLite(emp);

        for (let d = 1; d <= lastDay; d++) {
          const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
          const { isHoliday, isWeekOff } = deriveCalendarFlags(dStr, holidayDates);

          let status: string;
          let isLate = false;

          if (emp.biometric_enroll_no) {
            const dayPunches: PunchLite[] = (punches ?? [])
              .filter((p) => p.enroll_no === emp.biometric_enroll_no && p.punched_at.startsWith(dStr))
              .map((p) => ({ punch_type: p.direction, punch_time: p.punched_at }));

            const derived = deriveDailyStatus(dayPunches, shift, undefined, isHoliday, isWeekOff);
            status = derived.status;
            isLate = derived.is_late;
          } else {
            const derived = deriveDailyStatus([], shift, undefined, isHoliday, isWeekOff);
            status = derived.status;
          }

          const overrideStatus = manualOverrides.get(`${emp.id}-${dStr}`);
          const isManual = !!overrideStatus;
          if (overrideStatus) {
            status = overrideStatus;
          }

          rowsToInsert.push({
            employee_id: emp.id,
            attendance_date: dStr,
            month_year: monthYear,
            status,
            is_late: isLate,
            is_manual_override: isManual,
            updated_at: new Date().toISOString(),
          });
        }
      }

      const { error } = await supabase
        .from("employee_attendance_finalized")
        .upsert(rowsToInsert, { onConflict: "employee_id,attendance_date" });
      if (error) {
        console.error("Upsert error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

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

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
