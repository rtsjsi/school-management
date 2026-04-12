/** Staff / payroll master record — aligned with EmployeeEntryForm required fields (shift optional). */
export const EMPLOYEE_COMPLETENESS_FIELDS = [
  "full_name",
  "email",
  "phone_number",
  "address",
  "aadhaar",
  "pan",
  "role",
  "department",
  "employee_type",
  "joining_date",
  "monthly_salary",
  "degree",
  "institution",
  "year_passed",
  "bank_name",
  "account_number",
  "ifsc_code",
  "account_holder_name",
] as const;

export type CompletenessScore = {
  percent: number;
  filled: number;
  total: number;
};

export type AggregatedCompleteness = {
  averagePercent: number;
  fullyComplete: number;
  total: number;
};

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  return Boolean(value);
}

export function computeEmployeeCompleteness(row: Record<string, unknown>): CompletenessScore {
  let filled = 0;
  const total = EMPLOYEE_COMPLETENESS_FIELDS.length;
  for (const key of EMPLOYEE_COMPLETENESS_FIELDS) {
    if (isFilled(row[key])) filled++;
  }
  return {
    percent: total > 0 ? Math.round((filled / total) * 100) : 0,
    filled,
    total,
  };
}

/** Standard row may include `standard_divisions` from a nested select. */
export function computeStandardCompleteness(row: Record<string, unknown>): CompletenessScore {
  const checks: boolean[] = [
    isFilled(row.name),
    isFilled(row.section),
    row.sort_order !== null && row.sort_order !== undefined && !Number.isNaN(Number(row.sort_order)),
  ];
  const divs = row.standard_divisions;
  const divCount = Array.isArray(divs) ? divs.length : 0;
  checks.push(divCount > 0);
  const filled = checks.filter(Boolean).length;
  const total = checks.length;
  return {
    percent: total > 0 ? Math.round((filled / total) * 100) : 0,
    filled,
    total,
  };
}

export function computeSubjectCompleteness(row: Record<string, unknown>): CompletenessScore {
  const checks = [
    isFilled(row.name),
    isFilled(row.evaluation_type),
    isFilled(row.subject_teacher_id),
  ];
  const filled = checks.filter(Boolean).length;
  const total = checks.length;
  return {
    percent: total > 0 ? Math.round((filled / total) * 100) : 0,
    filled,
    total,
  };
}

export function aggregateCompleteness(
  rows: Record<string, unknown>[],
  scoreFn: (row: Record<string, unknown>) => CompletenessScore,
): AggregatedCompleteness {
  if (rows.length === 0) return { averagePercent: 0, fullyComplete: 0, total: 0 };
  let sum = 0;
  let fullyComplete = 0;
  for (const r of rows) {
    const { percent } = scoreFn(r);
    sum += percent;
    if (percent === 100) fullyComplete++;
  }
  return {
    averagePercent: Math.round(sum / rows.length),
    fullyComplete,
    total: rows.length,
  };
}

export function completenessBadgeClassNames(percent: number): string {
  if (percent >= 80) {
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
  }
  if (percent >= 50) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  }
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
}
