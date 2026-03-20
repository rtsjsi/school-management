/** Split a single annual fee into four quarter rows (equal parts; last quarter absorbs rounding). */

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function splitAnnualFeeAcrossQuarters(annualRaw: number): { quarter: number; amount: number }[] {
  const annual = Math.max(0, roundMoney(Number(annualRaw) || 0));
  if (annual <= 0) return [];
  const per = roundMoney(annual / 4);
  let allocated = 0;
  const out: { quarter: number; amount: number }[] = [];
  for (let q = 1; q <= 4; q++) {
    if (q === 4) {
      out.push({ quarter: q, amount: roundMoney(annual - allocated) });
    } else {
      out.push({ quarter: q, amount: per });
      allocated += per;
    }
  }
  return out;
}
