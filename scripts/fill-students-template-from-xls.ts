/**
 * Fill docs/Students_Import_Template.csv using data from Student List 2025-26.xls.
 * This keeps the DB untouched and only prepares a filled template file.
 *
 * Run:
 *   npx tsx scripts/fill-students-template-from-xls.ts [path/to/Student List 2025-26.xls]
 *
 * If no path is given, it uses DEFAULT_XLS_PATH from import-students-from-xls.ts.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { DEFAULT_XLS_PATH, parseSheet } from "./import-students-from-xls";

const repoRoot = process.cwd();
const TEMPLATE_PATH = join(repoRoot, "docs", "Students_Import_Template.csv");

function detectAcademicYearFromFilename(filePath: string): string {
  const name = basename(filePath);
  const m = name.match(/20\d{2}-\d{2}/);
  if (m) return m[0];
  const y = name.match(/20\d{2}/);
  if (y) {
    const start = y[0];
    const end = String((parseInt(start, 10) + 1) % 100).padStart(2, "0");
    return `${start}-${end}`;
  }
  return "2025-26";
}

function esc(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  const xlsPath = process.argv[2] ?? DEFAULT_XLS_PATH;
  if (!existsSync(xlsPath)) {
    console.error("Excel file not found:", xlsPath);
    process.exit(1);
  }

  if (!existsSync(TEMPLATE_PATH)) {
    console.error("Template CSV not found at", TEMPLATE_PATH);
    process.exit(1);
  }

  const templateContent = readFileSync(TEMPLATE_PATH, "utf8");
  const headerLine = templateContent.split(/\r?\n/)[0]?.trim();
  if (!headerLine) {
    console.error("Template CSV has an empty header line.");
    process.exit(1);
  }

  const rows = parseSheet(xlsPath);
  console.log("Parsed", rows.length, "rows from Excel.");

  const academicYear = detectAcademicYearFromFilename(xlsPath);

  const dataLines = rows.map((row) => {
    const AcademicYear = academicYear;
    const Standard = row.grade || "";
    const Division = row.division || "";
    const RollNumber = row.gr || "";
    const GRNumber = row.gr || "";
    const FullName = row.name || "";
    const Gender = row.gender ?? "";
    const DateOfBirth = row.dob ?? "";
    const BloodGroup = "";
    const Category = row.category ?? "";
    const Address = row.address ?? "";
    const District = "";
    const Religion = "";
    const Caste = row.caste ?? "";
    const BirthPlace = "";
    const LastSchool = "";
    const AadharNo = "";
    const PENNo = "";
    const APAARID = "";
    const UDISEID = "";
    const AdmissionType = "regular";
    const AdmissionDate = "";
    const FatherName = "";
    const MotherName = "";
    const ParentContact = row.mobile || "";
    const MotherContact = row.mobile2 || "";
    const ParentEmail = "";
    const GuardianName = "";
    const GuardianContact = "";
    const GuardianEmail = "";
    const EmergencyContactName = "";
    const EmergencyContactNumber = "";
    const WhatsAppNo = row.mobile || row.mobile2 || "";
    const FeeConcessionAmount = "";
    const FeeConcessionReason = "";
    const Height = "";
    const Weight = "";
    const Hobby = "";
    const SignOfIdentity = "";
    const ReferName = "";
    const FatherEducation = "";
    const FatherOccupation = "";
    const MotherEducation = "";
    const MotherOccupation = "";
    const AccountHolderName = "";
    const BankName = "";
    const BankBranch = "";
    const BankIFSC = "";
    const AccountNo = "";
    const GuardianEducation = "";
    const GuardianOccupation = "";
    const SecondLanguage = "";
    const Notes = `Imported from Student List 2025-26.xls (GR ${row.gr})`;
    const IsRTEQuota = "";

    const cols = [
      AcademicYear,
      Standard,
      Division,
      RollNumber,
      GRNumber,
      FullName,
      Gender,
      DateOfBirth,
      BloodGroup,
      Category,
      Address,
      District,
      Religion,
      Caste,
      BirthPlace,
      LastSchool,
      AadharNo,
      PENNo,
      APAARID,
      UDISEID,
      AdmissionType,
      AdmissionDate,
      FatherName,
      MotherName,
      ParentContact,
      MotherContact,
      ParentEmail,
      GuardianName,
      GuardianContact,
      GuardianEmail,
      EmergencyContactName,
      EmergencyContactNumber,
      WhatsAppNo,
      FeeConcessionAmount,
      FeeConcessionReason,
      Height,
      Weight,
      Hobby,
      SignOfIdentity,
      ReferName,
      FatherEducation,
      FatherOccupation,
      MotherEducation,
      MotherOccupation,
      AccountHolderName,
      BankName,
      BankBranch,
      BankIFSC,
      AccountNo,
      GuardianEducation,
      GuardianOccupation,
      SecondLanguage,
      Notes,
      IsRTEQuota,
    ];

    return cols.map(esc).join(",");
  });

  const out = [headerLine, ...dataLines].join("\n");
  writeFileSync(TEMPLATE_PATH, out, "utf8");
  console.log(`Wrote ${rows.length} data rows into ${TEMPLATE_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

