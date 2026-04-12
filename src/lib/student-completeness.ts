export const COMPLETENESS_CATEGORIES = {
  "Basic Info": [
    "full_name",
    "date_of_birth",
    "gender",
    "blood_group",
    "mother_tongue",
    "category",
    "religion",
    "caste",
    "birth_place",
  ],
  Enrollment: [
    "standard",
    "division",
    "roll_number",
    "gr_number",
    "admission_date",
  ],
  "Identity Documents": [
    "aadhar_no",
    "birth_certificate_number",
    "pen_no",
    "apaar_id",
    "udise_id",
  ],
  "Present Address": [
    "present_address_line1",
    "present_city",
    "present_district",
    "present_state",
    "present_pincode",
  ],
  "Parent / Guardian": [
    "father_name",
    "mother_name",
    "parent_contact",
    "mother_contact",
    "whatsapp_no",
  ],
  "Bank Details": [
    "account_holder_name",
    "bank_name",
    "bank_branch",
    "bank_ifsc",
    "account_no",
  ],
} as const;

export type CompletenessCategory = keyof typeof COMPLETENESS_CATEGORIES;

const ALL_FIELDS = Object.values(COMPLETENESS_CATEGORIES).flat();

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return true;
  return Boolean(value);
}

export type CompletenessResult = {
  percent: number;
  filled: number;
  total: number;
  byCategory: Record<CompletenessCategory, { filled: number; total: number }>;
};

export function computeCompleteness(
  student: Record<string, unknown>,
): CompletenessResult {
  let filled = 0;
  const byCategory = {} as CompletenessResult["byCategory"];

  for (const [cat, fields] of Object.entries(COMPLETENESS_CATEGORIES)) {
    let catFilled = 0;
    for (const field of fields) {
      if (isFilled(student[field])) catFilled++;
    }
    byCategory[cat as CompletenessCategory] = {
      filled: catFilled,
      total: fields.length,
    };
    filled += catFilled;
  }

  const total = ALL_FIELDS.length;
  return {
    percent: total > 0 ? Math.round((filled / total) * 100) : 0,
    filled,
    total,
    byCategory,
  };
}

export type OverallCompleteness = {
  averagePercent: number;
  fullyComplete: number;
  total: number;
};

export function computeOverallCompleteness(
  students: Record<string, unknown>[],
): OverallCompleteness {
  if (students.length === 0) {
    return { averagePercent: 0, fullyComplete: 0, total: 0 };
  }

  let sumPercent = 0;
  let fullyComplete = 0;

  for (const s of students) {
    const { percent } = computeCompleteness(s);
    sumPercent += percent;
    if (percent === 100) fullyComplete++;
  }

  return {
    averagePercent: Math.round(sumPercent / students.length),
    fullyComplete,
    total: students.length,
  };
}
