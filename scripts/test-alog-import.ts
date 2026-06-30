import { readFileSync } from "fs";
import { decodeBiometricFile, filterPunchesByMonth, parseBiometricLog } from "../src/lib/biometric-parse";

const filePath =
  "d:/Angel School Management App Project/Angel School Management App Project/Biometric Machine Data/ALOG_001.txt";

const bytes = readFileSync(filePath);
const parsed = parseBiometricLog(decodeBiometricFile(new Uint8Array(bytes)));

if (!parsed.headerOk) {
  console.error("FAIL: header not recognised");
  process.exit(1);
}
if (parsed.punches.length !== 6293) {
  console.error(`FAIL: expected 6293 punches, got ${parsed.punches.length}`);
  process.exit(1);
}

const monthCounts = new Map<string, number>();
for (const p of parsed.punches) {
  const m = p.date.slice(0, 7);
  monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
}

const jan = filterPunchesByMonth(parsed.punches, "2026-01");
const feb = filterPunchesByMonth(parsed.punches, "2026-02");
const dec = filterPunchesByMonth(parsed.punches, "2025-12");

const checks: [string, boolean][] = [
  ["Jan 2026 count", jan.length === 1323],
  ["Feb 2026 count", feb.length === 1288],
  ["Dec 2025 empty", dec.length === 0],
  ["Jan has no leaks", jan.every((p) => p.date.startsWith("2026-01-"))],
  ["Feb has no leaks", feb.every((p) => p.date.startsWith("2026-02-"))],
  ["filtered + ignored = total", jan.length + feb.length + filterPunchesByMonth(parsed.punches, "2026-03").length + filterPunchesByMonth(parsed.punches, "2026-04").length + filterPunchesByMonth(parsed.punches, "2026-05").length + filterPunchesByMonth(parsed.punches, "2026-06").length === parsed.punches.length],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(ok ? "PASS" : "FAIL", name);
  if (!ok) failed = true;
}

console.log("\nMonths in ALOG_001.txt:", [...monthCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([m, c]) => `${m}: ${c}`).join(", "));
console.log("Jan 2026 filter:", jan.length, "punches,", new Set(jan.map((p) => p.date)).size, "days,", new Set(jan.map((p) => p.enNoNorm)).size, "employees");

if (failed) process.exit(1);
console.log("\nAll checks passed on ALOG_001.txt");
