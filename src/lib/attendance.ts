// Shared attendance derivation logic used by biometric import, the monthly
// review grid, and NEFT salary proration so all three agree on how punches
// become a daily status.

export type PunchLite = { punch_type?: string | null; punch_time: string };

export type ShiftLite =
  | {
      start_time?: string | null;
      end_time?: string | null;
    }
  | null
  | undefined;

/** Build shift timing object from employee-level fields for attendance derivation. */
export function employeeShiftLite(emp: {
  shift_start_time?: string | null;
  shift_end_time?: string | null;
}): ShiftLite {
  if (!emp.shift_start_time && !emp.shift_end_time) return null;
  return {
    start_time: emp.shift_start_time,
    end_time: emp.shift_end_time,
  };
}

export type AttendanceThresholds = { fullDayHours: number; halfDayHours: number };

export const DEFAULT_THRESHOLDS: AttendanceThresholds = { fullDayHours: 6, halfDayHours: 3 };

export type AttendanceStatus =
  | "present"
  | "half_day"
  | "absent"
  | "holiday"
  | "week_off"
  | "casual_leave"
  | "leave_without_pay";

export type DerivedDay = {
  status: AttendanceStatus;
  in_time?: string; // HH:MM:SS in IST
  out_time?: string; // HH:MM:SS in IST
  worked_hours: number;
  is_late: boolean;
  is_early_departure: boolean;
  single_punch: boolean;
};

/** Unpaid; used when a paid Saturday is sandwiched by Friday/Monday leave. */
export const LEAVE_WITHOUT_PAY = "leave_without_pay" as const;

const IST_TZ = "Asia/Kolkata";

function istParts(d: Date): { h: number; m: number; s: number } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  // Intl can emit "24" for midnight in some runtimes; normalise to 0.
  const h = get("hour") % 24;
  return { h, m: get("minute"), s: get("second") };
}

function istTimeMinutes(d: Date): number {
  const { h, m } = istParts(d);
  return h * 60 + m;
}

function istTimeString(d: Date): string {
  const { h, m, s } = istParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function hhmmToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hi = parseInt(h, 10);
  const mi = parseInt(m ?? "0", 10);
  if (Number.isNaN(hi)) return null;
  return hi * 60 + (Number.isNaN(mi) ? 0 : mi);
}

/**
 * Derive a single employee/day status from that day's raw punches.
 *
 * Rules (hours-based):
 *  - No punches -> absent
 *  - First IN + last OUT -> worked hours -> present (>= full-day) / half_day (>= half-day) / absent
 *  - Only one usable punch (cannot compute hours) -> present, flagged single_punch for review
 */
export function deriveDailyStatus(
  punches: PunchLite[],
  shift: ShiftLite,
  thresholds: AttendanceThresholds = DEFAULT_THRESHOLDS,
  isHoliday: boolean = false,
  isWeekOff: boolean = false
): DerivedDay {
  const valid = (punches ?? [])
    .map((p) => ({ type: (p.punch_type ?? "").toUpperCase(), date: new Date(p.punch_time) }))
    .filter((p) => !Number.isNaN(p.date.getTime()));

  if (valid.length === 0) {
    let defaultStatus: DerivedDay["status"] = "absent";
    if (isHoliday) defaultStatus = "holiday";
    else if (isWeekOff) defaultStatus = "week_off";
    return { status: defaultStatus, worked_hours: 0, is_late: false, is_early_departure: false, single_punch: false };
  }

  const ins = valid.filter((p) => p.type === "IN").map((p) => p.date).sort((a, b) => a.getTime() - b.getTime());
  const outs = valid.filter((p) => p.type === "OUT").map((p) => p.date).sort((a, b) => a.getTime() - b.getTime());
  const all = valid.map((p) => p.date).sort((a, b) => a.getTime() - b.getTime());

  // Prefer typed IN/OUT; fall back to earliest/latest punch of the day.
  const firstIn = ins[0] ?? all[0];
  const lastOut = outs[outs.length - 1] ?? (all.length > 1 ? all[all.length - 1] : undefined);

  const in_time = firstIn ? istTimeString(firstIn) : undefined;
  const haveSpan = !!firstIn && !!lastOut && lastOut.getTime() > firstIn.getTime();
  const out_time = haveSpan ? istTimeString(lastOut as Date) : undefined;
  const singlePunch = !haveSpan;

  const workedHours = haveSpan ? (lastOut!.getTime() - firstIn.getTime()) / 3_600_000 : 0;

  let status: DerivedDay["status"];
  if (singlePunch) {
    status = "present"; // can't compute hours; default present, flagged for review
  } else if (workedHours >= thresholds.fullDayHours) {
    status = "present";
  } else if (workedHours >= thresholds.halfDayHours) {
    status = "half_day";
  } else {
    status = "absent";
  }

  let is_late = false;
  let is_early_departure = false;
  if (shift && firstIn) {
    const startMin = hhmmToMinutes(shift.start_time);
    if (startMin !== null) is_late = istTimeMinutes(firstIn) > startMin;
  }
  if (shift && haveSpan) {
    const endMin = hhmmToMinutes(shift.end_time);
    if (endMin !== null) is_early_departure = istTimeMinutes(lastOut as Date) < endMin;
  }

  return {
    status,
    in_time,
    out_time,
    worked_hours: Math.round(workedHours * 100) / 100,
    is_late,
    is_early_departure,
    single_punch: singlePunch,
  };
}

