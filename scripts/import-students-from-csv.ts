/**
 * Import students from a CSV/table file with columns matching the class list format:
 * RollNo, Gr_no, Name, Gender, MotherName, Birthdate, AdharCard, Address, PhMob, Category, Religion, FatherName, BldGroup
 *
 * Uses the same maps as student-import-maps. Standard and division are passed via CLI (one file = one class).
 *
 * Run: npx tsx scripts/import-students-from-csv.ts <path-to.csv> --standard "Nursery" --division A
 *      npx tsx scripts/import-students-from-csv.ts students.csv --standard "Junior KG (LKG)" --division A [--academic-year 2025-2026]
 *      npm run import-students-from-csv -- students.csv --standard Nursery --division A
 *
 * Optional: --academic-year 2025-2026 (default: use active academic year from DB)
 *           --dry-run (parse and report only, no DB writes)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  getRepoRoot,
  loadEnvFile,
  getCurrentBranch,
  buildStudentImportMaps,
} from "./lib/student-import-shared";

const repoRoot = getRepoRoot();

// --- CSV parse (handles quoted fields with commas) ---
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let end = i + 1;
      while (end < line.length) {
        const next = line.indexOf('"', end);
        if (next === -1) {
          end = line.length;
          break;
        }
        if (line[next + 1] === '"') {
          end = next + 2;
          continue;
        }
        end = next;
        break;
      }
      out.push(line.slice(i + 1, end).replace(/""/g, '"'));
      i = end + 1;
      if (i < line.length && line[i] === ",") i++;
      continue;
    }
    const comma = line.indexOf(",", i);
    if (comma === -1) {
      out.push(line.slice(i).trim());
      break;
    }
    out.push(line.slice(i, comma).trim());
    i = comma + 1;
  }
  return out;
}

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((l) => parseCSVLine(l));
  return { headers, rows };
}

// --- Table column names (match your screenshot) ---
const COL = {
  RollNo: "RollNo",
  Gr_no: "Gr_no",
  Name: "Name",
  Gender: "Gender",
  MotherName: "MotherName",
  Birthdate: "Birthdate",
  AdharCard: "AdharCard",
  Address: "Address",
  PhMob: "PhMob",
  Category: "Category",
  Religion: "Religion",
  FatherName: "FatherName",
  BldGroup: "BldGroup",
} as const;

function getCell(row: string[], headers: string[], col: string): string {
  const i = headers.findIndex((h) => h.trim() === col);
  if (i < 0 || i >= row.length) return "";
  return (row[i] ?? "").trim();
}

// --- Data mapping ---
function parseDateDDMMYYYY(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return null;
  const [, d, mon, y] = m;
  const day = parseInt(d!, 10);
  const month = parseInt(mon!, 10);
  const year = parseInt(y!, 10);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function mapCategory(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  if (!s) return null;
  const map: Record<string, string> = {
    "S.T": "st",
    "S.T.": "st",
    "S.C": "sc",
    "S.C.": "sc",
    GENERAL: "general",
    "O.B.C": "obc",
    "O.B.C.": "obc",
    OBC: "obc",
  };
  return map[s] ?? s.toLowerCase();
}

function mapGender(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  if (s === "M") return "male";
  if (s === "F") return "female";
  return s ? "other" : null;
}

function cleanAadhar(raw: string): string | null {
  const s = raw.trim().replace(/\*/g, "").replace(/\D/g, "");
  return s.length === 12 ? s : s || null;
}

function firstPhone(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const part = s.split(/[\s/]+/)[0]?.trim().replace(/\D/g, "") ?? "";
  return part.length >= 10 ? part : (part || null);
}

