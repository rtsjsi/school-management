/**
 * Import students from Student List 2025-26.xls (Angel school format).
 * Uses branch-based env (same as seed). Creates student records and enrollments.
 * See docs/student-list-import-feasibility.md for field mapping.
 *
 * Run: npx tsx scripts/import-students-from-xls.ts [path/to/Student List 2025-26.xls]
 * Default path: d:\Angel School Management App Project\Student List 2025-26.xls
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

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

function initSupabaseFromEnv() {
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

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

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
const ROMAN_BY_NUM: Record<string, string> = {
  "1": "I",
  "2": "II",
  "3": "III",
  "4": "IV",
  "5": "V",
  "6": "VI",
  "7": "VII",
  "8": "VIII",
  "9": "IX",
  "10": "X",
  "11": "XI",
  "12": "XII",
};
for (let i = 1; i <= 12; i++) STANDARD_MAP[String(i)] = ROMAN_BY_NUM[String(i)];

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
  aadhar_no?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  religion?: string | null;
  blood_group?: string | null;
  roll_number?: number | null;
};

export function parseSheet(xlsPath: string): ParsedExcelRow[] {
  const wb = XLSX.readFile(xlsPath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

  // Detect AEMS class-wise sheet format (header row contains "RollNo" and "Gr_no").
  const headerIdx = rows.findIndex((r) => (r ?? []).some((c) => String(c ?? "").trim() === "RollNo") && (r ?? []).some((c) => String(c ?? "").trim() === "Gr_no"));
  if (headerIdx >= 0) {
    const headerRow = rows[headerIdx] ?? [];
    const idxOf = (name: string) => headerRow.findIndex((c) => String(c ?? "").trim() === name);
    const iRoll = idxOf("RollNo");
    const iGr = idxOf("Gr_no");
    const iName = idxOf("Name");
    const iGender = idxOf("Gender");
    const iMother = idxOf("MotherName");
    const iDob = idxOf("Birthdate");
    const iAadhar = idxOf("AdharCard");
    const iAddress = idxOf("Address");
    const iPhone = idxOf("PhMob");
    const iCategory = idxOf("Category");
    const iReligion = idxOf("Religion");
    const iFather = idxOf("FatherName");
    const iBlood = idxOf("BldGroup");

    const topText = rows.slice(0, headerIdx).flatMap((r) => (r ?? []).map((c) => String(c ?? "").trim())).filter(Boolean).join(" ");
    const classMatch = topText.match(/Class\s*-\s*([A-Za-z.0-9 ]+)/i);
    const fileBase = xlsPath.split(/[\\/]/).pop() ?? "";
    const divMatch = fileBase.match(/-([A-Z])-(?:Student-List)?\.(?:xls|xlsx)/i);

    const gradeRaw = (classMatch?.[1] ?? "").trim();
    const grade = (STANDARD_MAP[gradeRaw] ?? gradeRaw) || "Unknown";
    const division = (divMatch?.[1] ?? "A").trim();

    const out: ParsedExcelRow[] = [];

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      const cell = (idx: number) => (idx >= 0 && row[idx] != null ? String(row[idx]).trim() : "");

      const gr = cell(iGr);
      const name = cell(iName);
      const grNum = parseFloat(gr);
      if (!(Number.isFinite(grNum) && grNum > 0) || name.length < 2) continue;

      const dobRaw = iDob >= 0 ? row[iDob] : "";
      const dobStr = String(dobRaw ?? "").trim();
      const dob =
        dobStr && /^[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}$/.test(dobStr)
          ? (() => {
              const [d, m, y] = dobStr.split(".").map((p) => parseInt(p, 10));
              if (!y || !m || !d) return null;
              return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            })()
          : excelDateToISO(dobRaw);

      const mobile = cell(iPhone);
      const category = mapCategory(iCategory >= 0 ? row[iCategory] : "");
      const gender = mapGender(iGender >= 0 ? row[iGender] : "");
      const address = cell(iAddress);
      const aadharRaw = cell(iAadhar);
      const aadhar_no = aadharRaw ? aadharRaw.replace(/[^0-9]/g, "") || null : null;

      out.push({
        grade,
        division,
        roll_number: cell(iRoll) ? parseInt(cell(iRoll), 10) : null,
        gr: String(grNum),
        name,
        dob,
        mobile,
        mobile2: "",
        caste: "",
        category,
        gender,
        address,
        aadhar_no,
        father_name: cell(iFather) || null,
        mother_name: cell(iMother) || null,
        religion: cell(iReligion) || null,
        blood_group: cell(iBlood) || null,
      });
    }

    return out;
  }

  const out: ParsedExcelRow[] = [];
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
  const rawArgs = process.argv.slice(2);

  let dryRun = rawArgs.includes("--dry-run");
  let emitSqlPath: string | null = null;
  let academicYearName = "2025-26";
  const args: string[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a === "--dry-run") continue;
    if (a === "--emit-sql") {
      emitSqlPath = rawArgs[i + 1] ?? "students_import.sql";
      i++;
      continue;
    }
    if (a.startsWith("--emit-sql=")) {
      emitSqlPath = a.split("=", 2)[1] || "students_import.sql";
      continue;
    }
    if (a === "--academic-year-name") {
      academicYearName = rawArgs[i + 1] ?? academicYearName;
      i++;
      continue;
    }
    if (a.startsWith("--academic-year-name=")) {
      academicYearName = a.split("=", 2)[1] || academicYearName;
      continue;
    }
    args.push(a);
  }

  // When emitting SQL, never write to DB
  if (emitSqlPath) {
    dryRun = true;
  }

  const xlsPath = args[0] ?? DEFAULT_XLS_PATH;
  if (!existsSync(xlsPath)) {
    console.error("File not found:", xlsPath);
    console.error("Usage: npx tsx scripts/import-students-from-xls.ts [path/to/Student List 2025-26.xls] [--dry-run]");
    process.exit(1);
  }

  console.log("Reading", xlsPath);
  const rows = parseSheet(xlsPath);
  console.log("Parsed", rows.length, "student rows.");

  let activeYearId: string | null = null;
  let standardByName: Map<string, string> | null = null;
  let divisionByStdAndName: Map<string, string> | null = null;

  if (!emitSqlPath) {
    const supabase = initSupabaseFromEnv();

    const { data: activeYear } = await supabase
      .from("academic_years")
      .select("id, name")
      .eq("status", "active")
      .maybeSingle();
    if (!activeYear) {
      console.error("No active academic year in DB. Set one in Settings / Academic years.");
      process.exit(1);
    }

    activeYearId = activeYear.id;
    academicYearName = activeYear.name;

    const { data: standards } = await supabase.from("standards").select("id, name");
    standardByName = new Map<string, string>((standards ?? []).map((s) => [s.name, s.id]));

    const { data: allDivisions } = await supabase.from("standard_divisions").select("id, standard_id, name");
    divisionByStdAndName = new Map<string, string>();
    for (const d of allDivisions ?? []) {
      divisionByStdAndName.set(`${d.standard_id}:${d.name}`, d.id);
    }
  }
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  const sqlChunks: string[] = [];

  function sqlValue(val: unknown): string {
    if (val === null || val === undefined) return "NULL";
    if (typeof val === "number" && Number.isFinite(val)) return String(val);
    const s = String(val);
    return `'${s.replace(/'/g, "''")}'`;
  }

  for (const row of rows) {
    // In emit-sql mode, we resolve standard/division IDs at runtime via name lookup.
    let standardId: string | null = null;
    let divisionId: string | null = null;
    if (!emitSqlPath && standardByName && divisionByStdAndName) {
      standardId = standardByName.get(row.grade) ?? null;
      if (!standardId) {
        errors.push(`Standard "${row.grade}" not found for ${row.name} (GR ${row.gr}).`);
        skipped++;
        continue;
      }
      divisionId = divisionByStdAndName.get(`${standardId}:${row.division}`) ?? null;
      if (!divisionId) {
        errors.push(`Division "${row.division}" for ${row.grade} not found for ${row.name} (GR ${row.gr}).`);
        skipped++;
        continue;
      }
    }

    const studentId = `STU-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const student = {
      student_id: studentId,
      full_name: row.name.trim(),
      date_of_birth: row.dob,
      gender: row.gender,
      blood_group: row.blood_group ?? null,
      category: row.category,
      religion: row.religion ?? null,
      caste: row.caste || null,
      present_address_line1: row.address || null,
      present_city: null,
      present_district: null,
      present_state: null,
      present_pincode: null,
      present_country: "India",
      aadhar_no: row.aadhar_no ?? null,
      pen_no: null,
      apaar_id: null,
      udise_id: null,
      gr_number: row.gr,
      whatsapp_no: row.mobile || row.mobile2 || null,
      parent_contact: row.mobile || null,
      mother_contact: row.mobile2 || null,
      academic_year: academicYearName,
      roll_number: row.roll_number ?? (parseInt(row.gr, 10) || null),
      standard: row.grade,
      division: row.division,
      status: "active",
      admission_date: null,
      father_name: row.father_name ?? null,
      mother_name: row.mother_name ?? null,
      fee_concession_amount: null,
      fee_concession_reason: null,
      // notes removed
    };

    if (emitSqlPath) {
      const cols = [
        "student_id",
        "full_name",
        "date_of_birth",
        "gender",
        "blood_group",
        "category",
        "religion",
        "caste",
        "present_address_line1",
        "present_city",
        "present_district",
        "present_state",
        "present_pincode",
        "present_country",
        "aadhar_no",
        "pen_no",
        "apaar_id",
        "udise_id",
        "gr_number",
        "whatsapp_no",
        "parent_contact",
        "mother_contact",
        "academic_year",
        "roll_number",
        "standard",
        "division",
        "status",
        "admission_date",
        "father_name",
        "mother_name",
        "fee_concession_amount",
        "fee_concession_reason",
      ];

      const vals = [
        sqlValue(student.student_id),
        sqlValue(student.full_name),
        sqlValue(student.date_of_birth),
        sqlValue(student.gender),
        sqlValue(student.blood_group),
        sqlValue(student.category),
        sqlValue(student.religion),
        sqlValue(student.caste),
        sqlValue(student.present_address_line1),
        sqlValue(student.present_city),
        sqlValue(student.present_district),
        sqlValue(student.present_state),
        sqlValue(student.present_pincode),
        sqlValue(student.present_country),
        sqlValue(student.aadhar_no),
        sqlValue(student.pen_no),
        sqlValue(student.apaar_id),
        sqlValue(student.udise_id),
        sqlValue(student.gr_number),
        sqlValue(student.whatsapp_no),
        sqlValue(student.parent_contact),
        sqlValue(student.mother_contact),
        sqlValue(student.academic_year),
        sqlValue(student.roll_number),
        sqlValue(student.standard),
        sqlValue(student.division),
        sqlValue(student.status),
        sqlValue(student.admission_date),
        sqlValue(student.father_name),
        sqlValue(student.mother_name),
        sqlValue(student.fee_concession_amount),
        sqlValue(student.fee_concession_reason),
      ];

      const enrollVals = [
        `(SELECT id FROM public.academic_years WHERE name = ${sqlValue(academicYearName)} LIMIT 1)`,
        `(SELECT id FROM public.standards WHERE name = ${sqlValue(row.grade)} LIMIT 1)`,
        `(
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = ${sqlValue(row.grade)} AND sd.name = ${sqlValue(row.division)}
          LIMIT 1
        )`,
        sqlValue("active"),
      ];

      const sql = [
        "WITH s AS (",
        `  INSERT INTO public.students (${cols.join(", ")})`,
        `  VALUES (${vals.join(", ")})`,
        "  RETURNING id",
        ")",
        "INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)",
        `SELECT id, ${enrollVals.join(", ")} FROM s;`,
        "",
      ].join("\n");

      sqlChunks.push(sql);
      inserted++;
      continue;
    }

    if (dryRun) {
      inserted++;
      continue;
    }

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

  if (emitSqlPath) {
    writeFileSync(emitSqlPath, sqlChunks.join("\n"), { encoding: "utf8" });
    console.log("SQL written to", emitSqlPath);
    console.log("Generated statements for", inserted, "students. No DB writes were performed.");
    if (errors.length > 0) {
      console.error("Errors (first 20):");
      errors.slice(0, 20).forEach((e) => console.error(" ", e));
      if (errors.length > 20) console.error(" ... and", errors.length - 20, "more.");
    }
    return;
  }

  if (dryRun) {
    console.log("Dry run: no DB writes. Sample:", rows[0]);
    console.log("Would process", inserted + skipped, "rows.");
    if (errors.length > 0) {
      console.error("Errors (first 20):");
      errors.slice(0, 20).forEach((e) => console.error(" ", e));
      if (errors.length > 20) console.error(" ... and", errors.length - 20, "more.");
    }
    return;
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
