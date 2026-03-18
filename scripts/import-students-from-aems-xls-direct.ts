/**
 * Import students from class-wise "Angel School Student List" XLS files.
 *
 * Example filename:
 *   NURSERY-A-Student-List.xls
 *
 * This script:
 * 1) Builds reference maps (academic_years, standards, standard_divisions)
 * 2) Resolves standard/division from filename (or --standard/--division overrides)
 * 3) Parses the sheet (expects a header row containing RollNo and Gr_no)
 * 4) Upserts each student (by deterministic student_id)
 * 5) Ensures there is an active enrollment for (student, academic_year) with the resolved standard/division
 *
 * Run:
 *   npm run student-import-maps
 *   npx tsx scripts/import-students-from-aems-xls-direct.ts "d:\\...\\NURSERY-A-Student-List.xls" --dry-run
 *   npx tsx scripts/import-students-from-aems-xls-direct.ts "d:\\...\\NURSERY-A-Student-List.xls"
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "fs";
import { join, basename, extname } from "path";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getRepoRoot,
  loadEnvFile,
  getCurrentBranch,
  buildStudentImportMaps,
} from "./lib/student-import-shared";

const repoRoot = getRepoRoot();

function normalizeStandardToken(token: string): string | null {
  const t = token.trim().toUpperCase().replace(/\./g, "");
  if (!t) return null;
  if (t === "NUR" || t === "NURSERY") return "Nursery";
  if (t === "JRKG" || t === "LKG" || t === "JUNIORKG") return "Junior KG (LKG)";
  if (t === "SRKG" || t === "UKG" || t === "SENIORKG") return "Senior KG (UKG)";

  // I..XII
  if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/.test(t)) return t;

  // 1..12 -> roman
  const n = Number(t);
  if (Number.isFinite(n) && n >= 1 && n <= 12) {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][n];
    return roman || null;
  }

  return null;
}

function parseStandardDivisionFromFilename(filePath: string): { standard: string; division: string } | null {
  const base = basename(filePath, extname(filePath));
  // Common pattern: <STANDARD>-<DIV>-Student-List
  const tokens = base.split(/[-_]/).map((s) => s.trim()).filter(Boolean);

  const idxStudent = tokens.findIndex((t) => t.toLowerCase().includes("student"));
  if (idxStudent >= 2) {
    const divisionToken = tokens[idxStudent - 1];
    const standardToken = tokens[idxStudent - 2];
    const standard = normalizeStandardToken(standardToken);
    const division = divisionToken.toUpperCase().slice(0, 1);
    if (standard && /^[A-Z]$/.test(division)) return { standard, division };
  }

  // Fallback: regex
  const m = base.match(/(.+?)-([A-Z])-.*student/i);
  if (m) {
    const standard = normalizeStandardToken(m[1]);
    const division = m[2].toUpperCase();
    if (standard && /^[A-Z]$/.test(division)) return { standard, division };
  }

  return null;
}

function parseDDMMYYYYWithDotsOrDashes(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  // Accept: 11.1.2022, 23.11.2021, 01-02-2020, etc.
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mon = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (!d || !mon || !y) return null;
  if (mon < 1 || mon > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function mapGender(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  if (!s) return null;
  if (s === "M" || s === "MALE") return "male";
  if (s === "F" || s === "FEMALE") return "female";
  return "other";
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

function cleanAadhar(raw: string): string | null {
  const digits = raw.trim().replace(/\*/g, "").replace(/\D/g, "");
  return digits.length === 12 ? digits : digits.length ? digits : null;
}

function firstPhone(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // Handle "7435... / 9879..." or "7435..., 9879..."
  const parts = s.split(/[\/\s,]+/).map((p) => p.trim()).filter(Boolean);
  const digits = parts[0] ? parts[0].replace(/\D/g, "") : "";
  if (digits.length >= 10) return digits;
  return digits || null;
}

