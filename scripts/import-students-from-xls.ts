/**
 * Import students from Student List 2025-26.xls (Angel school format).
 * Uses branch-based env (same as seed). Creates student records and enrollments.
 * See docs/student-list-import-feasibility.md for field mapping.
 *
 * Run: npx tsx scripts/import-students-from-xls.ts [path/to/Student List 2025-26.xls]
 * Default path: d:\Angel School Management App Project\Student List 2025-26.xls
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import * as XLSX from "xlsx";

const repoRoot = process.cwd();

function loadEnvFile(fileName: string): Record<string, string> {
  const p = join(repoRoot, fileName);
  if (!existsSync(p)) return {};
  const out: Record<string, string> = {};
  readFileSync(p, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    });
  return out;
}

function getCurrentBranch(): string | null {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", cwd: repoRoot }).trim();
  } catch {
    return null;
  }
}

const branch = getCurrentBranch();
const branchFile = branch === "main" ? ".env.main" : ".env.development";
const branchEnv = loadEnvFile(branchFile);
const localEnv = loadEnvFile(".env.local");
Object.entries(branchEnv).forEach(([k, v]) => (process.env[k] = v));
Object.entries(localEnv).forEach(([k, v]) => (process.env[k] = v));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in", branchFile, "or .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Default path to the Excel file (override with first CLI arg). */
export const DEFAULT_XLS_PATH =
  process.platform === "win32"
    ? "d:\\Angel School Management App Project\\Student List 2025-26.xls"
    : join(repoRoot, "Student List 2025-26.xls");

const STANDARD_MAP: Record<string, string> = {
  NUR: "Nursery",
  "JR.KG.": "Junior KG (LKG)",
  "SR.KG.": "Senior KG (UKG)",
};
for (let i = 1; i <= 12; i++) STANDARD_MAP[String(i)] = String(i);

function excelDateToISO(val: unknown): string | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  try {
    const d = XLSX.SSF.parse_date_code(n);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  } catch {
    // fallback: treat as days since 1900-01-01
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + n * 86400000);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return null;
}

function mapCategory(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toUpperCase();
  if (!s) return null;
  const map: Record<string, string> = {
    "S.T": "st",
    "S.C": "sc",
    GENERAL: "general",
    "O.B.C": "obc",
    OBC: "obc",
    OTHER: "other",
  };
  return map[s] ?? s.toLowerCase();
}

function mapGender(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "M") return "male";
  if (s === "F") return "female";
  return s ? "other" : null;
}

export type ParsedExcelRow = {
  grade: string;
  division: string;
  gr: string;
  name: string;
  dob: string | null;
  mobile: string;
  mobile2: string;
  caste: string;
  category: string | null;
  gender: string | null;
  address: string;
};