/**
 * Payable weight of a day:
 * present / holiday / week_off / casual_leave = 1,
 * half_day = 0.5,
 * leave_without_pay / absent / anything else = 0.
 */
export function dayWeight(status: string | null | undefined): number {
  if (status === "present" || status === "holiday" || status === "week_off" || status === "casual_leave") return 1;
  if (status === "half_day") return 0.5;
  // leave_without_pay and absent intentionally weigh 0
  return 0;
}

/** JS Date#getDay(): 0 = Sunday, 6 = Saturday. */
export const SUNDAY = 0;
export const FRIDAY = 5;
export const SATURDAY = 6;
export const MONDAY = 1;

/** Statuses that mean the employee took leave / was away (triggers Saturday LWP). */
export function isLeaveTriggerStatus(status: string | null | undefined): boolean {
  return (
    status === "absent" ||
    status === "casual_leave" ||
    status === "leave_without_pay" ||
    status === "leave"
  );
}

/** Add calendar days to a YYYY-MM-DD string (noon-anchored). */
export function addCalendarDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * School week rules:
 * - Sunday is the only non-working week off (not counted for payroll).
 * - Saturday is a school working / payable day, but staff are not expected
 *   to punch — treat empty attendance as a paid holiday.
 * - Calendar holidays (from `holidays`) are excluded from working-day totals
 *   (paid implicitly via monthly proration).
 */
export function dayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getDay();
}

/** True only for Sunday — the unpaid / non-working week off. */
export function isSundayWeekOff(dateStr: string): boolean {
  return dayOfWeek(dateStr) === SUNDAY;
}

/** Saturday: payable school day, auto paid-holiday when staff do not attend. */
export function isSaturdayPaidHoliday(dateStr: string): boolean {
  return dayOfWeek(dateStr) === SATURDAY;
}

/**
 * Days that count toward working-day totals and attendance proration:
 * Mon–Sat, excluding calendar holidays. Sundays are never counted.
 */
export function isPayableWorkingDay(dateStr: string, holidayDates: Set<string>): boolean {
  return !isSundayWeekOff(dateStr) && !holidayDates.has(dateStr);
}

/**
 * Flags for `deriveDailyStatus` empty-punch defaults.
 * Saturday is passed as holiday so no punches → paid holiday, not absent.
 */
export function deriveCalendarFlags(
  dateStr: string,
  holidayDates: Set<string>,
): { isHoliday: boolean; isWeekOff: boolean } {
  return {
    isHoliday: holidayDates.has(dateStr) || isSaturdayPaidHoliday(dateStr),
    isWeekOff: isSundayWeekOff(dateStr),
  };
}

/**
 * Count payable working days (Mon–Sat minus calendar holidays) in a month.
 * Saturdays are included so staff are paid for them as paid holidays.
 * Uses noon-anchored date parsing to avoid timezone edge cases.
 */
export function computeWorkingDays(
  year: string,
  month: string,
  lastDay: number,
  holidayDates: Set<string>,
): number {
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dStr = `${year}-${month}-${String(d).padStart(2, "0")}`;
    if (isPayableWorkingDay(dStr, holidayDates)) count++;
  }
  return count;
}

/**
 * Bridging Saturday rule (school payroll):
 * - Leave/absent on Friday → that week's Saturday becomes leave_without_pay (weight 0).
 * - Leave/absent on Monday → previous week's Saturday becomes leave_without_pay.
 *
 * Only rewrites Saturdays that are still auto paid holidays (or empty unpaid defaults).
 * Does not override present / half_day / casual_leave on Saturday, nor dates in
 * `manualOverrideDates` (manual corrections win).
 *
 * `statusByDate` should include Friday/Monday neighbors even when they fall outside
 * the review month so month-boundary Saturdays resolve correctly.
 */
export function applySaturdayLwpRule(
  statusByDate: Map<string, string>,
  holidayDates: Set<string>,
  monthStart: string,
  monthEnd: string,
  manualOverrideDates: Set<string> = new Set(),
): Map<string, string> {
  const result = new Map(statusByDate);
  const start = new Date(`${monthStart}T12:00:00`);
  const end = new Date(`${monthEnd}T12:00:00`);

  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const day = String(cur.getDate()).padStart(2, "0");
    const sat = `${y}-${m}-${day}`;

    if (dayOfWeek(sat) !== SATURDAY) continue;
    // Calendar holiday Saturdays are not payable working days — leave alone.
    if (holidayDates.has(sat)) continue;
    if (manualOverrideDates.has(sat)) continue;

    const friday = addCalendarDays(sat, -1);
    const monday = addCalendarDays(sat, 2);
    const triggered =
      isLeaveTriggerStatus(result.get(friday)) || isLeaveTriggerStatus(result.get(monday));
    if (!triggered) continue;

    const current = result.get(sat);
    // Keep real worked / granted leave on Saturday; rewrite paid-holiday defaults to LWP.
    if (
      current === "present" ||
      current === "half_day" ||
      current === "casual_leave" ||
      current === LEAVE_WITHOUT_PAY
    ) {
      continue;
    }
    result.set(sat, LEAVE_WITHOUT_PAY);
  }

  return result;
}