// --- Main ---
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let csvPath = "";
  let standardName = "";
  let divisionName = "A";
  let academicYearName = "";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--standard") {
      standardName = args[++i] ?? "";
      continue;
    }
    if (a === "--division") {
      divisionName = args[++i] ?? "A";
      continue;
    }
    if (a === "--academic-year") {
      academicYearName = args[++i] ?? "";
      continue;
    }
    if (a === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (!a.startsWith("--")) {
      csvPath = a;
    }
  }

  if (!csvPath || !standardName) {
    console.error("Usage: npx tsx scripts/import-students-from-csv.ts <file.csv> --standard <StandardName> [--division A] [--academic-year 2025-2026] [--dry-run]");
    console.error('Example: npx tsx scripts/import-students-from-csv.ts nursery-a.csv --standard Nursery --division A');
    process.exit(1);
  }

  const resolvedPath = join(process.cwd(), csvPath);
  if (!existsSync(resolvedPath)) {
    console.error("File not found:", resolvedPath);
    process.exit(1);
  }

  // Env and Supabase
  const branch = getCurrentBranch(repoRoot);
  const branchFile = branch === "main" ? ".env.main" : ".env.development";
  const branchEnv = loadEnvFile(repoRoot, branchFile);
  const localEnv = loadEnvFile(repoRoot, ".env.local");
  Object.entries(branchEnv).forEach(([k, v]) => (process.env[k] = v));
  Object.entries(localEnv).forEach(([k, v]) => (process.env[k] = v));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set in", branchFile, "or .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const mapsResult = await buildStudentImportMaps(supabase);
  if (mapsResult.failures.length > 0) {
    console.error("Map failures (run npm run student-import-maps for details):");
    mapsResult.failures.forEach((f) => console.error("  •", f));
    process.exit(1);
  }

  const {
    academicYearByName,
    standardByName,
    divisionByStandardNameAndName,
    academicYearRows,
  } = mapsResult;

  const academicYearId = academicYearName
    ? academicYearByName.get(academicYearName)
    : academicYearRows.find((r) => r.status === "active")?.id ?? academicYearRows[0]?.id;
  if (!academicYearId) {
    console.error(
      academicYearName
        ? `Academic year "${academicYearName}" not found.`
        : "No active or first academic year found."
    );
    process.exit(1);
  }
  const resolvedAcademicYearName = academicYearName || academicYearRows.find((r) => r.id === academicYearId)?.name ?? "";

  const standardId = standardByName.get(standardName.trim());
  if (!standardId) {
    console.error('Standard "' + standardName + '" not found. Use exact name from maps (e.g. Nursery, Junior KG (LKG)).');
    process.exit(1);
  }

  const divisionId = divisionByStandardNameAndName.get(`${standardName.trim()}:${divisionName.trim()}`);
  if (!divisionId) {
    console.error(`Division "${divisionName}" for standard "${standardName}" not found.`);
    process.exit(1);
  }

  let content = readFileSync(resolvedPath, "utf8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  const { headers, rows } = parseCSV(content);

  const requiredCols = [COL.RollNo, COL.Gr_no, COL.Name];
  const missing = requiredCols.filter((c) => !headers.some((h) => h.trim() === c));
  if (missing.length > 0) {
    console.error("CSV must have headers:", requiredCols.join(", "), ". Missing:", missing.join(", "));
    process.exit(1);
  }

  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const gr = getCell(row, headers, COL.Gr_no);
    const name = getCell(row, headers, COL.Name);
    if (!gr || !name || name.length < 2) continue;

    const studentId = `STU-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const dob = parseDateDDMMYYYY(getCell(row, headers, COL.Birthdate));
    const gender = mapGender(getCell(row, headers, COL.Gender));
    const category = mapCategory(getCell(row, headers, COL.Category));
    const aadhar = cleanAadhar(getCell(row, headers, COL.AdharCard));
    const phone = firstPhone(getCell(row, headers, COL.PhMob));
    const rollRaw = getCell(row, headers, COL.RollNo);
    const rollNumber = rollRaw ? parseInt(rollRaw, 10) : parseInt(gr, 10) || null;

    const student = {
      student_id: studentId,
      full_name: name,
      date_of_birth: dob,
      gender,
      blood_group: getCell(row, headers, COL.BldGroup) || null,
      category,
      religion: getCell(row, headers, COL.Religion) || null,
      caste: null,
      present_address_line1: getCell(row, headers, COL.Address) || null,
      present_city: null,
      present_district: null,
      present_state: null,
      present_pincode: null,
      present_country: "India",
      aadhar_no: aadhar,
      pen_no: null,
      apaar_id: null,
      udise_id: null,
      gr_number: gr,
      whatsapp_no: phone,
      parent_contact: phone,
      mother_contact: null,
      academic_year: resolvedAcademicYearName,
      roll_number: Number.isFinite(rollNumber) ? rollNumber : null,
      standard: standardName.trim(),
      division: divisionName.trim(),
      status: "active",
      admission_date: null,
      father_name: getCell(row, headers, COL.FatherName) || null,
      mother_name: getCell(row, headers, COL.MotherName) || null,
      fee_concession_amount: null,
      fee_concession_reason: null,
    };

    if (dryRun) {
      inserted++;
      continue;
    }

    const { data: insertedRow, error } = await supabase.from("students").insert(student).select("id").single();
    if (error) {
      errors.push(`Row ${i + 2} ${name} (GR ${gr}): ${error.message}`);
      continue;
    }

    const enrollError = await supabase.from("student_enrollments").insert({
      student_id: insertedRow.id,
      academic_year_id: academicYearId,
      standard_id: standardId,
      division_id: divisionId,
      status: "active",
    });
    if (enrollError.error) {
      errors.push(`Row ${i + 2} ${name} (GR ${gr}): enrollment failed: ${enrollError.error.message}`);
    } else {
      inserted++;
    }
  }

  if (dryRun) {
    console.log("Dry run: would import", inserted, "students for", standardName, divisionName);
    return;
  }

  console.log("Imported", inserted, "students.");
  if (errors.length > 0) {
    console.error("Errors:");
    errors.forEach((e) => console.error("  ", e));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
