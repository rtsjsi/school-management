/**
 * Smart timetable generation algorithm.
 *
 * Given a list of subjects and total periods per day,
 * distributes subjects across Mon–Fri in a balanced way:
 * - Each subject appears roughly (totalPeriodsPerDay * 5 / numSubjects) times per week
 * - No subject appears more than 2 consecutive periods in a day
 * - Subjects spread across different time slots through the week
 */

export type SubjectForTimetable = {
  id: string;
  name: string;
};

export type GeneratedEntry = {
  day_of_week: number; // 1=Mon..5=Fri
  period_number: number; // 1-based
  subject_id: string;
  subject_name: string;
};

/**
 * Generate a smart timetable for one class.
 *
 * @param subjects - the subjects assigned to this class
 * @param periodsPerDay - number of teaching periods per day (excluding breaks)
 * @param days - number of school days (default 5 = Mon-Fri)
 */
export function generateTimetable(
  subjects: SubjectForTimetable[],
  periodsPerDay: number,
  days: number = 5
): GeneratedEntry[] {
  if (subjects.length === 0 || periodsPerDay === 0) return [];

  const totalSlots = periodsPerDay * days;

  // Calculate how many slots each subject should get
  const slotsPerSubject = distributeSlots(subjects.length, totalSlots);

  // Build a pool of subject assignments
  const pool: SubjectForTimetable[] = [];
  for (let i = 0; i < subjects.length; i++) {
    for (let j = 0; j < slotsPerSubject[i]; j++) {
      pool.push(subjects[i]);
    }
  }

  // Pad or trim pool to exactly fill totalSlots
  while (pool.length < totalSlots) {
    // Add least-represented subjects
    const counts = countOccurrences(pool, subjects);
    const minCount = Math.min(...Object.values(counts));
    const leastUsed = subjects.find((s) => counts[s.id] === minCount);
    if (leastUsed) pool.push(leastUsed);
  }
  while (pool.length > totalSlots) {
    pool.pop();
  }

  // Shuffle and place into grid with constraints
  const grid: (SubjectForTimetable | null)[][] = Array.from(
    { length: days },
    () => Array(periodsPerDay).fill(null)
  );

  // Use a smarter placement: for each day, pick subjects ensuring variety
  const remaining = [...pool];
  shuffleArray(remaining);

  for (let d = 0; d < days; d++) {
    const daySubjects = pickForDay(remaining, periodsPerDay, subjects);
    for (let p = 0; p < periodsPerDay; p++) {
      grid[d][p] = daySubjects[p] || null;
    }
  }

  // Convert grid to entries
  const entries: GeneratedEntry[] = [];
  for (let d = 0; d < days; d++) {
    for (let p = 0; p < periodsPerDay; p++) {
      const subj = grid[d][p];
      if (subj) {
        entries.push({
          day_of_week: d + 1,
          period_number: p + 1,
          subject_id: subj.id,
          subject_name: subj.name,
        });
      }
    }
  }

  return entries;
}

/**
 * Distribute totalSlots among numSubjects as evenly as possible.
 * Returns an array of slot counts.
 */
function distributeSlots(numSubjects: number, totalSlots: number): number[] {
  const base = Math.floor(totalSlots / numSubjects);
  const remainder = totalSlots % numSubjects;
  const result: number[] = [];
  for (let i = 0; i < numSubjects; i++) {
    result.push(base + (i < remainder ? 1 : 0));
  }
  return result;
}

function countOccurrences(
  pool: SubjectForTimetable[],
  subjects: SubjectForTimetable[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of subjects) counts[s.id] = 0;
  for (const s of pool) counts[s.id] = (counts[s.id] || 0) + 1;
  return counts;
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Pick subjects for one day from remaining pool,
 * trying to avoid same subject in consecutive periods.
 */
function pickForDay(
  remaining: SubjectForTimetable[],
  periodsPerDay: number,
  allSubjects: SubjectForTimetable[]
): SubjectForTimetable[] {
  const day: SubjectForTimetable[] = [];

  for (let p = 0; p < periodsPerDay; p++) {
    const lastSubject = p > 0 ? day[p - 1] : null;
    const secondLastSubject = p > 1 ? day[p - 2] : null;

    // Try to find a subject that's not the same as the last two consecutive
    let bestIdx = -1;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      // Avoid 3 consecutive of the same subject
      if (
        lastSubject &&
        secondLastSubject &&
        candidate.id === lastSubject.id &&
        candidate.id === secondLastSubject.id
      ) {
        continue;
      }
      // Prefer different from last
      if (bestIdx === -1) {
        bestIdx = i;
      }
      if (!lastSubject || candidate.id !== lastSubject.id) {
        bestIdx = i;
        break;
      }
    }

    if (bestIdx >= 0) {
      day.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    } else if (remaining.length > 0) {
      day.push(remaining.shift()!);
    } else {
      // Fallback: cycle through subjects
      day.push(allSubjects[p % allSubjects.length]);
    }
  }

  return day;
}

/**
 * Calculate time slots for periods given settings.
 * Returns array of { start, end } time strings for each period,
 * plus break info.
 */
export type PeriodSlot = {
  type: "period" | "break";
  periodNumber?: number;
  breakNumber?: number;
  start: string; // HH:MM format
  end: string;
};

export function calculatePeriodSlots(settings: {
  school_start_time: string;
  period_duration_minutes: number;
  num_breaks: number;
  periods_before_break_1: number;
  break_1_duration_minutes: number;
  periods_before_break_2: number | null;
  break_2_duration_minutes: number | null;
  school_end_time: string;
}): PeriodSlot[] {
  const slots: PeriodSlot[] = [];
  let currentMinutes = timeToMinutes(settings.school_start_time);
  let periodCount = 0;
  let breaksDone = 0;
  const endMinutes = timeToMinutes(settings.school_end_time);

  while (currentMinutes + settings.period_duration_minutes <= endMinutes) {
    // Check if we need a break before next period
    if (
      breaksDone === 0 &&
      periodCount === settings.periods_before_break_1 &&
      settings.num_breaks >= 1
    ) {
      const breakStart = minutesToTime(currentMinutes);
      currentMinutes += settings.break_1_duration_minutes;
      slots.push({
        type: "break",
        breakNumber: 1,
        start: breakStart,
        end: minutesToTime(currentMinutes),
      });
      breaksDone = 1;
    } else if (
      breaksDone === 1 &&
      settings.num_breaks >= 2 &&
      settings.periods_before_break_2 != null &&
      periodCount ===
        settings.periods_before_break_1 + settings.periods_before_break_2
    ) {
      const breakStart = minutesToTime(currentMinutes);
      currentMinutes += settings.break_2_duration_minutes || 0;
      slots.push({
        type: "break",
        breakNumber: 2,
        start: breakStart,
        end: minutesToTime(currentMinutes),
      });
      breaksDone = 2;
    }

    // Add a period
    if (currentMinutes + settings.period_duration_minutes <= endMinutes) {
      periodCount++;
      const periodStart = minutesToTime(currentMinutes);
      currentMinutes += settings.period_duration_minutes;
      slots.push({
        type: "period",
        periodNumber: periodCount,
        start: periodStart,
        end: minutesToTime(currentMinutes),
      });
    } else {
      break;
    }
  }

  return slots;
}

export function countTeachingPeriods(slots: PeriodSlot[]): number {
  return slots.filter((s) => s.type === "period").length;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Format time from HH:MM (24h) to 12h display format like "9:30" or "01:05"
 */
export function formatTimeDisplay(time: string): string {
  const [h24, m] = time.split(":").map(Number);
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
