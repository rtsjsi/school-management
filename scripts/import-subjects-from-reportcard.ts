/**
 * Import subjects (mark-based vs grade-based) from Reportcard.xlsx.
 *
 * Extraction logic:
 * - In each report sheet, find the row containing the "Subjects" header.
 * - Find the first row containing "Term" (e.g. "Term - 1").
 * - Subjects appearing BEFORE the Term row are treated as mark-based.
 * - Subjects appearing AT/AFTER the Term row are treated as grade-based.
 *
 * Sheet name → standards mapping:
 * - "Class- I & II"        → I, II
 * - "Class - III to V"    → III, IV, V
 * - "Class - VI to VIII"  → VI, VII, VIII
 * - "Class- IX & X"       → IX, X
 * - "Class- XI& XII"      → XI, XII
 *
 * Writes:
 * - upserts into `public.subjects` using unique key (standard_id, name)
 *
 * Run:
 *   npx tsx scripts/import-subjects-from-reportcard.ts --reportcard d:\\...\\Reportcard.xlsx
 *   npx tsx scripts/import-subjects-from-reportcard.ts --reportcard d:\\...\\Reportcard.xlsx --dry-run
 */

import { readFileSync, existsSync } from "fs";
import { join, basename } from "path";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");

function loadEnvFile(fileName: string): Record<string, string> {
  const p = join(repoRoot, fileName);
  if (!existsSync(p)) return {};
  let content = readFileSync(p, "utf8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim().replace(/^\s*export\s+/i, "");
    const value = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key) out[key] = value;
  }
  return out;
}

function getCurrentBranch(): string | null {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", cwd: repoRoot }).trim();
  } catch {
    return null;
  }
}

function normalizeSubjectName(name: string): string {
  const t = name.trim();
  if (!t) return t;
  const tl = t.toLowerCase();
  if (tl === "science") return "Science";
  if (tl === "hindi/gujarati") return "Hindi/Gujarati";
  return t;
}

type MarkGrade = { mark: string[]; grade: string[] };

function extractMarkGradeSubjectsFromSheet(sh: XLSX.WorkSheet): MarkGrade & { total: number } {
  const grid = XLSX.utils.sheet_to_json(sh, { header: 1, defval: "" }) as unknown[][];
  const eRow = grid.length - 1;
  const eCol = Math.max(...grid.map((r) => (r?.length ?? 0) - 1), 0);

  const norm = (v: unknown) =>
    String(v ?? "")
      .trim()
      .replace(/\s+/g, " ");

  let headerRow = -1;
  for (let r = 0; r <= eRow; r++) {
    for (let c = 0; c <= Math.min(eCol, 10); c++) {
      const v = norm(grid[r]?.[c]);
      if (v.toLowerCase() === "subjects") {
        headerRow = r;
        break;
      }
    }
    if (headerRow !== -1) break;
  }

  if (headerRow === -1) {
    throw new Error('Could not find "Subjects" header row in sheet.');
  }

  let termRow: number | null = null;
  for (let r = headerRow + 1; r <= Math.min(eRow, headerRow + 200); r++) {
    for (let c = 0; c <= Math.min(eCol, 10); c++) {
      const v = norm(grid[r]?.[c]);
      const vl = v.toLowerCase();
      if (vl.includes("term")) {
        termRow = r;
        break;
      }
    }
    if (termRow != null) break;
  }

  if (termRow == null) {
    throw new Error('Could not find a "Term" row to split mark/grade subjects.');
  }

  const skip = (v: string) => {
    const t = v.trim();
    if (!t) return true;
    const tl = t.toLowerCase();
    if (tl === "subjects") return true;
    if (tl.includes("for class")) return true;
    if (tl.includes("term")) return true;
    if (/ct-\d/i.test(tl)) return true;
    if (/written|total|project|marks|result|final result/i.test(tl)) return true;
    return false;
  };

  const typeByName = new Map<string, "mark" | "grade">();
  const order = { mark: [] as string[], grade: [] as string[] };
  const seen = new Set<string>();

  // Scan row-major; subject labels appear near the left.
  for (let r = headerRow + 1; r <= Math.min(eRow, headerRow + 160); r++) {
    for (let c = 0; c <= Math.min(eCol, 3); c++) {
      const raw = norm(grid[r]?.[c]);
      if (skip(raw)) continue;

      const name = normalizeSubjectName(raw);
      if (!name) continue;
      if (seen.has(name)) continue;

      seen.add(name);
      const type: "mark" | "grade" = r < termRow ? "mark" : "grade";
      typeByName.set(name, type);
      order[type].push(name);
    }
  }

  return { mark: order.mark, grade: order.grade, total: order.mark.length + order.grade.length };
}

