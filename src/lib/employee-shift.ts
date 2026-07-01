export function formatTimeShort(t?: string | null): string {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  return `${h}:${m ?? "00"}`;
}

export function shiftTimesLabel(emp: {
  shift_start_time?: string | null;
  shift_end_time?: string | null;
}): string {
  const start = formatTimeShort(emp.shift_start_time);
  const end = formatTimeShort(emp.shift_end_time);
  if (!start && !end) return "—";
  if (!start) return end;
  if (!end) return start;
  return `${start} – ${end}`;
}

export function hasShiftTimes(emp: {
  shift_start_time?: string | null;
  shift_end_time?: string | null;
}): boolean {
  return Boolean(emp.shift_start_time || emp.shift_end_time);
}

export function timeForInput(t?: string | null): string {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  return `${h}:${m ?? "00"}`;
}

export function normalizeTimeForDb(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [h, m] = trimmed.split(":");
  if (!h) return null;
  return `${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}:00`;
}
