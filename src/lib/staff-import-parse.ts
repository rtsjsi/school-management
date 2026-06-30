import * as XLSX from "xlsx";
import { EMPLOYEE_ROLES, EMPLOYEE_TYPES } from "@/lib/lov";

export type StaffImportRow = {
  rowNumber: number;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  aadhaar: string | null;
  pan: string | null;
  role: (typeof EMPLOYEE_ROLES)[number];
  employee_type: (typeof EMPLOYEE_TYPES)[number];
  joining_date: string | null;
  monthly_salary: number | null;
  degree: string | null;
  institution: string | null;
  year_passed: number | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  account_holder_name: string | null;
};

export type StaffImportParseResult = {
  rows: StaffImportRow[];
  skipped: { rowNumber: number; reason: string }[];
};

const HEADER_ALIASES: Record<string, keyof StaffImportRow | "ignore"> = {
  "full name": "full_name",
  name: "full_name",
  email: "email",
  "phone number": "phone_number",
  phone: "phone_number",
  address: "address",
  aadhaar: "aadhaar",
  pan: "pan",
  role: "role",
  "employee type": "employee_type",
  "joining date": "joining_date",
  "monthly salary": "monthly_salary",
  salary: "monthly_salary",
  degree: "degree",
  institution: "institution",
  "year passed": "year_passed",
  "bank name": "bank_name",
  "account number": "account_number",
  "ifsc code": "ifsc_code",
  "account holder name": "account_holder_name",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (Number.isFinite(value) && Math.abs(value) >= 1e9) return value.toFixed(0);
    return String(value);
  }
  return String(value).trim();
}

function normalizeRole(value: unknown): (typeof EMPLOYEE_ROLES)[number] {
  const raw = cellToString(value).toLowerCase();
  if (!raw) return "staff";
  if (raw.includes("teacher")) return "teacher";
  if (raw.includes("admin")) return "admin";
  if (raw.includes("staff") || raw.includes("clerk")) return "staff";
  if (EMPLOYEE_ROLES.includes(raw as (typeof EMPLOYEE_ROLES)[number])) {
    return raw as (typeof EMPLOYEE_ROLES)[number];
  }
  return "other";
}

function normalizeEmployeeType(value: unknown): (typeof EMPLOYEE_TYPES)[number] {
  const raw = cellToString(value).toLowerCase().replace(/[\s-]+/g, "");
  if (!raw || raw.includes("full")) return "full_time";
  if (raw.includes("part")) return "part_time";
  if (raw.includes("contract")) return "contract";
  if (raw.includes("temp")) return "temporary";
  if (EMPLOYEE_TYPES.includes(raw as (typeof EMPLOYEE_TYPES)[number])) {
    return raw as (typeof EMPLOYEE_TYPES)[number];
  }
  return "full_time";
}

function parseJoiningDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${month}-${day}`;
    }
  }
  const text = cellToString(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/\s]+(\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function parseOptionalNumber(value: unknown): number | null {
  const text = cellToString(value).replace(/,/g, "");
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function mapRawRow(raw: Record<string, unknown>, rowNumber: number): StaffImportRow | { error: string } {
  const mapped: Record<string, unknown> = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    if (!key || key === "ignore") continue;
    mapped[key] = value;
  }

  const fullName = cellToString(mapped.full_name);
  if (!fullName) return { error: "Full name is required." };

  const emailRaw = cellToString(mapped.email);
  const email = emailRaw ? emailRaw.toLowerCase() : null;

  return {
    rowNumber,
    full_name: fullName,
    email,
    phone_number: cellToString(mapped.phone_number) || null,
    address: cellToString(mapped.address) || null,
    aadhaar: cellToString(mapped.aadhaar) || null,
    pan: cellToString(mapped.pan).toUpperCase() || null,
    role: normalizeRole(mapped.role),
    employee_type: normalizeEmployeeType(mapped.employee_type),
    joining_date: parseJoiningDate(mapped.joining_date),
    monthly_salary: parseOptionalNumber(mapped.monthly_salary),
    degree: cellToString(mapped.degree) || null,
    institution: cellToString(mapped.institution) || null,
    year_passed: parseOptionalNumber(mapped.year_passed),
    bank_name: cellToString(mapped.bank_name) || null,
    account_number: cellToString(mapped.account_number) || null,
    ifsc_code: cellToString(mapped.ifsc_code).toUpperCase() || null,
    account_holder_name: cellToString(mapped.account_holder_name) || fullName,
  };
}

export function parseStaffWorkbook(bytes: Uint8Array): StaffImportParseResult {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [], skipped: [{ rowNumber: 0, reason: "Workbook has no sheets." }] };

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: StaffImportRow[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const parsed = mapRawRow(raw, rowNumber);
    if ("error" in parsed) {
      skipped.push({ rowNumber, reason: parsed.error });
      return;
    }
    if (parsed.full_name.toLowerCase() === "john doe") {
      skipped.push({ rowNumber, reason: "Sample row ignored." });
      return;
    }
    rows.push(parsed);
  });

  return { rows, skipped };
}

export function buildEmployeeInsert(row: StaffImportRow, employeeId: string) {
  return {
    employee_id: employeeId,
    full_name: row.full_name,
    email: row.email,
    phone_number: row.phone_number,
    address: row.address,
    aadhaar: row.aadhaar,
    pan: row.pan,
    role: row.role,
    employee_type: row.employee_type,
    joining_date: row.joining_date,
    monthly_salary: row.monthly_salary,
    degree: row.degree,
    institution: row.institution,
    year_passed: row.year_passed,
    bank_name: row.bank_name,
    account_number: row.account_number,
    ifsc_code: row.ifsc_code,
    account_holder_name: row.account_holder_name,
    status: "active" as const,
  };
}
