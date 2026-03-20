/**
 * Fee concession (Model A): one annual amount on the student is subtracted from
 * the sum of all fee structure lines for the year. Each line's net payable is a
 * pro-rata share of that net total (by quarter + fee_type).
 */

export type FeeLineInput = { fee_type: string; quarter: number; amount: number };

export type FeeLineWithNet = {
  quarter: number;
  fee_type: string;
  gross: number;
  net: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Merge duplicate structure rows for the same quarter + fee_type. */
function mergeFeeLines(items: FeeLineInput[]): { quarter: number; fee_type: string; gross: number }[] {
  const mergedMap = new Map<string, { quarter: number; fee_type: string; gross: number }>();
  for (const i of items) {
    const k = `${i.quarter}::${i.fee_type}`;
    const g = Math.max(0, Number(i.amount) || 0);
    const ex = mergedMap.get(k);
    if (ex) ex.gross += g;
    else mergedMap.set(k, { quarter: i.quarter, fee_type: i.fee_type, gross: g });
  }
  return Array.from(mergedMap.values()).sort(
    (a, b) => a.fee_type.localeCompare(b.fee_type) || a.quarter - b.quarter,
  );
}

/**
 * Returns one row per (quarter, fee_type) with gross (from structure) and net (after annual concession).
 */
export function linesWithNetAfterConcession(
  items: FeeLineInput[],
  concessionAmount: number | null | undefined
): FeeLineWithNet[] {
  const merged = mergeFeeLines(items);
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
    fee_type: m.fee_type,
    gross: m.gross,
    net: nets[i],
  }));
}

/** Total net liability for the academic year (sum of per-line nets). */
export function annualNetFeeLiability(
  items: FeeLineInput[],
  concessionAmount: number | null | undefined
): number {
  const lines = linesWithNetAfterConcession(items, concessionAmount);
  return roundMoney(lines.reduce((s, l) => s + l.net, 0));
}
