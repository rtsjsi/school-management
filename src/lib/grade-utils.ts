export interface SubjectMarkInfo {
  score: number | null | undefined;
  maxScore: number;
  isAbsent: boolean;
  isGradeBased: boolean;
}

export interface PercentageCalculationResult {
  totalObtained: number;
  totalMax: number;
  percentage: string;
}

export function calculatePercentage(marks: SubjectMarkInfo[]): PercentageCalculationResult {
  let totalObtained = 0;
  let totalMax = 0;

  for (const mark of marks) {
    // Grade based subjects are excluded from percentage
    if (mark.isGradeBased) continue;
    
    // Absent subjects have no impact on percentage
    if (mark.isAbsent) continue;
    
    // If no score was entered, it has no impact on percentage
    if (mark.score == null) continue;

    totalObtained += Number(mark.score);
    totalMax += Number(mark.maxScore);
  }

  return {
    totalObtained,
    totalMax,
    percentage: totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "—"
  };
}
