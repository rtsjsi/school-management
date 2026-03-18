/**
 * Import up to 100 students from docs/Students_Import_Template.csv into the database.
 * - Uses branch-based env selection (same logic as import-students-from-xls.ts).
 * - Creates student records in public.students.
 * - Creates enrollments in public.student_enrollments for the active academic year.
 *
 * Run (from repo root):
 *   npx tsx scripts/import-students-from-template.ts [--limit N]
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

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

const TEMPLATE_PATH = join(repoRoot, "docs", "Students_Import_Template.csv");

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === ",") {
        result.push(current);
        current = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

type CsvRow = {
  AcademicYear: string;
  Standard: string;
  Division: string;
  RollNumber: string;
  GRNumber: string;
  FullName: string;
  Gender: string;
  DateOfBirth: string;
  BloodGroup: string;
  Category: string;
  Address: string;
  District: string;
  Religion: string;
  Caste: string;
  BirthPlace: string;
  LastSchool: string;
  AadharNo: string;
  PENNo: string;
  APAARID: string;
  UDISEID: string;
  AdmissionType: string;
  AdmissionDate: string;
  FatherName: string;
  MotherName: string;
  ParentContact: string;
  MotherContact: string;
  ParentEmail: string;
  GuardianName: string;
  GuardianContact: string;
  GuardianEmail: string;
  EmergencyContactName: string;
  EmergencyContactNumber: string;
  WhatsAppNo: string;
  FeeConcessionAmount: string;
  FeeConcessionReason: string;
  Height: string;
  Weight: string;
  Hobby: string;
  SignOfIdentity: string;
  ReferName: string;
  FatherEducation: string;
  FatherOccupation: string;
  MotherEducation: string;
  MotherOccupation: string;
  AccountHolderName: string;
  BankName: string;
  BankBranch: string;
  BankIFSC: string;
  AccountNo: string;
  GuardianEducation: string;
  GuardianOccupation: string;
  SecondLanguage: string;
  Notes: string;
  IsRTEQuota: string;
};

function parseTemplate(limit: number): CsvRow[] {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error("Template CSV not found at", TEMPLATE_PATH);
    process.exit(1);
  }
  const content = readFileSync(TEMPLATE_PATH, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const header = parseCsvLine(lines[0]);
  const idx = (name: string) => header.indexOf(name);

  const out: CsvRow[] = [];
  for (let i = 1; i < lines.length && out.length < limit; i++) {
    const cols = parseCsvLine(lines[i]);
    const get = (name: string) => {
      const i = idx(name);
      return i >= 0 && i < cols.length ? cols[i] : "";
    };
    const FullName = get("FullName").trim();
    if (!FullName) continue;

    out.push({
      AcademicYear: get("AcademicYear"),
      Standard: get("Standard"),
      Division: get("Division"),
      RollNumber: get("RollNumber"),
      GRNumber: get("GRNumber"),
      FullName,
      Gender: get("Gender"),
      DateOfBirth: get("DateOfBirth"),
      BloodGroup: get("BloodGroup"),
      Category: get("Category"),
      Address: get("Address"),
      District: get("District"),
      Religion: get("Religion"),
      Caste: get("Caste"),
      BirthPlace: get("BirthPlace"),
      LastSchool: get("LastSchool"),
      AadharNo: get("AadharNo"),
      PENNo: get("PENNo"),
      APAARID: get("APAARID"),
      UDISEID: get("UDISEID"),
      AdmissionType: get("AdmissionType"),
      AdmissionDate: get("AdmissionDate"),
      FatherName: get("FatherName"),
      MotherName: get("MotherName"),
      ParentContact: get("ParentContact"),
      MotherContact: get("MotherContact"),
      ParentEmail: get("ParentEmail"),
      GuardianName: get("GuardianName"),
      GuardianContact: get("GuardianContact"),
      GuardianEmail: get("GuardianEmail"),
      EmergencyContactName: get("EmergencyContactName"),
      EmergencyContactNumber: get("EmergencyContactNumber"),
      WhatsAppNo: get("WhatsAppNo"),
      FeeConcessionAmount: get("FeeConcessionAmount"),
      FeeConcessionReason: get("FeeConcessionReason"),
      Height: get("Height"),
      Weight: get("Weight"),
      Hobby: get("Hobby"),
      SignOfIdentity: get("SignOfIdentity"),
      ReferName: get("ReferName"),
      FatherEducation: get("FatherEducation"),
      FatherOccupation: get("FatherOccupation"),
      MotherEducation: get("MotherEducation"),
      MotherOccupation: get("MotherOccupation"),
      AccountHolderName: get("AccountHolderName"),
      BankName: get("BankName"),
      BankBranch: get("BankBranch"),
      BankIFSC: get("BankIFSC"),
      AccountNo: get("AccountNo"),
      GuardianEducation: get("GuardianEducation"),
      GuardianOccupation: get("GuardianOccupation"),
      SecondLanguage: get("SecondLanguage"),
      Notes: get("Notes"),
      IsRTEQuota: get("IsRTEQuota"),
    });
  }

  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit"));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) || 100 : 100;

  const rows = parseTemplate(limit);
  console.log(`Loaded ${rows.length} student rows from template (limit ${limit}).`);
  if (!rows.length) {
    console.log("No rows to import.");
    return;
  }

  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("id, name")
    .eq("status", "active")
    .maybeSingle();
  if (!activeYear) {
    console.error("No active academic year in DB. Set one in Settings / Academic years.");
    process.exit(1);
  }

  const { data: standards } = await supabase.from("standards").select("id, name");
  const standardByName = new Map<string, string>((standards ?? []).map((s) => [s.name, s.id]));

  const { data: allDivisions } = await supabase.from("standard_divisions").select("id, standard_id, name");
  const divisionByStdAndName = new Map<string, string>();
  for (const d of allDivisions ?? []) {
    divisionByStdAndName.set(`${d.standard_id}:${d.name}`, d.id);
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const standardId = standardByName.get(row.Standard);
    if (!standardId) {
      errors.push(`Standard "${row.Standard}" not found for ${row.FullName} (GR ${row.GRNumber}).`);
      skipped++;
      continue;
    }
    const divisionId = divisionByStdAndName.get(`${standardId}:${row.Division}`);
    if (!divisionId) {
      errors.push(
        `Division "${row.Division}" for ${row.Standard} not found for ${row.FullName} (GR ${row.GRNumber}).`
      );
      skipped++;
      continue;
    }

    const studentId = `STU-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const rollNum = row.RollNumber ? parseInt(row.RollNumber, 10) : NaN;
    const feeAmt = row.FeeConcessionAmount ? parseFloat(row.FeeConcessionAmount) : NaN;
    const isRte =
      row.IsRTEQuota.trim().toLowerCase() === "true" || row.IsRTEQuota.trim().toLowerCase() === "yes";

    const student = {
      student_id: studentId,
      full_name: row.FullName.trim(),
      date_of_birth: row.DateOfBirth || null,
      gender: row.Gender || null,
      blood_group: row.BloodGroup || null,
      category: row.Category || null,
      religion: row.Religion || null,
      caste: row.Caste || null,
      present_address_line1: row.Address || null,
      present_city: null,
      present_district: row.District || null,
      present_state: null,
      present_pincode: null,
      present_country: "India",
      birth_place: row.BirthPlace || null,
      last_school: row.LastSchool || null,
      aadhar_no: row.AadharNo || null,
      pen_no: row.PENNo || null,
      apaar_id: row.APAARID || null,
      udise_id: row.UDISEID || null,
      gr_number: row.GRNumber || null,
      whatsapp_no: row.WhatsAppNo || null,
      parent_contact: row.ParentContact || null,
      mother_contact: row.MotherContact || null,
      parent_email: row.ParentEmail || null,
      guardian_name: row.GuardianName || null,
      guardian_contact: row.GuardianContact || null,
      guardian_email: row.GuardianEmail || null,
      emergency_contact_name: row.EmergencyContactName || null,
      emergency_contact_number: row.EmergencyContactNumber || null,
      fee_concession_amount: Number.isFinite(feeAmt) ? feeAmt : null,
      fee_concession_reason: row.FeeConcessionReason || null,
      height: row.Height || null,
      weight: row.Weight || null,
      hobby: row.Hobby || null,
      sign_of_identity: row.SignOfIdentity || null,
      father_education: row.FatherEducation || null,
      father_occupation: row.FatherOccupation || null,
      mother_education: row.MotherEducation || null,
      mother_occupation: row.MotherOccupation || null,
      account_holder_name: row.AccountHolderName || null,
      bank_name: row.BankName || null,
      bank_branch: row.BankBranch || null,
      bank_ifsc: row.BankIFSC || null,
      account_no: row.AccountNo || null,
      guardian_education: row.GuardianEducation || null,
      guardian_occupation: row.GuardianOccupation || null,
      second_language: row.SecondLanguage || null,
      // notes removed
      academic_year: row.AcademicYear || activeYear.name,
      admission_date: row.AdmissionDate || null,
      father_name: row.FatherName || null,
      mother_name: row.MotherName || null,
      parent_name: row.FatherName || row.MotherName || null,
      standard: row.Standard || null,
      division: row.Division || null,
      roll_number: Number.isFinite(rollNum) ? rollNum : null,
      status: "active",
      is_rte_quota: isRte,
    };

    const { data: existing } = await supabase
      .from("students")
      .select("id")
      .eq("gr_number", row.GRNumber)
      .eq("academic_year", student.academic_year)
      .maybeSingle();
    if (existing) {
      errors.push(
        `Student with GR ${row.GRNumber} and academic year ${student.academic_year} already exists (${row.FullName}).`
      );
      skipped++;
      continue;
    }

    const { data: insertedRow, error } = await supabase
      .from("students")
      .insert(student)
      .select("id")
      .single();
    if (error) {
      errors.push(`${row.FullName} (GR ${row.GRNumber}): ${error.message}`);
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
      errors.push(
        `Enrollment failed for ${row.FullName} (GR ${row.GRNumber}): ${enrollError.error.message}`
      );
      skipped++;
      continue;
    }

    inserted++;
  }

  console.log(`Done. Inserted: ${inserted} Skipped: ${skipped}`);
  if (errors.length) {
    console.log("Errors (first 20):");
    for (const e of errors.slice(0, 20)) console.log("  " + e);
    if (errors.length > 20) console.log(` ... and ${errors.length - 20} more.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