function standardSlug(standardName: string): string {
  if (standardName === "Nursery") return "NUR";
  if (standardName === "Junior KG (LKG)") return "JKG";
  if (standardName === "Senior KG (UKG)") return "SKG";
  return standardName.replace(/\s+/g, "").toUpperCase();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error(
      "Usage: npx tsx scripts/import-students-from-aems-xls-direct.ts <path-to.xls> [--standard <name>] [--division <A>] [--academic-year <name>] [--dry-run]"
    );
    process.exit(1);
  }

  let filePathArg = "";
  let standardOverride = "";
  let divisionOverride = "";
  let academicYearOverride = "";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) {
      filePathArg = a;
      continue;
    }
    if (a === "--standard") {
      standardOverride = args[i + 1] ?? "";
      i++;
      continue;
    }
    if (a === "--division") {
      divisionOverride = args[i + 1] ?? "";
      i++;
      continue;
    }
    if (a === "--academic-year") {
      academicYearOverride = args[i + 1] ?? "";
      i++;
      continue;
    }
    if (a === "--dry-run") {
      dryRun = true;
      continue;
    }
  }

  if (!filePathArg) {
    console.error("Missing XLS path.");
    process.exit(1);
  }

  const resolvedPath = filePathArg.includes(":") ? filePathArg : join(process.cwd(), filePathArg);
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
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in", branchFile, "or .env.local");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });

  const mapsResult = await buildStudentImportMaps(supabase);
  if (mapsResult.failures.length > 0) {
    console.error("Map failures (run student-import-maps):");
    mapsResult.failures.forEach((f) => console.error("  •", f));
    process.exit(1);
  }

  // Resolve academic year
  const activeAcademicYearId =
    (academicYearOverride && mapsResult.academicYearByName.get(academicYearOverride)) ||
    mapsResult.academicYearRows.find((r) => r.status === "active")?.id ||
    mapsResult.academicYearRows[0]?.id;

  if (!activeAcademicYearId) {
    console.error("Could not resolve academic year id (active or first).");
    process.exit(1);
  }

  const resolvedAcademicYearName =
    academicYearOverride || mapsResult.academicYearRows.find((r) => r.id === activeAcademicYearId)?.name || academicYearOverride;

  // Resolve standard/division from filename or overrides
  const parsed = parseStandardDivisionFromFilename(resolvedPath);
  const standardName = standardOverride || parsed?.standard || "";
  const divisionName = (divisionOverride || parsed?.division || "A").toUpperCase().slice(0, 1);

  if (!standardName) {
    console.error("Could not infer standard from filename. Provide --standard <name>.");
    process.exit(1);
  }
  if (!/^[A-Z]$/.test(divisionName)) {
    console.error("Division must be a single letter like A/B. Got:", divisionName);
    process.exit(1);
  }

  const standardId = mapsResult.standardByName.get(standardName.trim());
  if (!standardId) {
    console.error(`Standard "${standardName}" not found in DB (exact match required).`);
    process.exit(1);
  }

  const divisionId = mapsResult.divisionByStandardNameAndName.get(`${standardName.trim()}:${divisionName}`);
  if (!divisionId) {
    console.error(`Division "${divisionName}" for standard "${standardName}" not found in DB.`);
    process.exit(1);
  }

  // --- Parse XLS ---
  const workbook = XLSX.readFile(resolvedPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

  const headerRowIdx = grid.findIndex((r) => {
    const cells = (r ?? []).map((c) => String(c ?? "").trim());
    const hasRollNo = cells.some((c) => c === "RollNo");
    const hasGrNo = cells.some((c) => c.toLowerCase() === "gr_no");
    return hasRollNo && hasGrNo;
  });

  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  const header = (headerRowIdx >= 0 ? (grid[headerRowIdx] ?? []) : []) as unknown[];

  const normHeader = (s: unknown): string => {
    return String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/\./g, "");
  };

  const idxOf = (name: string): number => {
    const n = normHeader(name);
    for (let i = 0; i < header.length; i++) {
      if (normHeader((header as any)[i]) === n) return i;
    }
    return -1;
  };

  const idxOfAny = (names: string[]): number => {
    for (const n of names) {
      const idx = idxOf(n);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const iRoll = idxOf("RollNo");
  const iGr = idxOf("Gr_no");
  const iName = idxOf("Name");

  // Gender column differs in some files (e.g. XI uses "M/F")
  const iGender = idxOfAny(["Gender", "M/F"]);
  const iMother = idxOfAny(["MotherName", "Mother Name"]);
  const iDob = idxOfAny(["Birthdate"]);

  const iAdhar = idxOfAny(["AdharCard", "AadharCard", "Aadharcard"]);
  const iAddress = idxOfAny(["Address", "Adress"]);
  const iPh = idxOfAny(["PhMob", "MobileNo", "Mobile No", "MobileNo."]);

  // Category header differs in some files (e.g. XI uses "Caste")
  const iCategory = idxOfAny(["Category", "Caste"]);
  const iReligion = idxOfAny(["Religion"]);
  const iFather = idxOfAny(["FatherName", "Father Name"]);
  const iBlood = idxOfAny(["BldGroup", "Bld Group", "Bldgroup"]);

  // If we couldn't detect columns, fail fast.
  if (iRoll < 0 || iGr < 0 || iName < 0 || iGender < 0 || iDob < 0) {
    console.error("Could not find expected header columns in XLS sheet.");
    console.error("Sheet:", sheetName, "headerRowIdx:", headerRowIdx);
    console.error("Detected indices:", { iRoll, iGr, iName, iGender, iDob, iAdhar, iBlood });
    process.exit(1);
  }

  const errors: string[] = [];
  let parsedCount = 0;
  let upsertedCount = 0;

  const yearStart = (resolvedAcademicYearName.split("-")[0] || "").trim() || resolvedAcademicYearName.replace(/[^0-9]/g, "");
  const deterministicStudentId = (keyNumber: number) =>
    `STU-${yearStart}-${standardSlug(standardName)}-${divisionName}-${Math.floor(keyNumber)}`.slice(0, 50);

  for (let r = startRow; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const cell = (idx: number): string => {
      if (idx < 0) return "";
      const v = (row as any)[idx];
      return v == null ? "" : String(v).trim();
    };

    const grRaw = cell(iGr);
    const name = cell(iName);
    if (!name || name.length < 2) continue;

    const rollRaw = cell(iRoll);
    const rollNum = rollRaw ? parseInt(rollRaw, 10) : null;

    // Skip repeated header-like rows (e.g. when "Gr_no"/"Name" appears again inside the sheet).
    if (name.trim().toLowerCase() === "name" && String(grRaw ?? "").toLowerCase().includes("gr")) {
      continue;
    }

    // GR number can be numeric (older files) or alphanumeric (e.g. "HS001" for Class-11).
    if (!grRaw) {
      errors.push(`Row ${r + 1}: missing Gr_no for ${name}`);
      continue;
    }

    const grNum = Number(grRaw);
    const numericKey =
      rollNum != null && Number.isFinite(rollNum)
        ? rollNum
        : Number.isFinite(grNum) && grNum > 0
          ? grNum
          : r + 1; // last resort fallback to keep deterministic per-row

    const student_id = deterministicStudentId(numericKey);
    const dob = parseDDMMYYYYWithDotsOrDashes(cell(iDob));
    const gender = mapGender(cell(iGender));
    const category = mapCategory(cell(iCategory));
    const religion = cell(iReligion) || null;
    const father_name = cell(iFather) || null;
    const mother_name = cell(iMother) || null;
    const blood_group = cell(iBlood) ? cell(iBlood).trim() : null;
    const address = cell(iAddress) || null;
    const aadhar_no = cleanAadhar(cell(iAdhar));
    const phone = firstPhone(cell(iPh));

    parsedCount++;

    if (dryRun) continue;

    const studentPayload = {
      student_id,
      full_name: name,
      date_of_birth: dob,
      gender,
      blood_group: blood_group || null,
      category,
      religion,
      caste: null,
      present_address_line1: address,
      present_city: null,
      present_district: null,
      present_state: null,
      present_pincode: null,
      present_country: "India",
      aadhar_no,
      pen_no: null,
      apaar_id: null,
      udise_id: null,
      gr_number: grRaw,
      whatsapp_no: phone,
      parent_contact: phone,
      mother_contact: null,
      academic_year: resolvedAcademicYearName,
      roll_number: rollNum == null || !Number.isFinite(rollNum) ? null : rollNum,
      standard: standardName.trim(),
      division: divisionName.trim(),
      status: "active",
      admission_date: null,
      father_name,
      mother_name,
      fee_concession_amount: null,
      fee_concession_reason: null,
    };

    const { data: upserted, error: upErr } = await supabase
      .from("students")
      .upsert(studentPayload, { onConflict: "student_id" })
      .select("id, student_id")
      .single();

    if (upErr || !upserted) {
      errors.push(`Row ${r + 1} ${name} (GR ${Math.floor(grNum)}): student upsert failed: ${upErr?.message ?? "unknown error"}`);
      continue;
    }

    // Ensure active enrollment for (student, academic_year)
    const { data: existingEnroll, error: existErr } = await supabase
      .from("student_enrollments")
      .select("id")
      .eq("student_id", upserted.id)
      .eq("academic_year_id", activeAcademicYearId)
      .eq("status", "active")
      .maybeSingle();

    if (existErr) {
      errors.push(`Row ${r + 1} ${name}: enrollment lookup failed: ${existErr.message}`);
      continue;
    }

    if (existingEnroll?.id) {
      const { error: updErr } = await supabase
        .from("student_enrollments")
        .update({
          standard_id: standardId,
          division_id: divisionId,
          status: "active",
        })
        .eq("id", existingEnroll.id);

      if (updErr) {
        errors.push(`Row ${r + 1} ${name}: enrollment update failed: ${updErr.message}`);
      }
    } else {
      const { error: insErr } = await supabase.from("student_enrollments").insert({
        student_id: upserted.id,
        academic_year_id: activeAcademicYearId,
        standard_id: standardId,
        division_id: divisionId,
        status: "active",
      });

      if (insErr) {
        errors.push(`Row ${r + 1} ${name}: enrollment insert failed: ${insErr.message}`);
      } else {
        upsertedCount++;
      }
    }
  }

  if (dryRun) {
    console.log(`Dry run: parsed ${parsedCount} rows from XLS for ${standardName}-${divisionName}.`);
    if (errors.length) {
      console.log(`Dry run reported ${errors.length} issues (no DB writes). Showing up to 20:`);
      errors.slice(0, 20).forEach((e) => console.log("  •", e));
      if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more.`);
    }
    return;
  }

  console.log(`Import complete: processed ${parsedCount} rows. Upserted/ensured enrollment: ${upsertedCount}.`);
  if (errors.length) {
    console.log(`Encountered ${errors.length} errors (showing up to 30):`);
    errors.slice(0, 30).forEach((e) => console.log("  •", e));
    if (errors.length > 30) console.log(`  ... and ${errors.length - 30} more.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

