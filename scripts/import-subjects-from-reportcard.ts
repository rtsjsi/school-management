/**
 * Import per-standard subjects from data_files/Reportcard.xlsx (Angel School layout).
 *
 * Each sheet groups multiple standards (e.g. "Class- I & II" → standards I and II).
 * Rows under the "Subjects" header until the co-scholastic divider (col A empty, col B starts with "Term")
 * are evaluation_type = "mark". Rows after that divider are "grade".
 *
 * If the same name appears in both sections (e.g. Computer), the grade-based row is stored as
 * "Name (Co-scholastic)" to satisfy UNIQUE(standard_id, name).
 *
 * Usage:
 *   npx tsx scripts/import-subjects-from-reportcard.ts [path/to/Reportcard.xlsx] [--dry-run]
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import { getRepoRoot, loadEnvFile, getCurrentBranch } from "./lib/student-import-shared";

const repoRoot = getRepoRoot();

/** Sheet name (exact) → DB standard names */
const SHEET_TO_STANDARDS: Record<string, string[]> = {
  "Class- I & II": ["I", "II"],
  "Class - III to V": ["III", "IV", "V"],
  "Class - VI to VIII": ["VI", "VII", "VIII"],
  "Class- IX & X": ["IX", "X"],
  "Class- XI& XII": ["XI", "XII"],
};

type ParsedSubject = {
  name: string;
  evaluation_type: "mark" | "grade";
  sort_order: number;
};

function cell(row: unknown[], i: number): string {
  const v = row[i];
  if (v == null) return "";
  return String(v).trim();
}

function isSubjectsHeaderRow(row: unknown[]): boolean {
  const a = cell(row, 0).toLowerCase().replace(/\s+/g, "");
  return a === "subjects";
}

/** Divider before co-scholastic / grade-only block: col A empty, col B like "Term-  1" */
function isTermDividerRow(row: unknown[]): boolean {
  const a = cell(row, 0);
  const b = cell(row, 1);
  if (a.length > 0) return false;
  return /^term/i.test(b);
}

function parseSubjectsFromSheet(grid: unknown[][]): ParsedSubject[] {
  const headerIdx = grid.findIndex((r) => isSubjectsHeaderRow(r ?? []));
  if (headerIdx < 0) return [];

  let mode: "mark" | "grade" = "mark";
  const markNames = new Set<string>();
  const out: ParsedSubject[] = [];

  const add = (rawName: string) => {
    const base = rawName.replace(/\s+/g, " ").trim();
    if (base.length < 2) return;
    if (base.toLowerCase() === "subjects") return;

    let name = base;
    if (mode === "mark") {
      markNames.add(base);
    } else if (markNames.has(base)) {
      name = `${base} (Co-scholastic)`;
    }

    out.push({ name, evaluation_type: mode, sort_order: out.length });
  };

  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    if (isTermDividerRow(row)) {
      mode = "grade";
      continue;
    }
    const col0 = cell(row, 0);
    if (!col0) continue;
    add(col0);
  }

  return out;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let fileArg = "data_files/Reportcard.xlsx";
  let dryRun = false;
  for (const a of args) {
    if (a === "--dry-run") dryRun = true;
    else if (!a.startsWith("--")) fileArg = a;
  }

  const resolvedPath = fileArg.includes(":") || fileArg.startsWith("/") || /^[A-Za-z]:\\/.test(fileArg)
    ? fileArg
    : join(process.cwd(), fileArg);

  if (!existsSync(resolvedPath)) {
    console.error("File not found:", resolvedPath);
    process.exit(1);
  }

  const branch = getCurrentBranch(repoRoot);
  const branchFile = branch === "main" ? ".env.main" : ".env.development";
  const branchEnv = loadEnvFile(repoRoot, branchFile);
  const localEnv = loadEnvFile(repoRoot, ".env.local");
  Object.entries(branchEnv).forEach(([k, v]) => (process.env[k] = v));
  Object.entries(localEnv).forEach(([k, v]) => (process.env[k] = v));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in", branchFile, "or .env.local");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: standards, error: stErr } = await supabase.from("standards").select("id, name");
  if (stErr || !standards?.length) {
    console.error("Failed to load standards:", stErr?.message);
    process.exit(1);
  }
  const standardIdByName = new Map(standards.map((s) => [s.name.trim(), s.id]));

  const workbook = XLSX.readFile(resolvedPath);
  let totalUpsert = 0;
  const errors: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const stdNames = SHEET_TO_STANDARDS[sheetName];
    if (!stdNames) {
      console.log(`Skip sheet (not mapped): ${sheetName}`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
    const parsed = parseSubjectsFromSheet(grid);
    if (parsed.length === 0) {
      errors.push(`Sheet "${sheetName}": no subjects parsed`);
      continue;
    }

    for (const stdName of stdNames) {
      const standardId = standardIdByName.get(stdName);
      if (!standardId) {
        errors.push(`Standard "${stdName}" not in DB (sheet ${sheetName})`);
        continue;
      }

      console.log(`Sheet "${sheetName}" → standard "${stdName}": ${parsed.length} subjects`);

      if (dryRun) {
        totalUpsert += parsed.length;
        continue;
      }

      for (const sub of parsed) {
        const { error } = await supabase.from("subjects").upsert(
          {
            standard_id: standardId,
            name: sub.name,
            evaluation_type: sub.evaluation_type,
            sort_order: sub.sort_order,
            code: null,
          },
          { onConflict: "standard_id,name" }
        );
        if (error) {
          errors.push(`${stdName} / ${sub.name}: ${error.message}`);
        } else {
          totalUpsert++;
        }
      }
    }
  }

  if (dryRun) {
    console.log(`Dry run: would upsert ${totalUpsert} subject rows (per standard × sheet).`);
  } else {
    console.log(`Done: upserted ${totalUpsert} subject rows.`);
  }
  if (errors.length) {
    console.error("Issues:");
    errors.forEach((e) => console.error(" •", e));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
