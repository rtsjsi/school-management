/**
 * Fee concession (Model A): one annual amount on the student is subtracted from
 * the sum of all fee structure lines for the year. Each quarter's net payable is a
 * pro-rata share of that net total. Matches fee_collections.fee_type (education_fee).
 */

/** Fee collections / receipts still use this single type for school fees. */
export const STRUCTURE_COLLECTION_FEE_TYPE = "education_fee" as const;

export type FeeLineInput = { quarter: number; amount: number };

export type FeeLineWithNet = {
  quarter: number;
  fee_type: typeof STRUCTURE_COLLECTION_FEE_TYPE;
  gross: number;
  net: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Merge duplicate structure rows for the same quarter. */
function mergeFeeLinesByQuarter(items: FeeLineInput[]): { quarter: number; gross: number }[] {
  const mergedMap = new Map<number, number>();
  for (const i of items) {
    const q = i.quarter;
    const g = Math.max(0, Number(i.amount) || 0);
    mergedMap.set(q, (mergedMap.get(q) ?? 0) + g);
  }
  return Array.from(mergedMap.entries())
    .map(([quarter, gross]) => ({ quarter, gross }))
    .sort((a, b) => a.quarter - b.quarter);
}

/**
 * Returns one row per quarter with gross (from structure) and net (after annual concession).
 */
export function linesWithNetAfterConcession(
  items: FeeLineInput[],
  concessionAmount: number | null | undefined
): FeeLineWithNet[] {
  const merged = mergeFeeLinesByQuarter(items);
  const grossTotal = merged.reduce((s, m) => s + m.gross, 0);
  const concession = Math.max(0, Number(concessionAmount) || 0);
  const netTotal = grossTotal <= 0 ? 0 : roundMoney(Math.max(0, grossTotal - concession));

  if (merged.length === 0) return [];

  let allocated = 0;
  const nets: number[] = new Array(merged.length);
  for (let i = 0; i < merged.length; i++) {
    if (i === merged.length - 1) {
      nets[i] = roundMoney(netTotal - allocated);
    } else {
      const n = grossTotal > 0 ? roundMoney(netTotal * (merged[i].gross / grossTotal)) : 0;
      nets[i] = n;
      allocated += n;
    }
  }

  return merged.map((m, i) => ({
    quarter: m.quarter,
    fee_type: STRUCTURE_COLLECTION_FEE_TYPE,
    gross: m.gross,
    net: nets[i],
  }));
}

/** Total net liability for the academic year (sum of per-quarter nets). */
export function annualNetFeeLiability(
  items: FeeLineInput[],
  concessionAmount: number | null | undefined
): number {
  const lines = linesWithNetAfterConcession(items, concessionAmount);
  return roundMoney(lines.reduce((s, l) => s + l.net, 0));
}
