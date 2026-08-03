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
  listSandwichCharges,
  istCalendarDate,
  DEFAULT_THRESHOLDS,
  type PunchLite,
  type AttendanceThresholds,
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

async function loadAttendanceThresholds(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<AttendanceThresholds> {
  const { data } = await supabase
    .from("payroll_settings")
    .select("full_day_hours, half_day_hours, late_grace_minutes")
    .eq("id", 1)
    .maybeSingle();

  return {
    fullDayHours: Number(data?.full_day_hours ?? DEFAULT_THRESHOLDS.fullDayHours),
    halfDayHours: Number(data?.half_day_hours ?? DEFAULT_THRESHOLDS.halfDayHours),
    lateGraceMinutes: Number(
      data?.late_grace_minutes ?? DEFAULT_THRESHOLDS.lateGraceMinutes
    ),
  };
}

type RawPunchRow = { enroll_no: string; punched_at: string; direction: string };

function dayPunchesForEnroll(
  punches: RawPunchRow[] | null,
  enrollKey: string,
  dStr: string
): PunchLite[] {
  return (punches ?? [])
    .filter((p) => p.enroll_no === enrollKey && istCalendarDate(p.punched_at) === dStr)
    .map((p) => ({ punch_type: p.direction, punch_time: p.punched_at }));
}

/**
 * Supabase/PostgREST caps a single select at 1000 rows by default.
 * A payroll month + sandwich neighbors easily exceeds that, which silently
 * drops later dates (e.g. Jul 27+) and marks everyone absent despite punches.
 */
async function fetchAllRawPunches(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  rangeStart: string,
  rangeEnd: string
): Promise<RawPunchRow[]> {
  const pageSize = 1000;
  const all: RawPunchRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("biometric_attendance_raw")
      .select("enroll_no, punched_at, direction")
      .gte("punched_at", `${rangeStart}T00:00:00Z`)
      .lte("punched_at", `${rangeEnd}T23:59:59Z`)
      .order("punched_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as RawPunchRow[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
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
    const thresholds = await loadAttendanceThresholds(supabase);

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, shift_start_time, shift_end_time, biometric_enroll_no, enable_sandwich_policy, casual_leave_balance")
      .eq("status", "active")
      .eq("enable_payroll", true)
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

    const punches = await fetchAllRawPunches(admin, rangeStart, rangeEnd);

    const adjacentMonths = Array.from(
      new Set([monthYearOf(rangeStart), monthYear, monthYearOf(rangeEnd)])
    );

    const { data: finalizedData } = await supabase
      .from("employee_attendance_finalized")
      .select("employee_id, attendance_date, status, is_manual_override, is_late, month_year")
      .in("month_year", adjacentMonths);

    const { data: clUsageRows } = await supabase
      .from("employee_month_casual_leave_usage")
      .select("employee_id, days_used")
      .eq("month_year", monthYear);
    const clUsedByEmp = new Map<string, number>();
    (clUsageRows ?? []).forEach((r) => {
      clUsedByEmp.set(r.employee_id, Number(r.days_used) || 0);
    });

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
        isEarlyDeparture: boolean;
        singlePunch: boolean;
        in_time?: string;
        out_time?: string;
        workedHours: number;
        needsAttention: boolean;
        missingBioEnroll: boolean;
      }[]
    > = {};

    const employeePayable: Record<
      string,
      {
        attendanceDays: number;
        sandwichDeduction: number;
        sandwichDates: string[];
        sandwichTriggerDates: string[];
        lateInCount: number;
        lateInDeduction: number;
        casualLeaveUsed: number;
        salaryDeductionDays: number;
        presentDays: number;
        needsAttention: boolean;
        missingBioEnroll: boolean;
      }
    > = {};

    for (const emp of employees ?? []) {
      const shift = employeeShiftLite(emp);
      const missingBioEnroll = emp.biometric_enroll_no == null;
      const statusByDate = new Map<string, string>();
      const lateByDate = new Map<string, boolean>();
      let empNeedsAttention = missingBioEnroll;

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
        let isEarlyDeparture = false;
        let singlePunch = false;
        let in_time: string | undefined;
        let out_time: string | undefined;
        let workedHours = 0;

        // Outside the review month: prefer finalized neighbor status for sandwich calc.
        // Inside review month: if month is approved use finalized; else derive (+ merge manuals).
        const useStored =
          !!stored &&
          (dStr < start || dStr > end || isApproved || stored.isManual);

        let dayPunches: PunchLite[] = [];
        if (!missingBioEnroll) {
          dayPunches = dayPunchesForEnroll(
            punches,
            String(emp.biometric_enroll_no),
            dStr
          );
        }

        const derived = deriveDailyStatus(
          dayPunches,
          shift,
          thresholds,
          isHoliday,
          isWeekOff
        );
        in_time = derived.in_time;
        out_time = derived.out_time;
        workedHours = derived.worked_hours;
        singlePunch = derived.single_punch;
        isEarlyDeparture = derived.is_early_departure;

        if (useStored && stored) {
          status = stored.status;
          isLate = stored.isLate;
          isManual = stored.isManual;
          source = stored.isManual ? "manual" : "finalized";
        } else if (!missingBioEnroll) {
          status = derived.status;
          isLate = derived.is_late;
          source = dayPunches.length > 0 ? "biometric" : "default";
        } else {
          status = derived.status;
          isLate = false;
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
          const isOffDay = source === "holiday" || source === "weekend";
          const needsAttention =
            (!isOffDay && missingBioEnroll) ||
            singlePunch ||
            isLate ||
            isEarlyDeparture;
          if (needsAttention) empNeedsAttention = true;

          if (!dailyData[dStr]) dailyData[dStr] = [];
          dailyData[dStr].push({
            empId: emp.id,
            empName: emp.full_name,
            date: dStr,
            status,
            source,
            isManual,
            isLate,
            isEarlyDeparture,
            singlePunch,
            in_time,
            out_time,
            workedHours,
            needsAttention,
            missingBioEnroll,
          });
        }
      }

      const applySandwich = emp.enable_sandwich_policy !== false;
      const monthClUsed = clUsedByEmp.get(emp.id) ?? 0;
      const effectiveClBalance = Number(emp.casual_leave_balance ?? 0) + monthClUsed;
      const payable = computePayablePresentDays({
        statusByDate,
        lateByDate,
        holidayDates,
        monthStart: start,
        monthEnd: end,
        year: y,
        month: m,
        lastDay,
        applySandwichPolicy: applySandwich,
        casualLeaveBalance: effectiveClBalance,
      });

      const sandwichCharges = applySandwich
        ? listSandwichCharges(statusByDate, holidayDates, start, end)
        : [];
      const sandwichDates = sandwichCharges.map((c) => c.saturday);
      const sandwichTriggerDates = Array.from(
        new Set(sandwichCharges.flatMap((c) => c.triggers))
      ).sort();

      employeePayable[emp.id] = {
        attendanceDays: payable.attendanceDays,
        sandwichDeduction: payable.sandwichDeduction,
        sandwichDates,
        sandwichTriggerDates,
        lateInCount: payable.lateInCount,
        lateInDeduction: payable.lateInDeduction,
        casualLeaveUsed: payable.casualLeaveUsed,
        salaryDeductionDays: payable.salaryDeductionDays,
        presentDays: payable.payableDays,
        needsAttention: empNeedsAttention,
        missingBioEnroll,
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
      lateGraceMinutes: thresholds.lateGraceMinutes,
      employees: (employees ?? []).map((e) => ({
        id: e.id,
        full_name: e.full_name,
        presentDays: employeePayable[e.id]?.presentDays ?? 0,
        attendanceDays: employeePayable[e.id]?.attendanceDays ?? 0,
        sandwichDeduction: employeePayable[e.id]?.sandwichDeduction ?? 0,
        sandwichDates: employeePayable[e.id]?.sandwichDates ?? [],
        sandwichTriggerDates: employeePayable[e.id]?.sandwichTriggerDates ?? [],
        lateInCount: employeePayable[e.id]?.lateInCount ?? 0,
        lateInDeduction: employeePayable[e.id]?.lateInDeduction ?? 0,
        casualLeaveUsed: employeePayable[e.id]?.casualLeaveUsed ?? 0,
        salaryDeductionDays: employeePayable[e.id]?.salaryDeductionDays ?? 0,
        needsAttention: employeePayable[e.id]?.needsAttention ?? false,
        missingBioEnroll: employeePayable[e.id]?.missingBioEnroll ?? false,
        biometric_enroll_no: e.biometric_enroll_no ?? null,
        shift_start_time: e.shift_start_time ?? null,
        shift_end_time: e.shift_end_time ?? null,
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
      const thresholds = await loadAttendanceThresholds(supabase);

      const { data: employees } = await supabase
        .from("employees")
        .select("id, shift_start_time, shift_end_time, biometric_enroll_no, enable_sandwich_policy, casual_leave_balance")
        .eq("status", "active")
        .eq("enable_payroll", true);
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
      const punches = await fetchAllRawPunches(admin, rangeStart, rangeEnd);

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

          if (emp.biometric_enroll_no != null) {
            const dayPunches = dayPunchesForEnroll(
              punches,
              String(emp.biometric_enroll_no),
              dStr
            );

            const derived = deriveDailyStatus(
              dayPunches,
              shift,
              thresholds,
              isHoliday,
              isWeekOff
            );
            status = derived.status;
            isLate = derived.is_late;
          } else {
            const derived = deriveDailyStatus([], shift, thresholds, isHoliday, isWeekOff);
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

      // Apply sandwich/late deductions against casual leave first; persist CL usage for the month.
      const { data: neighborFinalized } = await supabase
        .from("employee_attendance_finalized")
        .select("employee_id, attendance_date, status, is_late, month_year")
        .in("month_year", adjacentMonths);

      const { data: prevClUsage } = await supabase
        .from("employee_month_casual_leave_usage")
        .select("employee_id, days_used")
        .eq("month_year", monthYear);
      const prevClByEmp = new Map<string, number>();
      (prevClUsage ?? []).forEach((r) => {
        prevClByEmp.set(r.employee_id, Number(r.days_used) || 0);
      });

      const clUsageUpserts: {
        employee_id: string;
        month_year: string;
        days_used: number;
        updated_at: string;
      }[] = [];

      for (const emp of employees ?? []) {
        const statusByDate = new Map<string, string>();
        const lateByDate = new Map<string, boolean>();
        for (const f of neighborFinalized ?? []) {
          if (f.employee_id !== emp.id) continue;
          statusByDate.set(f.attendance_date, f.status);
          if (f.attendance_date >= start && f.attendance_date <= end) {
            lateByDate.set(f.attendance_date, !!f.is_late);
          }
        }
        // Prefer freshly finalized current-month rows (already included above via upsert read).
        for (const row of rowsToInsert) {
          if (row.employee_id !== emp.id) continue;
          statusByDate.set(row.attendance_date, row.status);
          lateByDate.set(row.attendance_date, !!row.is_late);
        }

        const prevUsed = prevClByEmp.get(emp.id) ?? 0;
        const effectiveCl = Number(emp.casual_leave_balance ?? 0) + prevUsed;
        const payable = computePayablePresentDays({
          statusByDate,
          lateByDate,
          holidayDates,
          monthStart: start,
          monthEnd: end,
          year: y,
          month: m,
          lastDay,
          applySandwichPolicy: emp.enable_sandwich_policy !== false,
          casualLeaveBalance: effectiveCl,
        });

        const newUsed = payable.casualLeaveUsed;
        const newBalance = Math.max(0, Math.round((effectiveCl - newUsed) * 100) / 100);
        const { error: balErr } = await supabase
          .from("employees")
          .update({ casual_leave_balance: newBalance })
          .eq("id", emp.id);
        if (balErr) {
          console.error("CL balance update error:", balErr);
          return NextResponse.json({ error: balErr.message }, { status: 400 });
        }

        clUsageUpserts.push({
          employee_id: emp.id,
          month_year: monthYear,
          days_used: newUsed,
          updated_at: new Date().toISOString(),
        });
      }

      if (clUsageUpserts.length > 0) {
        const { error: usageErr } = await supabase
          .from("employee_month_casual_leave_usage")
          .upsert(clUsageUpserts, { onConflict: "employee_id,month_year" });
        if (usageErr) {
          console.error("CL usage upsert error:", usageErr);
          return NextResponse.json({ error: usageErr.message }, { status: 400 });
        }
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
