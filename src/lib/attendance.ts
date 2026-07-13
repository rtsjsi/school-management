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

export type DerivedDay = {
  status: "present" | "half_day" | "absent" | "holiday" | "week_off" | "casual_leave";
  in_time?: string; // HH:MM:SS in IST
  out_time?: string; // HH:MM:SS in IST
  worked_hours: number;
  is_late: boolean;
  is_early_departure: boolean;
  single_punch: boolean;
};

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

/** Payable weight of a day: present/holiday/week_off = 1, half day = 0.5, otherwise 0. */
export function dayWeight(status: string | null | undefined): number {
  if (status === "present" || status === "holiday" || status === "week_off" || status === "casual_leave") return 1;
  if (status === "half_day") return 0.5;
  return 0;
}

/**
 * Count working days (weekdays minus holidays) in a given month.
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
    const day = new Date(`${dStr}T12:00:00`).getDay();
    if (day !== 0 && day !== 6 && !holidayDates.has(dStr)) count++;
  }
  return count;
}