export function parseSheet(xlsPath: string): ParsedExcelRow[] {
  const wb = XLSX.readFile(xlsPath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

  const out: { grade: string; division: string; gr: string; name: string; dob: string | null; mobile: string; mobile2: string; caste: string; category: string | null; gender: string | null; address: string }[] = [];
  let curGrade = "";
  let curDivision = "";

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const cell = (c: number) => (row[c] != null ? String(row[c]).trim() : "");

    const col2 = cell(2);
    if (col2.includes("Std :-")) {
      const parts = col2.replace("Std :-", "").trim().split("-").map((s) => s.trim());
      const stdRaw = parts[0] ?? "";
      curGrade = STANDARD_MAP[stdRaw] ?? stdRaw;
      curDivision = parts[parts.length - 1] ?? "A";
      continue;
    }

    const gr = cell(1);
    const name = cell(4);
    const grNum = parseFloat(gr);
    if (!(Number.isFinite(grNum) && grNum > 0) || name.length < 2) continue;
    if (name.toLowerCase() === "name") continue;

    const dob = excelDateToISO(row[8]);
    const mobile = cell(9);
    const mobile2 = cell(10);
    const caste = cell(12);
    const category = mapCategory(row[14]);
    const gender = mapGender(row[16]);
    const address = cell(17);

    out.push({
      grade: curGrade,
      division: curDivision,
      gr: String(grNum),
      name,
      dob,
      mobile,
      mobile2,
      caste,
      category,
      gender,
      address,
    });
  }

  return out;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const args = process.argv.filter((a) => a !== "--dry-run");
  const xlsPath = args[2] ?? DEFAULT_XLS_PATH;
  if (!existsSync(xlsPath)) {
    console.error("File not found:", xlsPath);
    console.error("Usage: npx tsx scripts/import-students-from-xls.ts [path/to/Student List 2025-26.xls] [--dry-run]");
    process.exit(1);
  }

  console.log("Reading", xlsPath);
  const rows = parseSheet(xlsPath);
  console.log("Parsed", rows.length, "student rows.");
  if (dryRun) {
    console.log("Dry run: no DB writes. Sample:", rows[0]);
    process.exit(0);
  }

  const { data: activeYear } = await supabase.from("academic_years").select("id, name").eq("is_active", true).maybeSingle();
  if (!activeYear) {
    console.error("No active academic year in DB. Set one in Settings / Academic years.");
    process.exit(1);
  }

  const { data: standards } = await supabase.from("standards").select("id, name");
  const standardByName = new Map<string, string>((standards ?? []).map((s) => [s.name, s.id]));

  const { data: allDivisions } = await supabase.from("divisions").select("id, standard_id, name");
  const divisionByStdAndName = new Map<string, string>();
  for (const d of allDivisions ?? []) {
    divisionByStdAndName.set(`${d.standard_id}:${d.name}`, d.id);
  }

  const academicYearName = activeYear.name;
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const standardId = standardByName.get(row.grade);
    if (!standardId) {
      errors.push(`Standard "${row.grade}" not found for ${row.name} (GR ${row.gr}).`);
      skipped++;
      continue;
    }
    const divisionId = divisionByStdAndName.get(`${standardId}:${row.division}`);
    if (!divisionId) {
      errors.push(`Division "${row.division}" for ${row.grade} not found for ${row.name} (GR ${row.gr}).`);
      skipped++;
      continue;
    }

    const studentId = `STU-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const student = {
      student_id: studentId,
      full_name: row.name.trim(),
      date_of_birth: row.dob,
      gender: row.gender,
      blood_group: null,
      category: row.category,
      religion: null,
      caste: row.caste || null,
      district: null,
      address: row.address || null,
      aadhar_no: null,
      pen_no: null,
      apaar_id: null,
      udise_id: null,
      gr_number: row.gr,
      whatsapp_no: row.mobile || row.mobile2 || null,
      parent_contact: row.mobile || null,
      mother_contact: row.mobile2 || null,
      admission_type: "regular",
      academic_year: academicYearName,
      roll_number: parseInt(row.gr, 10) || null,
      grade: row.grade,
      division: row.division,
      status: "active",
      admission_date: null,
      father_name: null,
      mother_name: null,
      fee_concession_amount: null,
      fee_concession_reason: null,
      notes: `Imported from Student List 2025-26.xls (GR ${row.gr})`,
    };

    const { data: insertedRow, error } = await supabase.from("students").insert(student).select("id").single();
    if (error) {
      errors.push(`${row.name} (GR ${row.gr}): ${error.message}`);
      skipped++;
      continue;
    }

    const enrollError = await supabase.from("student_enrollments").insert({
      student_id: insertedRow.id,
      academic_year_id: activeYear.id,
      standard_id: standardId,
      division_id: divisionId,
      status: "active",
    });
    if (enrollError.error) {
      errors.push(`${row.name} (GR ${row.gr}): enrollment failed: ${enrollError.error.message}`);
    }
    inserted++;
  }

  console.log("Done. Inserted:", inserted, "Skipped:", skipped);
  if (errors.length > 0) {
    console.error("Errors (first 20):");
    errors.slice(0, 20).forEach((e) => console.error(" ", e));
    if (errors.length > 20) console.error(" ... and", errors.length - 20, "more.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
