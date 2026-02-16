const GRADE_ORDER: Record<string, number> = {
  "Jr KG": 0,
  "Sr KG": 1,
  "1": 2,
  "2": 3,
  "3": 4,
  "4": 5,
  "5": 6,
  "6": 7,
  "7": 8,
  "8": 9,
  "9": 10,
  "10": 11,
  "11": 12,
  "12": 13,
};

export function isGradeInRange(grade: string, from: string, to: string): boolean {
  const g = GRADE_ORDER[grade] ?? -1;
  const f = GRADE_ORDER[from] ?? -1;
  const t = GRADE_ORDER[to] ?? -1;
  if (g < 0 || f < 0 || t < 0) return false;
  return g >= f && g <= t;
}
