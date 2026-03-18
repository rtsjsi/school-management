/**
 * Shared logic for student import: env loading, Supabase client, and reference maps.
 * Used by student-import-maps.ts and import-students-from-csv.ts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

export function getRepoRoot(): string {
  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    const root = join(dir, "..", ".."); // scripts/lib -> project root
    if (existsSync(join(root, ".env.development")) || existsSync(join(root, ".env.main"))) {
      return root;
    }
  } catch {
    // no import.meta.url
  }
  return process.cwd();
}

export function loadEnvFile(repoRoot: string, fileName: string): Record<string, string> {
  const p = join(repoRoot, fileName);
  if (!existsSync(p)) return {};
  const out: Record<string, string> = {};
  let content = readFileSync(p, "utf8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim().replace(/^\s*export\s+/i, "");
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key) out[key] = value;
  }
  return out;
}

export function getCurrentBranch(repoRoot: string): string | null {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", cwd: repoRoot }).trim();
  } catch {
    return null;
  }
}

export type StudentImportMapsResult = {
  academicYearByName: Map<string, string>;
  standardByName: Map<string, string>;
  divisionByStandardIdAndName: Map<string, string>;
  divisionByStandardNameAndName: Map<string, string>;
  academicYearRows: { id: string; name: string; status: string | null }[];
  failures: string[];
};

function mapKey(standardId: string, divisionName: string): string {
  return `${standardId}:${divisionName}`;
}

function mapKeyByNames(standardName: string, divisionName: string): string {
  return `${standardName}:${divisionName}`;
}

export async function buildStudentImportMaps(
  supabase: SupabaseClient
): Promise<StudentImportMapsResult> {
  const failures: string[] = [];

  const { data: academicYears, error: ayError } = await supabase
    .from("academic_years")
    .select("id, name, status");

  if (ayError) {
    failures.push(`academic_years: query failed — ${ayError.message}`);
  } else if (!academicYears || academicYears.length === 0) {
    failures.push("academic_years: table is empty. Add at least one academic year (e.g. 2025-2026).");
  }

  const academicYearRows = (academicYears ?? []) as { id: string; name: string; status: string | null }[];

  const { data: standards, error: stdError } = await supabase.from("standards").select("id, name");

  if (stdError) {
    failures.push(`standards: query failed — ${stdError.message}`);
  } else if (!standards || standards.length === 0) {
    failures.push(
      "standards: table is empty. Run supabase/manual/insert_standards_prod.sql (or equivalent)."
    );
  }

  const standardRows = (standards ?? []) as { id: string; name: string }[];

  const { data: standardDivisions, error: divError } = await supabase
    .from("standard_divisions")
    .select("id, standard_id, name");

  if (divError) {
    failures.push(`standard_divisions: query failed — ${divError.message}`);
  } else if (!standardDivisions || standardDivisions.length === 0) {
    failures.push(
      "standard_divisions: table is empty. Run supabase/manual/insert_standard_divisions_prod.sql (or equivalent)."
    );
  }

  const divisionRows = (standardDivisions ?? []) as { id: string; standard_id: string; name: string }[];

  const academicYearByName = new Map<string, string>();
  for (const row of academicYearRows) {
    if (row.name != null && row.name !== "") {
      academicYearByName.set(row.name.trim(), row.id);
    } else {
      failures.push(`academic_years: row with id ${row.id} has empty name; skipped.`);
    }
  }

  const standardByName = new Map<string, string>();
  for (const row of standardRows) {
    if (row.name != null && row.name !== "") {
      standardByName.set(row.name.trim(), row.id);
    } else {
      failures.push(`standards: row with id ${row.id} has empty name; skipped.`);
    }
  }

  const divisionByStandardIdAndName = new Map<string, string>();
  const divisionByStandardNameAndName = new Map<string, string>();
  const standardIdToName = new Map<string, string>();
  for (const s of standardRows) {
    standardIdToName.set(s.id, s.name);
  }
  for (const row of divisionRows) {
    if (row.name != null && row.name !== "") {
      divisionByStandardIdAndName.set(mapKey(row.standard_id, row.name.trim()), row.id);
      const stdName = standardIdToName.get(row.standard_id);
      if (stdName != null) {
        divisionByStandardNameAndName.set(mapKeyByNames(stdName, row.name.trim()), row.id);
      } else {
        failures.push(
          `standard_divisions: division "${row.name}" (id ${row.id}) references unknown standard_id ${row.standard_id}; name lookup will fail for this division.`
        );
      }
    } else {
      failures.push(`standard_divisions: row with id ${row.id} has empty name; skipped.`);
    }
  }

  const hasActiveYear = academicYearRows.some((ay) => ay.status === "active");
  if (academicYearRows.length > 0 && !hasActiveYear) {
    failures.push(
      "academic_years: no row with status = 'active'. Set one in Settings / Academic years if you need a current year."
    );
  }

  return {
    academicYearByName,
    standardByName,
    divisionByStandardIdAndName,
    divisionByStandardNameAndName,
    academicYearRows,
    failures,
  };
}