function sheetNameToStandards(sheetName: string): string[] {
  const s = sheetName.trim().toLowerCase();
  if (s.includes("i & ii")) return ["I", "II"];
  if (s.includes("iii to v")) return ["III", "IV", "V"];
  if (s.includes("vi to viii")) return ["VI", "VII", "VIII"];
  if (s.includes("ix & x") || s.includes("ix & x") || (s.includes("ix") && s.includes("&") && s.includes("x"))) return ["IX", "X"];
  if (s.includes("xi") && s.includes("xii")) return ["XI", "XII"];
  return [];
}

function parseArgs(): { reportcardPath: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let reportcardPath = join(repoRoot, "data_files", "Reportcard.xlsx");
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (a === "--reportcard") {
      reportcardPath = args[i + 1] ?? reportcardPath;
      i++;
      continue;
    }
    if (a.startsWith("--reportcard=")) {
      reportcardPath = a.split("=", 2)[1];
      continue;
    }
  }

  return { reportcardPath, dryRun };
}

async function main(): Promise<void> {
  const { reportcardPath, dryRun } = parseArgs();
  if (!existsSync(reportcardPath)) throw new Error(`Reportcard not found: ${reportcardPath}`);

  const branch = getCurrentBranch();
  const branchFile = branch === "main" ? ".env.main" : ".env.development";
  const branchEnv = loadEnvFile(branchFile);
  const localEnv = loadEnvFile(".env.local");
  Object.entries(branchEnv).forEach(([k, v]) => (process.env[k] = v));
  Object.entries(localEnv).forEach(([k, v]) => (process.env[k] = v));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error(`Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (${branchFile} / .env.local).`);

  const workbook = XLSX.readFile(reportcardPath);

  const sheetSubjects: { standards: string[]; mark: string[]; grade: string[] }[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sh = workbook.Sheets[sheetName];
    const standards = sheetNameToStandards(sheetName);
    if (standards.length === 0) continue;

    const mg = extractMarkGradeSubjectsFromSheet(sh);
    sheetSubjects.push({ standards, mark: mg.mark, grade: mg.grade });
  }

  // Collect all standard names we will touch
  const allStandardNames = [...new Set(sheetSubjects.flatMap((x) => x.standards))];

  if (dryRun) {
    console.log(`Dry-run subject extraction from ${basename(reportcardPath)}:`);
    for (const entry of sheetSubjects) {
      console.log(`  Standards ${entry.standards.join(", ")}: mark=${entry.mark.length}, grade=${entry.grade.length}`);
    }
    // print for I as a sanity example
    const iEntry = sheetSubjects.find((e) => e.standards.includes("I"));
    if (iEntry) {
      console.log("  Standard I mark subjects:", iEntry.mark);
      console.log("  Standard I grade subjects:", iEntry.grade);
    }
    return;
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: standardRows, error: stdErr } = await supabase
    .from("standards")
    .select("id, name")
    .in("name", allStandardNames);
  if (stdErr) throw stdErr;
  const standardByName = new Map((standardRows ?? []).map((r) => [r.name as string, r.id as string]));

  const missing = allStandardNames.filter((n) => !standardByName.get(n));
  if (missing.length) {
    throw new Error(`Standards missing in DB: ${missing.join(", ")}`);
  }

  for (const entry of sheetSubjects) {
    for (const stdName of entry.standards) {
      const standardId = standardByName.get(stdName)!;

      const rows: { standard_id: string; name: string; evaluation_type: "mark" | "grade"; sort_order: number }[] = [];
      let sort = 1;
      for (const n of entry.mark) rows.push({ standard_id: standardId, name: n, evaluation_type: "mark", sort_order: sort++ });
      for (const n of entry.grade) rows.push({ standard_id: standardId, name: n, evaluation_type: "grade", sort_order: sort++ });

      const { error: upErr } = await supabase.from("subjects").upsert(rows, { onConflict: "standard_id,name" });
      if (upErr) throw upErr;

      console.log(`Upserted subjects for ${stdName}: ${rows.length}`);
    }
  }
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});

